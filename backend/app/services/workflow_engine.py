"""
Workflow Execution Engine for AgentNexus.

Provides a robust DAG-based workflow execution engine with:
- State machine transitions
- Checkpoint persistence for fault tolerance
- Topological sorting (Kahn's algorithm)
- Retry logic with exponential backoff
- Template variable resolution
- Node-type dispatch (agent, condition, parallel, merge, tool)
- Event broadcasting via event bus

Example:
    engine = WorkflowEngine(db_session, redis_client, event_bus)
    result = await engine.execute(workflow_def, inputs, run_id, thread_id)
"""

from __future__ import annotations

import asyncio
import json
import logging
import re
import time
from collections import deque
from dataclasses import dataclass, field
from enum import Enum
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from app.services.agent_gateway import AgentGateway

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Custom exceptions
# ---------------------------------------------------------------------------


class WorkflowError(Exception):
    """Base exception for workflow execution errors."""

    def __init__(self, message: str, node_id: str | None = None) -> None:
        super().__init__(message)
        self.node_id = node_id


class DAGCycleError(WorkflowError):
    """Raised when a cycle is detected in the workflow DAG."""


class NodeExecutionError(WorkflowError):
    """Raised when a node execution fails after all retry attempts."""

    def __init__(
        self,
        message: str,
        node_id: str | None = None,
        cause: Exception | None = None,
    ) -> None:
        super().__init__(message, node_id)
        self.cause = cause


class TemplateResolutionError(WorkflowError):
    """Raised when a template variable cannot be resolved."""


class AdapterNotFoundError(WorkflowError):
    """Raised when no adapter is available for an agent type."""


class CheckpointError(WorkflowError):
    """Raised when checkpoint save/load operations fail."""


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------


class WorkflowState(str, Enum):
    """Workflow execution states."""

    PENDING = "pending"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class NodeState(str, Enum):
    """Individual node execution states."""

    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"
    RETRYING = "retrying"


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------


@dataclass
class Edge:
    """Represents a directed edge between two nodes in the DAG.

    Attributes:
        source: ID of the source node.
        target: ID of the target node.
        label: Optional edge label (e.g. 'true', 'false' for condition branches).
    """

    source: str
    target: str
    label: str | None = None


@dataclass
class DAG:
    """Internal directed acyclic graph representation of a workflow.

    Attributes:
        nodes: Mapping of node ID to node definition dictionary.
        edges: List of directed edges connecting nodes.
    """

    nodes: dict[str, dict]
    edges: list[Edge]

    def predecessors(self, node_id: str) -> list[str]:
        """Return all predecessor node IDs for the given node."""
        return [e.source for e in self.edges if e.target == node_id]

    def successors(self, node_id: str) -> list[str]:
        """Return all successor node IDs for the given node."""
        return [e.target for e in self.edges if e.source == node_id]

    def outgoing_edges(self, node_id: str) -> list[Edge]:
        """Return all edges originating from the given node."""
        return [e for e in self.edges if e.source == node_id]


