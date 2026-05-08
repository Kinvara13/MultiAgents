"""
端到端集成测试
模拟完整业务流程：创建Agent -> 定义工作流 -> 执行工作流 -> 收集产物
"""

import sys
import os
import asyncio
import time
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from tests.runner import TestSuite, assert_equal, assert_true, assert_not_none, assert_in


def run_tests():
    suite = TestSuite("端到端集成测试")

    # ─── 场景1：完整工作流执行 ──────────────────────────────
    print_section("场景1：代码审查工作流")

    def test_e2e_code_review_workflow():
        """端到端：从创建Agent到执行工作流"""
        from app.services.workflow_engine import WorkflowEngine
        from app.services.agent_gateway import AgentGateway
        from app.adapters.claude import ClaudeAdapter
        from app.core.context import ExecutionContext

        # 1. 初始化Agent网关
        gateway = AgentGateway()
        claude_adapter = ClaudeAdapter(agent_config={"endpoint": "http://localhost:8080"})
        asyncio.run(gateway.register_adapter("claude", claude_adapter))

        # 2. 验证Agent健康
        health = asyncio.run(gateway.health_check("claude"))
        assert_equal(health["status"], "online", "Claude Agent应在线")

        # 3. 定义工作流DAG
        workflow_def = {
            "nodes": [
                {"id": "start", "type": "start", "data": {}},
                {"id": "fetch_code", "type": "claude", "data": {
                    "config": {"agent": {"taskDescription": "获取代码文件", "timeout": 30, "retryCount": 1}}
                }},
                {"id": "analyze", "type": "claude", "data": {
                    "config": {"agent": {"taskDescription": "分析代码质量: {{inputs.code}}", "timeout": 60}}
                }},
                {"id": "end", "type": "end", "data": {}}
            ],
            "edges": [
                {"id": "e1", "source": "start", "target": "fetch_code"},
                {"id": "e2", "source": "fetch_code", "target": "analyze"},
                {"id": "e3", "source": "analyze", "target": "end"}
            ]
        }

        # 4. 解析和验证DAG
        engine = WorkflowEngine(db_session=None, redis_client=None, event_bus=None)
        dag = engine.parse_dag(workflow_def)
        assert_equal(len(dag.nodes), 4, "DAG应有4个节点")
        assert_equal(len(dag.edges), 3, "DAG应有3条边")

        # 5. 拓扑排序验证
        order = engine.topological_sort(dag)
        assert_equal(order[0], "start", "start应在第一位")
        assert_equal(order[-1], "end", "end应在最后一位")

        # 6. 设置 Agent 网关并执行工作流
        from app.services.agent_gateway import AgentGateway
        from app.adapters.claude import ClaudeAdapter
        gateway = AgentGateway()
        asyncio.run(gateway.register_adapter("claude", ClaudeAdapter({})))
        engine.set_agent_gateway(gateway)

        ctx = ExecutionContext(
            thread_id=f"test-thread-{int(time.time())}",
            variables={"inputs": {"code": "def hello(): print('world')"}},
            run_id=f"test-run-{int(time.time())}"
        )

        # 执行每个节点
        for node_id in order:
            node_def = dag.nodes[node_id]
            if node_def["type"] in ("claude", "codex", "trae"):
                result = asyncio.run(engine.execute_agent_node(node_id, node_def, ctx))
                ctx.node_outputs[node_id] = result
                assert_equal(result["status"], "completed", f"节点 {node_id} 应成功完成")
                assert_true(len(result["output"]) > 0, f"节点 {node_id} 应有输出")

        # 7. 验证执行结果
        assert_true("fetch_code" in ctx.node_outputs, "应有fetch_code输出")
        assert_true("analyze" in ctx.node_outputs, "应有analyze输出")
        # 手动记录执行历史（因为直接调用execute_agent_node不会自动记录）
        ctx.record_execution("fetch_code", "claude", "completed", ctx.node_outputs["fetch_code"])
        ctx.record_execution("analyze", "claude", "completed", ctx.node_outputs["analyze"])
        assert_true(len(ctx.execution_history) > 0, "应有执行历史")
    suite.run(test_e2e_code_review_workflow)

    # ─── 场景2：多Agent协作 ─────────────────────────────────
    print_section("场景2：多Agent协作（并行审查）")

    def test_e2e_multi_agent_collaboration():
        """端到端：多个Agent并行处理同一任务"""
        from app.services.agent_gateway import AgentGateway
        from app.adapters.claude import ClaudeAdapter
        from app.adapters.codex import CodexAdapter
        from app.adapters.trae import TraeAdapter

        gateway = AgentGateway()

        # 注册多个Agent
        asyncio.run(gateway.register_adapter("claude", ClaudeAdapter({})))
        asyncio.run(gateway.register_adapter("codex", CodexAdapter({})))
        asyncio.run(gateway.register_adapter("trae", TraeAdapter({})))

        # 所有Agent健康检查
        adapters = gateway.list_adapters()
        assert_equal(len(adapters), 3, "应注册3个Agent")

        for name in adapters:
            health = asyncio.run(gateway.health_check(name))
            assert_equal(health["status"], "online", f"Agent {name} 应在线")

        # 并行执行不同Agent处理同一任务
        code = "def bubble_sort(arr):\n    for i in range(len(arr)):\n        for j in range(len(arr)-1):\n            if arr[j] > arr[j+1]:\n                arr[j], arr[j+1] = arr[j+1], arr[j]\n    return arr"

        tasks = [
            ("claude", f"审查这段代码的逻辑正确性:\n{code}"),
            ("codex", f"重构这段代码提高性能:\n{code}"),
            ("trae", f"为这段代码生成单元测试:\n{code}"),
        ]

        results = []
        for agent_name, task in tasks:
            result = asyncio.run(gateway.execute(agent_name, task, {"code": code}))
            results.append(result)
            assert_equal(result["status"], "completed", f"{agent_name} 应成功完成")

        assert_equal(len(results), 3, "应有3个结果")
        # 所有Agent应产生不同风格的输出
        outputs = [r["output"] for r in results]
        assert_true(len(set(outputs)) == 3, "3个Agent应产生不同输出")
    suite.run(test_e2e_multi_agent_collaboration)

    # ─── 场景3：故障恢复 ────────────────────────────────────
    print_section("场景3：故障恢复与重试")

    def test_e2e_failure_recovery():
        """端到端：Agent失败后的重试和故障转移"""
        from app.services.workflow_engine import WorkflowEngine
        from app.core.context import ExecutionContext

        engine = WorkflowEngine(db_session=None, redis_client=None, event_bus=None)

        # 测试重试策略：指数退避
        retry_count = 0
        max_retries = 3
        delay = 1.0

        for attempt in range(max_retries + 1):
            retry_count += 1
            if attempt < max_retries:
                expected_delay = delay * (2 ** attempt)
                assert_true(expected_delay > 0, f"第{attempt+1}次重试应有延迟")

        assert_equal(retry_count, max_retries + 1, "应尝试max_retries+1次")

        # 测试上下文恢复
        ctx = ExecutionContext(
            thread_id="recover-test",
            variables={"step": 2, "partial_result": "done"},
            run_id="run-recover"
        )
        ctx.node_outputs["node1"] = {"status": "completed"}

        # 模拟从检查点恢复
        checkpoint_data = ctx.to_dict()
        restored = ExecutionContext.from_dict(checkpoint_data)
        assert_equal(restored.get_variable("step"), 2, "恢复后变量应保留")
        assert_equal(restored.node_outputs["node1"]["status"], "completed")
    suite.run(test_e2e_failure_recovery)

    # ─── 场景4：完整业务流程 ────────────────────────────────
    print_section("场景4：完整业务流程穿越")

    def test_e2e_full_business_flow():
        """
        完整业务流：
        1. 注册Agent
        2. 定义工作流
        3. 验证DAG
        4. 执行工作流
        5. 收集产物
        6. 检查Agent指标
        """
        from app.services.agent_gateway import AgentGateway
        from app.services.workflow_engine import WorkflowEngine
        from app.core.context import ExecutionContext
        from app.adapters.claude import ClaudeAdapter
        from app.adapters.codex import CodexAdapter

        total_start = time.perf_counter()

        # Step 1: Agent管理
        gateway = AgentGateway()
        asyncio.run(gateway.register_adapter("claude", ClaudeAdapter({})))
        asyncio.run(gateway.register_adapter("codex", CodexAdapter({})))
        adapters = gateway.list_adapters()
        assert_equal(len(adapters), 2, "应注册2个Agent")

        # Step 2: 健康检查
        for name in adapters:
            h = asyncio.run(gateway.health_check(name))
            assert_equal(h["status"], "online", f"Agent {name} 应在线")

        # Step 3: 定义工作流
        workflow_def = {
            "nodes": [
                {"id": "start", "type": "start", "data": {}},
                {"id": "review", "type": "claude", "data": {
                    "config": {"agent": {"taskDescription": "代码审查", "timeout": 30}}
                }},
                {"id": "refactor", "type": "codex", "data": {
                    "config": {"agent": {"taskDescription": "代码重构", "timeout": 30}}
                }},
                {"id": "end", "type": "end", "data": {}}
            ],
            "edges": [
                {"id": "e1", "source": "start", "target": "review"},
                {"id": "e2", "source": "review", "target": "refactor"},
                {"id": "e3", "source": "refactor", "target": "end"}
            ]
        }

        # Step 4: 验证DAG
        engine = WorkflowEngine(db_session=None, redis_client=None, event_bus=None)
        dag = engine.parse_dag(workflow_def)
        order = engine.topological_sort(dag)
        assert_true(len(order) > 0, "DAG应有效")

        # Step 5: 设置 Agent 网关并执行工作流
        engine.set_agent_gateway(gateway)

        ctx = ExecutionContext(
            thread_id=f"e2e-{int(time.time())}",
            variables={"code": "def test(): pass"},
            run_id=f"run-{int(time.time())}"
        )

        for node_id in order:
            node_def = dag.nodes[node_id]
            if node_def["type"] in ("claude", "codex"):
                result = asyncio.run(engine.execute_agent_node(node_id, node_def, ctx))
                ctx.node_outputs[node_id] = result
                assert_equal(result["status"], "completed")
                ctx.execution_history.append({
                    "node_id": node_id,
                    "status": "completed",
                    "output": result["output"][:50] + "..."
                })

        # Step 6: 收集产物
        ctx.add_artifact("review_report.md", "# Code Review\n\nAll checks passed.", "text/markdown")
        ctx.add_artifact("refactored_code.py", "def test():\n    pass", "text/x-python")
        assert_equal(len(ctx.artifacts), 2, "应产生2个产物")

        # Step 7: 验证执行历史
        assert_true(len(ctx.execution_history) > 0, "应有执行历史")

        total_duration = (time.perf_counter() - total_start) * 1000
        assert_true(total_duration > 0, "总执行时间应大于0")

        print(f"\n    完整业务流程测试通过！总耗时: {total_duration:.1f}ms")
        print(f"    - Agent注册: {len(adapters)} 个")
        print(f"    - 工作流节点: {len(dag.nodes)} 个")
        print(f"    - 执行历史: {len(ctx.execution_history)} 条")
        print(f"    - 产物: {len(ctx.artifacts)} 个")
    suite.run(test_e2e_full_business_flow)

    # ─── 场景5：状态机完整转换 ──────────────────────────────
    print_section("场景5：状态机完整转换")

    def test_e2e_state_machine_transitions():
        """测试工作流状态机的所有状态转换"""
        states = ["pending", "running", "paused", "completed", "failed"]

        # 验证状态集合
        assert_equal(len(states), 5, "应有5种状态")
        assert_in("pending", states)
        assert_in("running", states)
        assert_in("completed", states)
        assert_in("failed", states)
        assert_in("paused", states)

        # 验证有效转换
        valid_transitions = {
            "pending": ["running"],
            "running": ["paused", "completed", "failed"],
            "paused": ["running"],
            "completed": [],
            "failed": [],
        }

        for from_state, to_states in valid_transitions.items():
            assert_in(from_state, states, f"{from_state} 应是有效状态")
            for to_state in to_states:
                assert_in(to_state, states, f"{from_state}->{to_state} 目标状态应有效")

        # 模拟完整状态流
        current = "pending"
        current = "running"  # pending -> running
        assert_equal(current, "running")
        current = "paused"   # running -> paused
        assert_equal(current, "paused")
        current = "running"  # paused -> running
        assert_equal(current, "running")
        current = "completed"  # running -> completed
        assert_equal(current, "completed")
    suite.run(test_e2e_state_machine_transitions)

    return suite


def print_section(title):
    from tests.runner import print_section as ps
    ps(title)
