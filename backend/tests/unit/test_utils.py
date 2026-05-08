"""
工具函数测试
测试：上下文管理、消息总线、MCP协议、辅助函数
"""

import sys
import os
import asyncio
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from tests.runner import TestSuite, assert_equal, assert_true, assert_not_none, assert_in


def run_tests():
    suite = TestSuite("工具函数测试")

    # ─── ExecutionContext ────────────────────────────────────
    print_section("执行上下文 (ExecutionContext)")

    def test_context_creation():
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
    suite.run(test_context_creation)

    def test_context_set_variable():
        from app.core.context import ExecutionContext
        ctx = ExecutionContext(thread_id="t1", variables={}, run_id="r1")
        ctx.set_variable("result", "success")
        assert_equal(ctx.get_variable("result"), "success")
        ctx.set_variable("nested.key", "value")
        assert_equal(ctx.get_variable("nested")["key"], "value")
    suite.run(test_context_set_variable)

    def test_context_add_artifact():
        from app.core.context import ExecutionContext
        ctx = ExecutionContext(thread_id="t1", variables={}, run_id="r1")
        ctx.add_artifact("test.py", "print('hello')", "text/x-python")
        assert_equal(len(ctx.artifacts), 1)
        assert_equal(ctx.artifacts[0]["name"], "test.py")
        assert_equal(ctx.artifacts[0]["mime_type"], "text/x-python")
    suite.run(test_context_add_artifact)

    def test_context_serialization():
        from app.core.context import ExecutionContext
        ctx = ExecutionContext(thread_id="t1", variables={"key": "value"}, run_id="r1")
        ctx.node_outputs["n1"] = "output1"
        ctx.add_artifact("test.py", "code", "text/x-python")

        data = ctx.to_dict()
        assert_equal(data["thread_id"], "t1")
        assert_equal(data["variables"]["key"], "value")
        assert_equal(len(data["artifacts"]), 1)

        restored = ExecutionContext.from_dict(data)
        assert_equal(restored.thread_id, "t1")
        assert_equal(restored.get_variable("key"), "value")
        assert_equal(len(restored.artifacts), 1)
    suite.run(test_context_serialization)

    def test_context_missing_variable():
        from app.core.context import ExecutionContext
        ctx = ExecutionContext(thread_id="t1", variables={"a": 1}, run_id="r1")
        assert_equal(ctx.get_variable("nonexistent"), None)
    suite.run(test_context_missing_variable)

    # ─── MessageBus ──────────────────────────────────────────
    print_section("A2A 消息总线 (MessageBus)")

    def test_message_bus_publish_subscribe():
        from app.core.message_bus import MessageBus
        bus = MessageBus()
        received = []

        async def handler(msg):
            received.append(msg)

        asyncio.run(bus.subscribe("test-channel", handler))
        asyncio.run(bus.publish("test-channel", {"type": "test", "data": "hello"}))

        assert_equal(len(received), 1)
        assert_equal(received[0]["type"], "test")
    suite.run(test_message_bus_publish_subscribe)

    def test_message_bus_different_channels():
        from app.core.message_bus import MessageBus
        bus = MessageBus()
        ch1_msgs = []
        ch2_msgs = []

        async def h1(msg): ch1_msgs.append(msg)
        async def h2(msg): ch2_msgs.append(msg)

        asyncio.run(bus.subscribe("ch1", h1))
        asyncio.run(bus.subscribe("ch2", h2))
        asyncio.run(bus.publish("ch1", {"data": "ch1-data"}))
        asyncio.run(bus.publish("ch2", {"data": "ch2-data"}))

        assert_equal(len(ch1_msgs), 1)
        assert_equal(len(ch2_msgs), 1)
        assert_equal(ch1_msgs[0]["data"], "ch1-data")
        assert_equal(ch2_msgs[0]["data"], "ch2-data")
    suite.run(test_message_bus_different_channels)

    # ─── MCP Registry ────────────────────────────────────────
    print_section("MCP 工具注册表 (MCPServerRegistry)")

    def test_mcp_register_and_discover():
        from app.core.mcp import MCPServerRegistry, MCPServer, MCPTool

        registry = MCPServerRegistry()
        server = MCPServer(
            name="test-server",
            version="1.0",
            tools=[
                MCPTool(name="search", description="Search tool", parameters={"q": "string"}),
                MCPTool(name="calc", description="Calculator", parameters={"expr": "string"}),
            ]
        )
        registry.register(server)

        tools = asyncio.run(registry.discover_tools())
        assert_equal(len(tools), 2)
        tool_names = [t["name"] for t in tools]
        assert_in("search", tool_names)
        assert_in("calc", tool_names)
    suite.run(test_mcp_register_and_discover)

    def test_mcp_call_tool():
        from app.core.mcp import MCPServerRegistry, MCPServer, MCPTool

        registry = MCPServerRegistry()
        server = MCPServer(
            name="test-server",
            version="1.0",
            tools=[MCPTool(name="echo", description="Echo", parameters={"msg": "string"})]
        )
        registry.register(server)

        result = asyncio.run(registry.call_tool("test-server", "echo", {"msg": "hello"}))
        assert_equal(result["tool"], "echo")
    suite.run(test_mcp_call_tool)

    # ─── Helper Functions ────────────────────────────────────
    print_section("辅助函数")

    def test_generate_uuid():
        from app.utils.helpers import generate_uuid
        uid = generate_uuid()
        assert_equal(len(uid), 36, "UUID应为36字符")
        assert_equal(uid.count("-"), 4, "UUID应有4个连字符")

        uid2 = generate_uuid()
        assert_true(uid != uid2, "两个UUID应不同")
    suite.run(test_generate_uuid)

    def test_safe_json_loads():
        from app.utils.helpers import safe_json_loads
        assert_equal(safe_json_loads('{"a": 1}'), {"a": 1})
        assert_equal(safe_json_loads("invalid json"), {})
        assert_equal(safe_json_loads("null"), {})
    suite.run(test_safe_json_loads)

    def test_deep_merge():
        from app.utils.helpers import deep_merge
        base = {"a": 1, "b": {"c": 2}}
        override = {"b": {"d": 3}, "e": 4}
        result = deep_merge(base, override)
        assert_equal(result["a"], 1)
        assert_equal(result["b"]["c"], 2)
        assert_equal(result["b"]["d"], 3)
        assert_equal(result["e"], 4)
    suite.run(test_deep_merge)

    def test_truncate_string():
        from app.utils.helpers import truncate_string
        assert_equal(truncate_string("hello world", 8), "hello...")
        assert_equal(truncate_string("hi", 8), "hi")
        assert_equal(truncate_string("", 5), "")
    suite.run(test_truncate_string)

    def test_now_iso():
        from app.utils.helpers import now_iso
        ts = now_iso()
        assert_true(len(ts) > 10, "时间戳应有效")
        assert_in("T", ts, "ISO格式应包含T")
    suite.run(test_now_iso)

    return suite


def print_section(title):
    from tests.runner import print_section as ps
    ps(title)
