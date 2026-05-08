"""
Execution context management for workflow runs.

Provides the ExecutionContext dataclass that maintains state across
workflow execution, including variables, artifacts, and history.
"""
from __future__ import annotations

import copy
from dataclasses import dataclass, field
from typing import Any

from app.utils.helpers import generate_uuid, now_iso


@dataclass
class ExecutionContext:
    """Maintains execution state across a workflow run.

    Tracks variables, node outputs, artifacts, and execution history
    to enable checkpointing, branching, and resumable workflows.

    Attributes:
        thread_id: Parent conversation/thread identifier.
        variables: Input variables available to all nodes.
        run_id: Unique identifier for this execution run.
        node_outputs: Mapping of node_id -> output for each executed node.
        artifacts: Collected artifacts (files, logs, etc.).
        execution_history: Ordered list of executed node records.
    """

    thread_id: str
    variables: dict[str, Any]
    run_id: str = field(default_factory=generate_uuid)
    node_outputs: dict[str, Any] = field(default_factory=dict)
    artifacts: list[dict] = field(default_factory=list)
    execution_history: list[dict] = field(default_factory=list)

    def get_variable(self, path: str) -> Any:
        """Get a variable by dot-path notation.

        Supports nested access like 'inputs.code', 'config.timeout'.

        Args:
            path: Dot-separated path to the variable.

        Returns:
            The variable value, or None if not found.

        Example:
            >>> ctx.get_variable('inputs.user_id')
            'abc-123'
        """
        if not path:
            return None

        parts = path.split(".")
        current: Any = self.variables

        for part in parts:
            if isinstance(current, dict) and part in current:
                current = current[part]
            else:
                return None
        return current

    def set_variable(self, path: str, value: Any) -> None:
        """Set a variable by dot-path notation.

        Creates intermediate dictionaries as needed.

        Args:
            path: Dot-separated path to set.
            value: Value to assign.

        Example:
            >>> ctx.set_variable('outputs.result', {'status': 'ok'})
        """
        if not path:
            return

        parts = path.split(".")
        current = self.variables

        for part in parts[:-1]:
            if part not in current or not isinstance(current[part], dict):
                current[part] = {}
            current = current[part]

        current[parts[-1]] = value

    def add_artifact(self, name: str, content: str, mime_type: str) -> dict:
        """Add an artifact to the execution context.

        Artifacts represent files, logs, reports, or other outputs
        produced during workflow execution.

        Args:
            name: Human-readable artifact name.
            content: Artifact content (text or base64-encoded binary).
            mime_type: MIME type of the artifact (e.g., 'text/plain').

        Returns:
            The created artifact record.
        """
        artifact = {
            "id": generate_uuid(),
            "name": name,
            "content": content,
            "mime_type": mime_type,
            "created_at": now_iso(),
        }
        self.artifacts.append(artifact)
        return artifact

    def record_execution(self, node_id: str, node_type: str, status: str, output: Any = None) -> dict:
        """Record a node execution in the history.

        Args:
            node_id: Unique node identifier.
            node_type: Type of node (e.g., 'agent', 'condition').
            status: Execution status ('success', 'failed', 'skipped').
            output: Node output value.

        Returns:
            The created history record.
        """
        record = {
            "node_id": node_id,
            "node_type": node_type,
            "status": status,
            "timestamp": now_iso(),
            "output": output,
        }
        self.execution_history.append(record)
        return record

    def record(self, node_id: str, state: Any, output: Any = None) -> dict:
        """Alias for record_execution used by WorkflowEngine.

        Args:
            node_id: Unique node identifier.
            state: Node state (NodeState enum value).
            output: Optional node output value.

        Returns:
            The created history record.
        """
        status_str = str(state).split('.')[-1].lower() if hasattr(state, 'name') else str(state).lower()
        return self.record_execution(node_id, "agent", status_str, output)

    def set_node_output(self, node_id: str, output: Any) -> None:
        """Store the output of a completed node.

        Args:
            node_id: Node identifier.
            output: Node output value (any JSON-serializable type).
        """
        self.node_outputs[node_id] = output

    def get_node_output(self, node_id: str) -> Any:
        """Retrieve the output of a previously executed node.

        Args:
            node_id: Node identifier.

        Returns:
            The node's output, or None if not found.
        """
        return self.node_outputs.get(node_id)

    def to_dict(self) -> dict[str, Any]:
        """Serialize the execution context for checkpointing.

        Returns:
            Dictionary representation suitable for JSON serialization.
        """
        return {
            "thread_id": self.thread_id,
            "run_id": self.run_id,
            "variables": copy.deepcopy(self.variables),
            "node_outputs": copy.deepcopy(self.node_outputs),
            "artifacts": copy.deepcopy(self.artifacts),
            "execution_history": copy.deepcopy(self.execution_history),
            "checkpointed_at": now_iso(),
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> ExecutionContext:
        """Deserialize an execution context from a checkpoint.

        Args:
            data: Dictionary previously produced by to_dict().

        Returns:
            Reconstructed ExecutionContext instance.
        """
        ctx = cls(
            thread_id=data.get("thread_id", ""),
            variables=copy.deepcopy(data.get("variables", {})),
            run_id=data.get("run_id", generate_uuid()),
        )
        ctx.node_outputs = copy.deepcopy(data.get("node_outputs", {}))
        ctx.artifacts = copy.deepcopy(data.get("artifacts", []))
        ctx.execution_history = copy.deepcopy(data.get("execution_history", []))
        return ctx

    def snapshot(self) -> dict[str, Any]:
        """Create a lightweight snapshot for progress reporting.

        Returns:
            Summary dict with run state and progress.
        """
        total = len(self.execution_history)
        successful = sum(1 for r in self.execution_history if r.get("status") == "success")
        return {
            "run_id": self.run_id,
            "thread_id": self.thread_id,
            "nodes_executed": total,
            "nodes_successful": successful,
            "artifact_count": len(self.artifacts),
            "variables": list(self.variables.keys()),
            "is_complete": all(r.get("status") in ("success", "skipped") for r in self.execution_history),
        }