@dataclass
class ExecutionContext:
    """Mutable execution context passed through the workflow run.

    Attributes:
        thread_id: Unique identifier for the conversation thread.
        variables: Input variables and intermediate outputs available for templating.
        run_id: Unique identifier for this workflow run.
        node_outputs: Accumulated outputs from executed nodes.
        artifacts: Collected artifacts produced during execution.
        execution_history: Chronological log of node executions.
    """

    thread_id: str
    variables: dict[str, Any]
    run_id: str
    node_outputs: dict[str, Any] = field(default_factory=dict)
    artifacts: list[dict] = field(default_factory=list)
    execution_history: list[dict] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)

    def record(self, node_id: str, state: NodeState, result: Any | None = None) -> None:
        """Record a node execution entry in the history log."""
        self.execution_history.append(
            {
                "node_id": node_id,
                "state": state.value,
                "timestamp": time.time(),
                "result": result,
            }
        )

    def to_snapshot(self) -> dict:
        """Serialize context to a snapshot suitable for checkpointing."""
        return {
            "thread_id": self.thread_id,
            "variables": self.variables,
            "run_id": self.run_id,
            "node_outputs": self.node_outputs,
            "artifacts": self.artifacts,
            "execution_history": self.execution_history,
            "metadata": self.metadata,
        }

    @classmethod
    def from_snapshot(cls, snapshot: dict) -> ExecutionContext:
        """Restore an ExecutionContext from a snapshot dictionary."""
        return cls(
            thread_id=snapshot["thread_id"],
            variables=snapshot.get("variables", {}),
            run_id=snapshot["run_id"],
            node_outputs=snapshot.get("node_outputs", {}),
            artifacts=snapshot.get("artifacts", []),
            execution_history=snapshot.get("execution_history", []),
            metadata=snapshot.get("metadata", {}),
        )


# ---------------------------------------------------------------------------
# Workflow Engine
# ---------------------------------------------------------------------------


