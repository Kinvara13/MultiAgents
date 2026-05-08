"""
Agent 适配器单元测试
测试所有6个Agent适配器的：执行、健康检查、工具列表
"""

import sys
import os
import asyncio
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from tests.runner import TestSuite, assert_equal, assert_true, assert_not_none, assert_in


def run_tests():
    suite = TestSuite("Agent 适配器测试")

    # ─── Claude 适配器 ──────────────────────────────────────
    print_section("Claude 适配器")

    def test_claude_execute():
        from app.adapters.claude import ClaudeAdapter
        adapter = ClaudeAdapter(agent_config={"endpoint": "http://localhost:8080"})

        result = asyncio.run(adapter.execute(
            "请审查这段代码的质量",
            {"code": "def hello(): pass"}
        ))
        assert_equal(result["status"], "completed", f"应返回completed，实际{result['status']}")
        assert_true(len(result["output"]) > 0, "输出不应为空")
        assert_true(result["duration_ms"] > 0, "应有执行耗时")
        assert_true(result["tokens_input"] >= 0, "应有token消耗")
    suite.run(test_claude_execute)

    def test_claude_health():
        from app.adapters.claude import ClaudeAdapter
        adapter = ClaudeAdapter(agent_config={})
        result = asyncio.run(adapter.health_check())
        assert_equal(result["status"], "online")
        assert_equal(result["agent"], "claude")
    suite.run(test_claude_health)

    def test_claude_tools():
        from app.adapters.claude import ClaudeAdapter
        adapter = ClaudeAdapter(agent_config={})
        tools = asyncio.run(adapter.list_tools())
        assert_true(len(tools) > 0, "应有可用工具")
        tool_names = [t["name"] for t in tools]
        assert_in("generate_code", tool_names, "应有generate_code工具")
        assert_in("review_code", tool_names, "应有review_code工具")
    suite.run(test_claude_tools)

    def test_claude_code_task():
        from app.adapters.claude import ClaudeAdapter
        adapter = ClaudeAdapter(agent_config={})
        result = asyncio.run(adapter.execute("生成一个Python排序函数", {}))
        assert_in("##", result["output"], "代码审查结果应包含markdown标题")
    suite.run(test_claude_code_task)

    # ─── Codex 适配器 ───────────────────────────────────────
    print_section("Codex 适配器")

    def test_codex_execute():
        from app.adapters.codex import CodexAdapter
        adapter = CodexAdapter(agent_config={"endpoint": "http://localhost:8081"})

        result = asyncio.run(adapter.execute(
            "重构这段代码",
            {"code": "function x(a,b){return a+b}"}
        ))
        assert_equal(result["status"], "completed")
        assert_true("```" in result["output"] or "function" in result["output"].lower(),
                    "Codex应返回代码相关输出")
    suite.run(test_codex_execute)

    def test_codex_health():
        from app.adapters.codex import CodexAdapter
        adapter = CodexAdapter(agent_config={})
        result = asyncio.run(adapter.health_check())
        assert_equal(result["status"], "online")
        assert_equal(result["agent"], "codex")
    suite.run(test_codex_health)

    # ─── Trae 适配器 ────────────────────────────────────────
    print_section("Trae 适配器")

    def test_trae_execute():
        from app.adapters.trae import TraeAdapter
        adapter = TraeAdapter(agent_config={"endpoint": "http://localhost:7777"})

        result = asyncio.run(adapter.execute(
            "run pytest and generate report",
            {"test_path": "./tests"}
        ))
        assert_equal(result["status"], "completed")
        assert_true("test" in result["output"].lower() or "result" in result["output"].lower(),
                    "Trae应返回测试结果")
    suite.run(test_trae_execute)

    def test_trae_terminal_tools():
        from app.adapters.trae import TraeAdapter
        adapter = TraeAdapter(agent_config={})
        tools = asyncio.run(adapter.list_tools())
        tool_names = [t["name"] for t in tools]
        assert_in("run_tests", tool_names, "应有run_tests工具")
        assert_in("execute_command", tool_names, "应有execute_command工具")
    suite.run(test_trae_terminal_tools)

    # ─── OpenClaw 适配器 ────────────────────────────────────
    print_section("OpenClaw 适配器")

    def test_openclaw_execute():
        from app.adapters.openclaw import OpenClawAdapter
        adapter = OpenClawAdapter(agent_config={"endpoint": "http://localhost:3001"})

        result = asyncio.run(adapter.execute(
            "抓取example.com的数据",
            {"url": "https://example.com"}
        ))
        assert_equal(result["status"], "completed")
    suite.run(test_openclaw_execute)

    def test_openclaw_health():
        from app.adapters.openclaw import OpenClawAdapter
        adapter = OpenClawAdapter(agent_config={"endpoint": "http://localhost:3001"})
        result = asyncio.run(adapter.health_check())
        assert_in(result["status"], ["online", "offline"], "健康状态应在线或离线")
    suite.run(test_openclaw_health)

    # ─── Hermes 适配器 ──────────────────────────────────────
    print_section("Hermes 适配器")

    def test_hermes_execute():
        from app.adapters.hermes import HermesAdapter
        adapter = HermesAdapter(agent_config={"endpoint": "ws://localhost:3002"})

        result = asyncio.run(adapter.execute(
            "发送通知到Slack",
            {"channel": "#dev", "message": "部署完成"}
        ))
        assert_equal(result["status"], "completed")
    suite.run(test_hermes_execute)

    def test_hermes_health():
        from app.adapters.hermes import HermesAdapter
        adapter = HermesAdapter(agent_config={})
        result = asyncio.run(adapter.health_check())
        assert_equal(result["status"], "online")
    suite.run(test_hermes_health)

    # ─── Cursor 适配器 ──────────────────────────────────────
    print_section("Cursor 适配器")

    def test_cursor_execute():
        from app.adapters.cursor import CursorAdapter
        adapter = CursorAdapter(agent_config={"endpoint": "http://localhost:8083"})

        result = asyncio.run(adapter.execute(
            "优化这段代码的性能",
            {"code": "for i in range(len(items)): print(items[i])"}
        ))
        assert_equal(result["status"], "completed")
    suite.run(test_cursor_execute)

    def test_cursor_health():
        from app.adapters.cursor import CursorAdapter
        adapter = CursorAdapter(agent_config={})
        result = asyncio.run(adapter.health_check())
        assert_equal(result["status"], "online")
        assert_equal(result["agent"], "cursor")
    suite.run(test_cursor_health)

    # ─── 适配器对比测试 ──────────────────────────────────────
    print_section("适配器对比测试")

    def test_all_adapters_have_tools():
        """所有适配器都应实现工具列表"""
        from app.adapters.claude import ClaudeAdapter
        from app.adapters.codex import CodexAdapter
        from app.adapters.trae import TraeAdapter
        from app.adapters.openclaw import OpenClawAdapter
        from app.adapters.hermes import HermesAdapter
        from app.adapters.cursor import CursorAdapter

        adapters = [
            ("claude", ClaudeAdapter({})),
            ("codex", CodexAdapter({})),
            ("trae", TraeAdapter({})),
            ("openclaw", OpenClawAdapter({"endpoint": "http://localhost:3001"})),
            ("hermes", HermesAdapter({})),
            ("cursor", CursorAdapter({})),
        ]

        for name, adapter in adapters:
            tools = asyncio.run(adapter.list_tools())
            assert_true(isinstance(tools, list), f"{name} 应返回工具列表")
            assert_true(len(tools) > 0, f"{name} 应至少有1个工具")
            for tool in tools:
                assert_in("name", tool, f"{name} 的工具应有name字段")
                assert_in("description", tool, f"{name} 的工具应有description字段")
    suite.run(test_all_adapters_have_tools)

    def test_all_adapters_health_check():
        """所有适配器都应实现健康检查"""
        from app.adapters.claude import ClaudeAdapter
        from app.adapters.codex import CodexAdapter
        from app.adapters.trae import TraeAdapter
        from app.adapters.openclaw import OpenClawAdapter
        from app.adapters.hermes import HermesAdapter
        from app.adapters.cursor import CursorAdapter

        adapters = [
            ("claude", ClaudeAdapter({})),
            ("codex", CodexAdapter({})),
            ("trae", TraeAdapter({})),
            ("openclaw", OpenClawAdapter({"endpoint": "http://localhost:3001"})),
            ("hermes", HermesAdapter({})),
            ("cursor", CursorAdapter({})),
        ]

        for name, adapter in adapters:
            result = asyncio.run(adapter.health_check())
            assert_in("status", result, f"{name} 健康检查应返回status字段")
            assert_in(result["status"], ["online", "offline"], f"{name} 状态应在线或离线")
    suite.run(test_all_adapters_health_check)

    return suite


def print_section(title):
    from tests.runner import print_section as ps
    ps(title)
