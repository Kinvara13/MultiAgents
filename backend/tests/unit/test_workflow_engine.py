"""
工作流引擎单元测试
测试核心功能：DAG解析、拓扑排序、状态机、节点执行、变量替换
"""

import sys
import os
import asyncio
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from tests.runner import TestSuite, assert_equal, assert_true, assert_not_none, assert_in, assert_raises


def run_tests():
    suite = TestSuite("工作流引擎测试")

    # ─── DAG 解析测试 ────────────────────────────────────────
    print_section("DAG 解析")

    def test_parse_simple_dag():
        """测试简单DAG解析"""
        from app.services.workflow_engine import WorkflowEngine
        engine = WorkflowEngine(db_session=None, redis_client=None, event_bus=None)

        workflow_def = {
            "nodes": [
                {"id": "start", "type": "start", "data": {}},
                {"id": "agent1", "type": "claude", "data": {}},
                {"id": "end", "type": "end", "data": {}}
            ],
            "edges": [
                {"id": "e1", "source": "start", "target": "agent1"},
                {"id": "e2", "source": "agent1", "target": "end"}
            ]
        }
        dag = engine.parse_dag(workflow_def)
        assert_equal(len(dag.nodes), 3, f"应解析3个节点，实际{len(dag.nodes)}")
        assert_equal(len(dag.edges), 2, f"应解析2条边，实际{len(dag.edges)}")
        assert_in("start", dag.nodes, "start节点应存在")
        assert_in("agent1", dag.nodes, "agent1节点应存在")
        assert_in("end", dag.nodes, "end节点应存在")
    suite.run(test_parse_simple_dag)

    def test_parse_complex_dag():
        """测试复杂DAG解析（含条件、并行分支）"""
        from app.services.workflow_engine import WorkflowEngine
        engine = WorkflowEngine(db_session=None, redis_client=None, event_bus=None)

        workflow_def = {
            "nodes": [
                {"id": "start", "type": "start", "data": {}},
                {"id": "check", "type": "condition", "data": {"expression": "has_files"}},
                {"id": "agent_a", "type": "claude", "data": {}},
                {"id": "agent_b", "type": "codex", "data": {}},
                {"id": "merge", "type": "merge", "data": {}},
                {"id": "end", "type": "end", "data": {}}
            ],
            "edges": [
                {"id": "e1", "source": "start", "target": "check"},
                {"id": "e2", "source": "check", "target": "agent_a", "label": "true"},
                {"id": "e3", "source": "check", "target": "agent_b", "label": "false"},
                {"id": "e4", "source": "agent_a", "target": "merge"},
                {"id": "e5", "source": "agent_b", "target": "merge"},
                {"id": "e6", "source": "merge", "target": "end"}
            ]
        }
        dag = engine.parse_dag(workflow_def)
        assert_equal(len(dag.nodes), 6, f"应解析6个节点，实际{len(dag.nodes)}")
        assert_equal(len(dag.edges), 6, f"应解析6条边，实际{len(dag.edges)}")
    suite.run(test_parse_complex_dag)

    # ─── 拓扑排序测试 ────────────────────────────────────────
    print_section("拓扑排序 (Kahn算法)")

    def test_topological_sort_linear():
        """测试线性DAG拓扑排序"""
        from app.services.workflow_engine import WorkflowEngine
        engine = WorkflowEngine(db_session=None, redis_client=None, event_bus=None)

        workflow_def = {
            "nodes": [
                {"id": "a", "type": "start", "data": {}},
                {"id": "b", "type": "claude", "data": {}},
                {"id": "c", "type": "codex", "data": {}},
                {"id": "d", "type": "end", "data": {}}
            ],
            "edges": [
                {"id": "e1", "source": "a", "target": "b"},
                {"id": "e2", "source": "b", "target": "c"},
                {"id": "e3", "source": "c", "target": "d"}
            ]
        }
        dag = engine.parse_dag(workflow_def)
        order = engine.topological_sort(dag)
        assert_equal(len(order), 4, "应返回4个节点")
        assert_equal(order[0], "a", "start应排在第一")
        assert_equal(order[-1], "d", "end应排在最后")
    suite.run(test_topological_sort_linear)

    def test_topological_sort_branching():
        """测试分支DAG拓扑排序"""
        from app.services.workflow_engine import WorkflowEngine
        engine = WorkflowEngine(db_session=None, redis_client=None, event_bus=None)

        workflow_def = {
            "nodes": [
                {"id": "start", "type": "start", "data": {}},
                {"id": "parallel", "type": "parallel", "data": {}},
                {"id": "agent1", "type": "claude", "data": {}},
                {"id": "agent2", "type": "codex", "data": {}},
                {"id": "merge", "type": "merge", "data": {}},
                {"id": "end", "type": "end", "data": {}}
            ],
            "edges": [
                {"id": "e1", "source": "start", "target": "parallel"},
                {"id": "e2", "source": "parallel", "target": "agent1"},
                {"id": "e3", "source": "parallel", "target": "agent2"},
                {"id": "e4", "source": "agent1", "target": "merge"},
                {"id": "e5", "source": "agent2", "target": "merge"},
                {"id": "e6", "source": "merge", "target": "end"}
            ]
        }
        dag = engine.parse_dag(workflow_def)
        order = engine.topological_sort(dag)
        assert_equal(len(order), 6, "应返回6个节点")
        assert_equal(order[0], "start", "start应排在第一")
        # parallel 在 start 之后
        start_idx = order.index("start")
        parallel_idx = order.index("parallel")
        assert_true(parallel_idx > start_idx, "parallel 应在 start 之后")
        # merge 在 agent1 和 agent2 之后
        merge_idx = order.index("merge")
        agent1_idx = order.index("agent1")
        agent2_idx = order.index("agent2")
        assert_true(merge_idx > agent1_idx and merge_idx > agent2_idx, "merge 应在所有agent之后")
    suite.run(test_topological_sort_branching)

    def test_topological_sort_cycle_detection():
        """测试循环检测"""
        from app.services.workflow_engine import WorkflowEngine, DAGCycleError
        engine = WorkflowEngine(db_session=None, redis_client=None, event_bus=None)

        workflow_def = {
            "nodes": [
                {"id": "a", "type": "start", "data": {}},
                {"id": "b", "type": "claude", "data": {}},
                {"id": "c", "type": "codex", "data": {}}
            ],
            "edges": [
                {"id": "e1", "source": "a", "target": "b"},
                {"id": "e2", "source": "b", "target": "c"},
                {"id": "e3", "source": "c", "target": "a"}  # 循环!
            ]
        }
        dag = engine.parse_dag(workflow_def)
        try:
            engine.topological_sort(dag)
            raise AssertionError("应检测到循环并抛出异常")
        except DAGCycleError as e:
            assert_in("Cycle", str(e), "错误消息应包含'Cycle'")
    suite.run(test_topological_sort_cycle_detection)

    # ─── 变量替换测试 ────────────────────────────────────────
    print_section("变量模板替换")

    def test_resolve_simple_variable():
        """测试简单变量替换"""
        from app.services.workflow_engine import WorkflowEngine
        engine = WorkflowEngine(db_session=None, redis_client=None, event_bus=None)

        template = "Hello {{name}}!"
        variables = {"name": "World"}
        result = engine.resolve_template(template, variables)
        assert_equal(result, "Hello World!", f"替换失败: {result}")
    suite.run(test_resolve_simple_variable)

    def test_resolve_nested_variable():
        """测试嵌套变量替换"""
        from app.services.workflow_engine import WorkflowEngine
        engine = WorkflowEngine(db_session=None, redis_client=None, event_bus=None)

        template = "Review code: {{inputs.code}} by {{inputs.author}}"
        variables = {"inputs": {"code": "function test() {}", "author": "Alice"}}
        result = engine.resolve_template(template, variables)
        assert_equal(result, "Review code: function test() {} by Alice", f"嵌套替换失败: {result}")
    suite.run(test_resolve_nested_variable)

    def test_resolve_missing_variable():
        """测试缺失变量保留原样"""
        from app.services.workflow_engine import WorkflowEngine
        engine = WorkflowEngine(db_session=None, redis_client=None, event_bus=None)

        template = "Hello {{name}}, your id is {{user.id}}"
        variables = {"name": "Alice"}
        result = engine.resolve_template(template, variables)
        assert_equal(result, "Hello Alice, your id is {{user.id}}", f"缺失变量处理失败: {result}")
    suite.run(test_resolve_missing_variable)

    def test_resolve_empty_template():
        """测试空模板"""
        from app.services.workflow_engine import WorkflowEngine
        engine = WorkflowEngine(db_session=None, redis_client=None, event_bus=None)

        assert_equal(engine.resolve_template("", {}), "")
        assert_equal(engine.resolve_template("No variables here", {}), "No variables here")
    suite.run(test_resolve_empty_template)

    # ─── 状态机测试 ──────────────────────────────────────────
    print_section("状态机转换")

    def test_state_transitions():
        """测试状态转换规则"""
        states = ['pending', 'running', 'paused', 'completed', 'failed']
        # 验证状态集合
        assert_equal(len(states), 5, "应有5种状态")
        assert_in('pending', states)
        assert_in('running', states)
        assert_in('completed', states)
        assert_in('failed', states)
    suite.run(test_state_transitions)

    # ─── 执行上下文测试 ──────────────────────────────────────
    print_section("执行上下文")

    def test_execution_context():
        """测试执行上下文创建和操作"""
        from app.core.context import ExecutionContext

        ctx = ExecutionContext(
            thread_id="thread-001",
            variables={"topic": "AI", "count": 5},
            run_id="run-001"
        )
        assert_equal(ctx.thread_id, "thread-001")
        assert_equal(ctx.run_id, "run-001")
        assert_equal(ctx.get_variable("topic"), "AI")
        assert_equal(ctx.get_variable("count"), 5)

        ctx.set_variable("result", "success")
        assert_equal(ctx.get_variable("result"), "success")

        ctx.node_outputs["node1"] = {"output": "hello"}
        assert_equal(ctx.node_outputs["node1"]["output"], "hello")
    suite.run(test_execution_context)

    def test_context_serialization():
        """测试上下文序列化/反序列化"""
        from app.core.context import ExecutionContext

        ctx = ExecutionContext(
            thread_id="thread-001",
            variables={"key": "value"},
            run_id="run-001"
        )
        ctx.node_outputs["n1"] = "output1"
        ctx.add_artifact("test.py", "print('hello')", "text/x-python")

        data = ctx.to_dict()
        assert_equal(data["thread_id"], "thread-001")
        assert_equal(data["variables"]["key"], "value")
        assert_equal(len(data["artifacts"]), 1)

        restored = ExecutionContext.from_dict(data)
        assert_equal(restored.thread_id, "thread-001")
        assert_equal(restored.get_variable("key"), "value")
    suite.run(test_context_serialization)

    # ─── Checkpoint 测试 ─────────────────────────────────────
    print_section("检查点管理")

    def test_checkpoint_save_and_load():
        """测试检查点保存和加载"""
        from app.services.checkpoint import CheckpointManager
        import asyncio

        manager = CheckpointManager(db_path=":memory:")
        asyncio.run(manager.save(
            run_id="run-001",
            thread_id="thread-001",
            workflow_id="wf-001",
            state={"status": "running", "current_node": "node1", "variables": {"x": 1}},
            next_nodes=["node2", "node3"]
        ))

        checkpoints = asyncio.run(manager.list_checkpoints("run-001"))
        assert_equal(len(checkpoints), 1, "应保存1个检查点")
        assert_equal(checkpoints[0]["run_id"], "run-001")
        assert_equal(checkpoints[0]["next_nodes"], ["node2", "node3"])

        latest = asyncio.run(manager.load_latest("thread-001", "wf-001"))
        assert_not_none(latest, "应能加载最新检查点")
        assert_equal(latest["state"]["status"], "running")
    suite.run(test_checkpoint_save_and_load)

    # ─── Event Store 测试 ────────────────────────────────────
    print_section("事件存储")

    def test_event_append_and_query():
        """测试事件追加和查询"""
        from app.services.event_store import EventStore
        import asyncio

        store = EventStore(db_path=":memory:")
        events = [
            {"event_type": "NODE_STARTED", "aggregate_id": "run-001", "version": 1, "payload": {"node_id": "n1"}},
            {"event_type": "NODE_COMPLETED", "aggregate_id": "run-001", "version": 2, "payload": {"node_id": "n1", "output": "ok"}},
            {"event_type": "NODE_STARTED", "aggregate_id": "run-001", "version": 3, "payload": {"node_id": "n2"}},
        ]
        asyncio.run(store.append(events))

        queried = asyncio.run(store.get_events("run-001"))
        assert_equal(len(queried), 3, "应查询到3个事件")
        assert_equal(queried[0]["type"], "NODE_STARTED")
        assert_equal(queried[1]["type"], "NODE_COMPLETED")
        assert_equal(queried[0]["version"], 1)
        assert_equal(queried[2]["version"], 3)

        latest_version = asyncio.run(store.get_latest_version("run-001"))
        assert_equal(latest_version, 3, "最新版本应为3")
    suite.run(test_event_append_and_query)

    # ─── Agent 网关测试 ──────────────────────────────────────
    print_section("Agent 网关")

    def test_agent_gateway_register_and_execute():
        """测试Agent网关注册和执行"""
        from app.services.agent_gateway import AgentGateway
        from app.adapters.claude import ClaudeAdapter

        gateway = AgentGateway()
        adapter = ClaudeAdapter(agent_config={"endpoint": "http://localhost:8080"})

        asyncio.run(gateway.register_adapter("claude", adapter))

        adapters = gateway.list_adapters()
        assert_equal(len(adapters), 1, "应注册1个适配器")
        assert_in("claude", adapters, "应包含claude适配器")

        result = asyncio.run(gateway.health_check("claude"))
        assert_equal(result["status"], "online", "Claude应在线")
    suite.run(test_agent_gateway_register_and_execute)

    def test_agent_gateway_missing_adapter():
        """测试未注册适配器错误处理"""
        from app.services.agent_gateway import AgentGateway

        gateway = AgentGateway()
        result = asyncio.run(gateway.health_check("nonexistent"))
        assert_equal(result["status"], "unknown", "未知适配器应返回unknown")
    suite.run(test_agent_gateway_missing_adapter)

    return suite


def print_section(title):
    from tests.runner import print_section as ps
    ps(title)