class WorkflowEngine:
    """DAG-based workflow execution engine with state machine and checkpoint support.

    The engine parses a workflow definition into a DAG, topologically sorts it,
    and executes each node in dependency order.  Checkpoints are saved before
    every node so that execution can be resumed after a crash.

    Attributes:
        STATES: Valid workflow-level state names.
        AGENT_NODE_TYPES: Node types that are dispatched to agent adapters.
    """

    STATES: list[str] = [
        WorkflowState.PENDING.value,
        WorkflowState.RUNNING.value,
        WorkflowState.PAUSED.value,
        WorkflowState.COMPLETED.value,
        WorkflowState.FAILED.value,
    ]

    # Node types handled by the agent gateway
    AGENT_NODE_TYPES: tuple[str, ...] = (
        "claude",
        "codex",
        "trae",
        "openclaw",
        "hermes",
        "cursor",
    )

    def __init__(
        self,
        db_session: Any,
        redis_client: Any,
        event_bus: Any,
    ) -> None:
        """Initialize the workflow engine.

        Args:
            db_session: Async SQLAlchemy session for persistence.
            redis_client: Async Redis client for caching / locks.
            event_bus: Event bus implementing ``emit(event_type, payload)``.
        """
        self.db = db_session
        self.redis = redis_client
        self.event_bus = event_bus
        self._agent_gateway: AgentGateway | None = None

    # -- gateway wiring ------------------------------------------------------

    def set_agent_gateway(self, gateway: AgentGateway) -> None:
        """Wire the agent gateway so agent nodes can be dispatched."""
        self._agent_gateway = gateway

    # -- public API ----------------------------------------------------------

    async def execute(
        self,
        workflow_def: dict,
        inputs: dict,
        run_id: str,
        thread_id: str,
    ) -> dict:
        """Main execution entry point.

        Parses the workflow definition into a DAG, topologically sorts the
        nodes, and executes them in order while checkpointing before each
        step.

        Args:
            workflow_def: JSON-serializable workflow definition with ``nodes``
                and ``edges`` keys.
            inputs: Initial variable mapping injected into the execution context.
            run_id: Unique identifier for this run.
            thread_id: Conversation thread identifier.

        Returns:
            Dictionary of collected artifacts and final outputs.

        Raises:
            DAGCycleError: If the workflow definition contains a cycle.
            NodeExecutionError: If a node fails after exhausting retries.
        """
        # 1. Parse DAG from workflow definition
        dag = self.parse_dag(workflow_def)
        logger.info("[run:%s] Parsed DAG with %d nodes", run_id, len(dag.nodes))

        # 2. Topological sort to get execution order
        execution_order = self.topological_sort(dag)
        logger.info(
            "[run:%s] Execution order: %s", run_id, " -> ".join(execution_order)
        )

        # 3. Initialize execution context
        context = ExecutionContext(
            thread_id=thread_id,
            variables=dict(inputs),
            run_id=run_id,
        )

        # Emit workflow-started event
        await self.event_bus.emit(
            "workflow.started",
            {"run_id": run_id, "thread_id": thread_id, "state": WorkflowState.RUNNING.value},
        )

        try:
            # 4. Execute nodes in order
            for node_id in execution_order:
                node_def = dag.nodes[node_id]
                node_type = node_def.get("type", "unknown")

                # Save checkpoint before each node
                await self.save_checkpoint(run_id, node_id, context)

                # Emit node-started event
                await self.event_bus.emit(
                    "node.started",
                    {"run_id": run_id, "node_id": node_id, "node_type": node_type},
                )

                # Execute the node
                result = await self.execute_node(node_id, node_def, context)

                # Store result in context
                context.node_outputs[node_id] = result
                context.record(node_id, NodeState.COMPLETED, result)

                # Publish output variables under the node name for downstream access
                if isinstance(result, dict):
                    context.variables.setdefault("outputs", {})[node_id] = result

                # Broadcast completion event
                await self.event_bus.emit(
                    "node.completed",
                    {
                        "run_id": run_id,
                        "node_id": node_id,
                        "node_type": node_type,
                        "result": result,
                    },
                )

            # 5. Collect artifacts and finalize
            final_result = {
                "run_id": run_id,
                "state": WorkflowState.COMPLETED.value,
                "artifacts": context.artifacts,
                "outputs": context.variables.get("outputs", {}),
                "variables": context.variables,
            }

            await self.event_bus.emit(
                "workflow.completed",
                {"run_id": run_id, "thread_id": thread_id, "result": final_result},
            )

            return final_result

        except Exception as exc:
            logger.exception("[run:%s] Workflow failed at node processing", run_id)
            await self.event_bus.emit(
                "workflow.failed",
                {
                    "run_id": run_id,
                    "thread_id": thread_id,
                    "error": str(exc),
                    "error_type": type(exc).__name__,
                },
            )
            raise

    # -- DAG parsing ---------------------------------------------------------

    @staticmethod
    def parse_dag(workflow_def: dict) -> DAG:
        """Parse workflow JSON definition into internal DAG representation.

        Args:
            workflow_def: Dictionary with ``nodes`` (list of node dicts) and
                ``edges`` (list of edge dicts).

        Returns:
            Populated :class:`DAG` instance.
        """
        nodes: dict[str, dict] = {}
        for node in workflow_def.get("nodes", []):
            node_id = node["id"]
            nodes[node_id] = node

        edges: list[Edge] = []
        for edge in workflow_def.get("edges", []):
            edges.append(
                Edge(
                    source=edge["source"],
                    target=edge["target"],
                    label=edge.get("label"),
                )
            )

        return DAG(nodes=nodes, edges=edges)

    # -- topological sort ----------------------------------------------------

    @staticmethod
    def topological_sort(dag: DAG) -> list[str]:
        """Kahn's algorithm for topological sorting.

        Args:
            dag: The workflow DAG to sort.

        Returns:
            List of node IDs in topologically-sorted order.

        Raises:
            DAGCycleError: If the graph contains a cycle.
        """
        in_degree: dict[str, int] = {n: 0 for n in dag.nodes}
        adjacency: dict[str, list[str]] = {n: [] for n in dag.nodes}

        for edge in dag.edges:
            adjacency[edge.source].append(edge.target)
            in_degree[edge.target] += 1

        queue: deque[str] = deque(
            [n for n, degree in in_degree.items() if degree == 0]
        )
        result: list[str] = []

        while queue:
            node = queue.popleft()
            result.append(node)
            for neighbor in adjacency[node]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)

        if len(result) != len(dag.nodes):
            raise DAGCycleError("Cycle detected in workflow DAG")

        return result

    # -- node dispatch -------------------------------------------------------

    async def execute_node(
        self,
        node_id: str,
        node_def: dict,
        context: ExecutionContext,
    ) -> Any:
        """Execute a single node based on its type.

        Args:
            node_id: Unique node identifier.
            node_def: Node definition dictionary (contains ``type``, ``config``, …).
            context: Mutable execution context.

        Returns:
            Arbitrary result object produced by the node handler.
        """
        node_type: str = node_def.get("type", "unknown")
        logger.info(
            "[run:%s] Executing node '%s' (type=%s)",
            context.run_id,
            node_id,
            node_type,
        )

        if node_type in self.AGENT_NODE_TYPES:
            return await self.execute_agent_node(node_id, node_def, context)

        if node_type == "condition":
            return await self.execute_condition_node(node_id, node_def, context)

        if node_type == "parallel":
            return await self.execute_parallel_node(node_id, node_def, context)

        if node_type == "merge":
            return await self.execute_merge_node(node_id, node_def, context)

        if node_type == "start":
            return {"status": "started", "inputs": context.variables}

        if node_type == "end":
            return {"status": "completed", "outputs": context.variables}

        if node_type in ("http", "file", "database"):
            return await self.execute_tool_node(node_id, node_def, context)

        # Unknown node type – graceful degradation
        logger.warning(
            "[run:%s] Unknown node type '%s' for node '%s' – skipping",
            context.run_id,
            node_type,
            node_id,
        )
        return {"status": "skipped", "reason": f"Unknown node type: {node_type}"}

    # -- agent nodes ---------------------------------------------------------

    async def execute_agent_node(
        self,
        node_id: str,
        node_def: dict,
        context: ExecutionContext,
    ) -> dict:
        """Execute an Agent node by calling the agent gateway.

        Resolves template variables in the task description and invokes the
        appropriate agent adapter with retry logic and exponential backoff.

        Args:
            node_id: Node identifier.
            node_def: Node definition containing ``config.agent`` settings.
            context: Execution context for variable resolution.

        Returns:
            Agent execution result dictionary.

        Raises:
            AdapterNotFoundError: If the agent gateway is not wired or adapter
                is missing.
            NodeExecutionError: If all retry attempts are exhausted.
        """
        config: dict = node_def.get("config", {})
        agent_config: dict = config.get("agent", {})

        # Resolve template variables in task description
        task_description = self.resolve_template(
            agent_config.get("taskDescription", ""),
            context.variables,
        )

        agent_type: str = node_def["type"]
        adapter = await self.get_agent_adapter(agent_type)

        max_retries: int = agent_config.get("retryCount", 0)
        timeout_seconds: int = agent_config.get("timeout", 300)

        for attempt in range(max_retries + 1):
            try:
                context.record(node_id, NodeState.RUNNING)

                result = await asyncio.wait_for(
                    adapter.execute(task_description, context.variables),
                    timeout=timeout_seconds,
                )

                logger.info(
                    "[run:%s] Agent node '%s' succeeded on attempt %d",
                    context.run_id,
                    node_id,
                    attempt + 1,
                )
                return result

            except asyncio.TimeoutError:
                logger.warning(
                    "[run:%s] Agent node '%s' timed out (attempt %d/%d)",
                    context.run_id,
                    node_id,
                    attempt + 1,
                    max_retries + 1,
                )
                if attempt < max_retries:
                    backoff = 2 ** attempt
                    logger.info("[run:%s] Retrying in %ds …", context.run_id, backoff)
                    await asyncio.sleep(backoff)
                else:
                    raise NodeExecutionError(
                        f"Agent node '{node_id}' timed out after "
                        f"{max_retries + 1} attempt(s)",
                        node_id=node_id,
                    )

            except Exception as exc:
                logger.exception(
                    "[run:%s] Agent node '%s' failed (attempt %d/%d)",
                    context.run_id,
                    node_id,
                    attempt + 1,
                    max_retries + 1,
                )
                if attempt < max_retries:
                    backoff = 2 ** attempt
                    await asyncio.sleep(backoff)
                else:
                    raise NodeExecutionError(
                        f"Agent node '{node_id}' failed after "
                        f"{max_retries + 1} attempt(s): {exc}",
                        node_id=node_id,
                        cause=exc,
                    )

        # Unreachable – every path above either returns or raises
        return {"status": "failed", "reason": "Unexpected exit from retry loop"}

    # -- condition nodes -----------------------------------------------------

    async def execute_condition_node(
        self,
        node_id: str,
        node_def: dict,
        context: ExecutionContext,
    ) -> dict:
        """Evaluate a condition expression and select the active branch.

        The condition expression is resolved as a template and then evaluated
        as a Python expression against the execution context variables.

        Args:
            node_id: Node identifier.
            node_def: Node definition with ``config.condition`` and
                ``config.trueBranch`` / ``config.falseBranch``.
            context: Execution context.

        Returns:
            Dictionary with ``branch`` key (``'true'`` or ``'false'``) and
            ``condition_result`` boolean.
        """
        config: dict = node_def.get("config", {})
        condition_template: str = config.get("condition", "true")

        # Resolve template variables in condition expression
        resolved_condition = self.resolve_template(condition_template, context.variables)

        # Evaluate condition safely
        try:
            # Allow basic comparison and logical operations
            allowed_names: dict[str, Any] = {"__builtins__": {}}
            allowed_names.update(context.variables)
            condition_result = bool(eval(resolved_condition, allowed_names))
        except Exception as exc:
            logger.warning(
                "[run:%s] Condition evaluation failed for node '%s': %s",
                context.run_id,
                node_id,
                exc,
            )
            condition_result = False

        branch = "true" if condition_result else "false"

        logger.info(
            "[run:%s] Condition node '%s' evaluated to %s (branch=%s)",
            context.run_id,
            node_id,
            condition_result,
            branch,
        )

        return {
            "branch": branch,
            "condition_result": condition_result,
            "resolved_condition": resolved_condition,
        }

    # -- parallel nodes ------------------------------------------------------

    async def execute_parallel_node(
        self,
        node_id: str,
        node_def: dict,
        context: ExecutionContext,
    ) -> dict:
        """Mark downstream branches for parallel execution.

        Identifies all direct successors of the parallel node and returns
        their IDs so that the executor can launch them concurrently.

        Args:
            node_id: Node identifier.
            node_def: Node definition (may contain ``config.branches``).
            context: Execution context.

        Returns:
            Dictionary with ``parallel_branches`` list and node metadata.
        """
        # Reconstruct DAG to find successors
        # In practice the caller uses the DAG edges to determine parallelism
        config: dict = node_def.get("config", {})
        explicit_branches: list[str] = config.get("branches", [])

        logger.info(
            "[run:%s] Parallel node '%s' launching %d branch(es)",
            context.run_id,
            node_id,
            len(explicit_branches),
        )

        return {
            "status": "parallel_started",
            "parallel_branches": explicit_branches,
            "node_id": node_id,
        }

    # -- merge nodes ---------------------------------------------------------

    async def execute_merge_node(
        self,
        node_id: str,
        node_def: dict,
        context: ExecutionContext,
    ) -> dict:
        """Merge results from parallel branches.

        Collects outputs from predecessor nodes and merges them according to
        the configured merge strategy (``concat``, ``object``, ``sum``).

        Args:
            node_id: Node identifier.
            node_def: Node definition with ``config.mergeStrategy``.
            context: Execution context.

        Returns:
            Dictionary with ``merged`` key containing the combined result.
        """
        config: dict = node_def.get("config", {})
        merge_strategy: str = config.get("mergeStrategy", "object")

        # Collect outputs from predecessor nodes
        dag = context.metadata.get("dag")
        if dag:
            predecessor_ids = dag.predecessors(node_id)
        else:
            # Fallback: collect all completed node outputs
            predecessor_ids = list(context.node_outputs.keys())

        branch_results: dict[str, Any] = {}
        for pred_id in predecessor_ids:
            if pred_id in context.node_outputs:
                branch_results[pred_id] = context.node_outputs[pred_id]

        # Apply merge strategy
        merged: Any
        if merge_strategy == "concat":
            # Concatenate list results
            merged = []
            for result in branch_results.values():
                if isinstance(result, list):
                    merged.extend(result)
                else:
                    merged.append(result)
        elif merge_strategy == "sum":
            # Sum numeric results
            merged = sum(
                r for r in branch_results.values() if isinstance(r, (int, float))
            )
        else:
            # Default: object merge – collect all branch outputs
            merged = dict(branch_results)

        logger.info(
            "[run:%s] Merge node '%s' merged %d branch(es) using '%s' strategy",
            context.run_id,
            node_id,
            len(branch_results),
            merge_strategy,
        )

        return {
            "status": "merged",
            "merge_strategy": merge_strategy,
            "merged": merged,
            "branch_results": branch_results,
        }

    # -- tool nodes ----------------------------------------------------------

    async def execute_tool_node(
        self,
        node_id: str,
        node_def: dict,
        context: ExecutionContext,
    ) -> dict:
        """Execute a tool node (HTTP, file, database).

        Performs the requested operation with resolved template parameters.
        In production these delegate to dedicated service clients.

        Args:
            node_id: Node identifier.
            node_def: Node definition with tool ``type`` and ``config``.
            context: Execution context.

        Returns:
            Tool execution result dictionary.
        """
        node_type: str = node_def["type"]
        config: dict = node_def.get("config", {})

        if node_type == "http":
            return await self._execute_http_tool(node_id, config, context)
        if node_type == "file":
            return await self._execute_file_tool(node_id, config, context)
        if node_type == "database":
            return await self._execute_database_tool(node_id, config, context)

        return {"status": "skipped", "reason": f"Unsupported tool type: {node_type}"}

    async def _execute_http_tool(
        self,
        node_id: str,
        config: dict,
        context: ExecutionContext,
    ) -> dict:
        """Execute an HTTP request tool node.

        Resolves template variables in URL, headers, and body, then performs
        the HTTP request.
        """
        import httpx

        method: str = config.get("method", "GET").upper()
        url: str = self.resolve_template(config.get("url", ""), context.variables)
        headers: dict[str, str] = {
            k: self.resolve_template(v, context.variables)
            for k, v in config.get("headers", {}).items()
        }
        body: str | None = None
        if "body" in config:
            resolved_body = self.resolve_template(config["body"], context.variables)
            body = resolved_body

        timeout_seconds: int = config.get("timeout", 30)

        try:
            async with httpx.AsyncClient(timeout=timeout_seconds) as client:
                response = await client.request(
                    method=method,
                    url=url,
                    headers=headers,
                    content=body,
                )
                return {
                    "status": "success",
                    "status_code": response.status_code,
                    "headers": dict(response.headers),
                    "body": response.text,
                    "url": url,
                    "method": method,
                }
        except Exception as exc:
            logger.exception(
                "[run:%s] HTTP tool node '%s' failed", context.run_id, node_id
            )
            return {
                "status": "error",
                "error": str(exc),
                "error_type": type(exc).__name__,
                "url": url,
                "method": method,
            }

    async def _execute_file_tool(
        self,
        node_id: str,
        config: dict,
        context: ExecutionContext,
    ) -> dict:
        """Execute a file operation tool node.

        Supports ``read``, ``write``, ``append``, and ``delete`` operations.
        """
        import aiofiles

        operation: str = config.get("operation", "read")
        file_path: str = self.resolve_template(
            config.get("path", ""), context.variables
        )
        encoding: str = config.get("encoding", "utf-8")

        try:
            if operation == "read":
                async with aiofiles.open(file_path, "r", encoding=encoding) as f:
                    content = await f.read()
                return {
                    "status": "success",
                    "operation": operation,
                    "path": file_path,
                    "content": content,
                    "size": len(content),
                }

            if operation in ("write", "append"):
                content: str = self.resolve_template(
                    config.get("content", ""), context.variables
                )
                mode = "w" if operation == "write" else "a"
                async with aiofiles.open(file_path, mode, encoding=encoding) as f:
                    await f.write(content)
                return {
                    "status": "success",
                    "operation": operation,
                    "path": file_path,
                    "bytes_written": len(content.encode(encoding)),
                }

            if operation == "delete":
                import os

                os.remove(file_path)
                return {
                    "status": "success",
                    "operation": operation,
                    "path": file_path,
                }

            return {
                "status": "error",
                "reason": f"Unsupported file operation: {operation}",
            }

        except Exception as exc:
            logger.exception(
                "[run:%s] File tool node '%s' failed", context.run_id, node_id
            )
            return {
                "status": "error",
                "error": str(exc),
                "error_type": type(exc).__name__,
                "operation": operation,
                "path": file_path,
            }

    async def _execute_database_tool(
        self,
        node_id: str,
        config: dict,
        context: ExecutionContext,
    ) -> dict:
        """Execute a database query tool node.

        Executes the provided SQL query using the bound database session.
        """
        operation: str = config.get("operation", "query")
        query: str = self.resolve_template(config.get("query", ""), context.variables)
        parameters: dict[str, Any] = {
            k: self._resolve_param(v, context.variables)
            for k, v in config.get("parameters", {}).items()
        }

        try:
            from sqlalchemy import text

            if operation == "query":
                result = await self.db.execute(text(query), parameters)
                rows = [dict(row._mapping) for row in result.mappings().all()]
                return {
                    "status": "success",
                    "operation": operation,
                    "rows": rows,
                    "row_count": len(rows),
                }

            if operation in ("insert", "update", "delete"):
                result = await self.db.execute(text(query), parameters)
                await self.db.commit()
                return {
                    "status": "success",
                    "operation": operation,
                    "rows_affected": result.rowcount,
                }

            return {
                "status": "error",
                "reason": f"Unsupported DB operation: {operation}",
            }

        except Exception as exc:
            logger.exception(
                "[run:%s] Database tool node '%s' failed", context.run_id, node_id
            )
            return {
                "status": "error",
                "error": str(exc),
                "error_type": type(exc).__name__,
                "operation": operation,
                "query": query,
            }

    # -- template resolution -------------------------------------------------

    @staticmethod
    def resolve_template(template: str, variables: dict) -> str:
        """Resolve ``{{variable.path}}`` templates in a string.

        Supports nested path access (e.g. ``{{user.name}}``) and falls back
        to leaving the placeholder unchanged if the path cannot be resolved.

        Args:
            template: String potentially containing template placeholders.
            variables: Variable dictionary to resolve against.

        Returns:
            String with all resolvable placeholders substituted.
        """

        def _replacer(match: re.Match) -> str:  # type: ignore[type-arg]
            path = match.group(1).strip()
            keys = path.split(".")
            value: Any = variables
            for key in keys:
                if isinstance(value, dict):
                    value = value.get(key, {})
                else:
                    value = {}
            return str(value) if value != {} else match.group(0)

        return re.sub(r"\{\{(.*?)\}\}", _replacer, template)

    # -- checkpoints ---------------------------------------------------------

    async def save_checkpoint(
        self,
        run_id: str,
        node_id: str,
        context: ExecutionContext,
    ) -> None:
        """Persist execution state to the database for fault recovery.

        Saves a JSON snapshot of the execution context keyed by ``run_id``
        and current ``node_id``.

        Args:
            run_id: Workflow run identifier.
            node_id: Node about to be executed.
            context: Current execution context.

        Raises:
            CheckpointError: If the database write fails.
        """
        try:
            checkpoint_data = {
                "run_id": run_id,
                "node_id": node_id,
                "timestamp": time.time(),
                "context_snapshot": context.to_snapshot(),
            }

            # Persist via Redis for fast recovery
            await self.redis.hset(
                f"checkpoint:{run_id}",
                node_id,
                json.dumps(checkpoint_data),
            )

            # Persist via database for durable storage
            from sqlalchemy import text

            await self.db.execute(
                text(
                    """
                    INSERT INTO workflow_checkpoints (
                        run_id, node_id, checkpoint_data, created_at
                    ) VALUES (
                        :run_id, :node_id, :checkpoint_data, NOW()
                    )
                    ON CONFLICT (run_id, node_id) DO UPDATE SET
                        checkpoint_data = EXCLUDED.checkpoint_data,
                        created_at = EXCLUDED.created_at
                    """
                ),
                {
                    "run_id": run_id,
                    "node_id": node_id,
                    "checkpoint_data": json.dumps(checkpoint_data),
                },
            )
            await self.db.commit()

            logger.debug(
                "[run:%s] Checkpoint saved before node '%s'", run_id, node_id
            )

        except Exception as exc:
            logger.exception("[run:%s] Failed to save checkpoint", run_id)
            raise CheckpointError(
                f"Checkpoint save failed for run '{run_id}', node '{node_id}': {exc}"
            )

    async def load_checkpoint(self, run_id: str, node_id: str) -> dict:
        """Load a previously saved checkpoint.

        Tries Redis first (fast), falls back to database (durable).

        Args:
            run_id: Workflow run identifier.
            node_id: Node identifier for the checkpoint.

        Returns:
            Checkpoint data dictionary.

        Raises:
            CheckpointError: If loading fails.
        """
        try:
            # Try Redis first
            data = await self.redis.hget(f"checkpoint:{run_id}", node_id)
            if data:
                return json.loads(data)

            # Fall back to database
            from sqlalchemy import text

            result = await self.db.execute(
                text(
                    """
                    SELECT checkpoint_data FROM workflow_checkpoints
                    WHERE run_id = :run_id AND node_id = :node_id
                    ORDER BY created_at DESC LIMIT 1
                    """
                ),
                {"run_id": run_id, "node_id": node_id},
            )
            row = result.fetchone()
            if row:
                return json.loads(row.checkpoint_data)

            return {}

        except Exception as exc:
            raise CheckpointError(
                f"Failed to load checkpoint for run '{run_id}', node '{node_id}': {exc}"
            )

    # -- agent adapters ------------------------------------------------------

    async def get_agent_adapter(self, agent_type: str) -> Any:
        """Return the adapter for the given agent type.

        The engine must have been wired with an :class:`AgentGateway` via
        :meth:`set_agent_gateway` before executing agent nodes.

        Args:
            agent_type: Agent type identifier (e.g. ``'claude'``, ``'codex'``).

        Returns:
            Adapter object implementing ``execute(task, variables)``.

        Raises:
            AdapterNotFoundError: If no gateway is wired or adapter is unknown.
        """
        if self._agent_gateway is None:
            raise AdapterNotFoundError(
                "AgentGateway not wired into WorkflowEngine. "
                "Call set_agent_gateway() before executing workflows with agent nodes."
            )

        adapter = self._agent_gateway.adapters.get(agent_type)
        if adapter is None:
            raise AdapterNotFoundError(
                f"No adapter registered for agent type: {agent_type}"
            )
        return adapter

    # -- utilities -----------------------------------------------------------

    @staticmethod
    def _resolve_param(value: Any, variables: dict) -> Any:
        """Resolve a single parameter value, applying template substitution if string."""
        if isinstance(value, str):
            resolved = WorkflowEngine.resolve_template(value, variables)
            return resolved if resolved != value else value
        return value
