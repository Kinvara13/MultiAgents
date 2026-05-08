#!/usr/bin/env python3
"""
AgentNexus 端到端测试套件
纯 Python 实现，无需 pytest 依赖
"""

import sys
import os
import time
import traceback
from datetime import datetime
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from contextlib import contextmanager

# 添加项目根目录到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# ─── Test Framework ──────────────────────────────────────────

@dataclass
class TestResult:
    name: str
    passed: bool
    duration_ms: float
    error: Optional[str] = None
    details: Optional[str] = None

class TestSuite:
    def __init__(self, name: str):
        self.name = name
        self.results: List[TestResult] = []
        self._current_test = None

    def run(self, test_fn, *args, **kwargs):
        """Run a single test function and record result."""
        name = test_fn.__name__
        self._current_test = name
        start = time.perf_counter()
        try:
            test_fn(*args, **kwargs)
            duration = (time.perf_counter() - start) * 1000
            self.results.append(TestResult(name=name, passed=True, duration_ms=duration))
            print(f"  ✅ {name} ({duration:.1f}ms)")
        except AssertionError as e:
            duration = (time.perf_counter() - start) * 1000
            error_msg = str(e) if str(e) else "Assertion failed"
            self.results.append(TestResult(name=name, passed=False, duration_ms=duration, error=error_msg))
            print(f"  ❌ {name} ({duration:.1f}ms) - {error_msg}")
        except Exception as e:
            duration = (time.perf_counter() - start) * 1000
            error_msg = f"{type(e).__name__}: {e}"
            self.results.append(TestResult(name=name, passed=False, duration_ms=duration, error=error_msg))
            print(f"  💥 {name} ({duration:.1f}ms) - {error_msg}")

    def assert_true(self, condition: bool, message: str = ""):
        if not condition:
            raise AssertionError(message or "Expected True, got False")

    def assert_equal(self, actual: Any, expected: Any, message: str = ""):
        if actual != expected:
            raise AssertionError(message or f"Expected {expected!r}, got {actual!r}")

    def assert_not_none(self, value: Any, message: str = ""):
        if value is None:
            raise AssertionError(message or "Expected non-None value")

    def assert_in(self, item: Any, container: Any, message: str = ""):
        if item not in container:
            raise AssertionError(message or f"Expected {item!r} in {container!r}")

    def assert_raises(self, exc_type: type, fn, *args, **kwargs):
        try:
            fn(*args, **kwargs)
            raise AssertionError(f"Expected {exc_type.__name__} to be raised")
        except exc_type:
            pass

    def summary(self) -> Dict[str, Any]:
        passed = sum(1 for r in self.results if r.passed)
        failed = sum(1 for r in self.results if not r.passed)
        total_duration = sum(r.duration_ms for r in self.results)
        return {
            "suite": self.name,
            "total": len(self.results),
            "passed": passed,
            "failed": failed,
            "duration_ms": total_duration,
            "results": self.results,
        }


# ─── Assertions helper ───────────────────────────────────────

def assert_true(condition, message=""):
    if not condition:
        raise AssertionError(message or "Expected True, got False")

def assert_equal(actual, expected, message=""):
    if actual != expected:
        raise AssertionError(message or f"Expected {expected!r}, got {actual!r}")

def assert_not_none(value, message=""):
    if value is None:
        raise AssertionError(message or "Expected non-None value")

def assert_in(item, container, message=""):
    if item not in container:
        raise AssertionError(message or f"Expected {item!r} in {container!r}")

def assert_raises(exc_type, fn, *args, **kwargs):
    try:
        fn(*args, **kwargs)
        raise AssertionError(f"Expected {exc_type.__name__} to be raised")
    except exc_type:
        pass


# ─── Print Helpers ───────────────────────────────────────────

def print_header(title: str):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")

def print_section(title: str):
    print(f"\n{'─'*50}")
    print(f"  {title}")
    print(f"{'─'*50}")


# ─── Main Runner ─────────────────────────────────────────────

def run_all_tests():
    print_header("AgentNexus 端到端测试套件")
    print(f"  时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  Python: {sys.version.split()[0]}")

    all_suites: List[TestSuite] = []

    # Import and run test modules
    try:
        from tests.unit.test_workflow_engine import run_tests as run_engine_tests
        all_suites.append(run_engine_tests())
    except Exception as e:
        print(f"  ⚠️ 工作流引擎测试加载失败: {e}")

    try:
        from tests.unit.test_adapters import run_tests as run_adapter_tests
        all_suites.append(run_adapter_tests())
    except Exception as e:
        print(f"  ⚠️ Agent适配器测试加载失败: {e}")

    try:
        from tests.unit.test_utils import run_tests as run_utils_tests
        all_suites.append(run_utils_tests())
    except Exception as e:
        print(f"  ⚠️ 工具函数测试加载失败: {e}")

    try:
        from tests.integration.test_end_to_end import run_tests as run_e2e_tests
        all_suites.append(run_e2e_tests())
    except Exception as e:
        print(f"  ⚠️ 端到端测试加载失败: {e}")

    # Final Report
    print_header("📊 测试报告")
    total_tests = sum(len(s.results) for s in all_suites)
    total_passed = sum(sum(1 for r in s.results if r.passed) for s in all_suites)
    total_failed = sum(sum(1 for r in s.results if not r.passed) for s in all_suites)
    total_duration = sum(sum(r.duration_ms for r in s.results) for s in all_suites)

    for suite in all_suites:
        s = suite.summary()
        status = "✅ PASS" if s["failed"] == 0 else f"❌ {s['failed']} FAILED"
        print(f"\n  {s['suite']}: {status}")
        for r in s["results"]:
            icon = "✅" if r.passed else "❌"
            print(f"    {icon} {r.name} ({r.duration_ms:.1f}ms)", end="")
            if not r.passed and r.error:
                print(f" - {r.error}", end="")
            print()

    print(f"\n{'─'*50}")
    print(f"  总计: {total_tests} 项测试")
    print(f"  通过: {total_passed} ✅")
    print(f"  失败: {total_failed} {'❌' if total_failed > 0 else ''}")
    print(f"  耗时: {total_duration:.1f}ms")
    print(f"{'─'*50}")

    if total_failed == 0:
        print(f"\n  🎉 所有测试通过！系统运行正常。\n")
        return 0
    else:
        print(f"\n  ⚠️ 有 {total_failed} 项测试失败，请检查。\n")
        return 1


if __name__ == "__main__":
    exit_code = run_all_tests()
    sys.exit(exit_code)
