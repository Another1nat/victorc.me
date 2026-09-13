"""
Project 1: Model Regression Detection System.

A CI/CD-style harness that re-runs a fixed "golden dataset" of checks spanning
every subsystem (gateway completion, SQL guardrails, hybrid RAG, self-healing
docs, LoRA) on demand — e.g. whenever a prompt template, model config, or
routing rule changes — and compares the pass/fail outcome against the last
recorded baseline. A case that used to pass and now fails is a genuine
regression, not just a generic test failure, and gets surfaced as one.

This is deliberately independent of pytest: pytest proves the code is correct
*at commit time*; this harness answers "did today's config/traffic still pass
the same bar it passed yesterday?" at *any* time, including in production.
"""
import inspect
import logging
import os
import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Awaitable, Callable, Dict, List, Optional, Union

logger = logging.getLogger("gateway.regression")

RunFn = Callable[[], Union[Dict[str, Any], Awaitable[Dict[str, Any]]]]
AssertFn = Callable[[Dict[str, Any]], List[str]]


@dataclass
class GoldenCase:
    case_id: str
    category: str
    description: str
    run: RunFn
    check: AssertFn


@dataclass
class GoldenCaseResult:
    case_id: str
    category: str
    description: str
    passed: bool
    duration_ms: float
    observed: Dict[str, Any] = field(default_factory=dict)
    failures: List[str] = field(default_factory=list)
    error: Optional[str] = None


@dataclass
class RegressionRunResult:
    run_id: str
    timestamp: float
    total_cases: int
    passed_cases: int
    failed_cases: int
    newly_regressed: List[str]
    newly_recovered: List[str]
    is_regression: bool
    results: List[GoldenCaseResult]


class SlackNotifier:
    """
    Real webhook POST when SLACK_WEBHOOK_URL is configured; a no-op (logged, not
    faked as "sent") otherwise. This is honest about which half is live: the
    HTTP call is real code that works with a real webhook, but nothing here
    pretends a message was delivered when it wasn't.
    """
    def __init__(self, webhook_url: Optional[str] = None):
        self.webhook_url = webhook_url or os.getenv("SLACK_WEBHOOK_URL", "")

    async def notify_regression(self, run_result: RegressionRunResult) -> bool:
        message = (
            f":rotating_light: Model regression detected — {len(run_result.newly_regressed)} case(s) "
            f"newly failing: {', '.join(run_result.newly_regressed)}"
        )
        if not self.webhook_url:
            logger.warning("SLACK_WEBHOOK_URL not configured — regression alert logged only: %s", message)
            return False
        try:
            import httpx
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.post(self.webhook_url, json={"text": message})
                return res.status_code < 300
        except Exception as e:
            logger.error("Failed to deliver Slack regression alert: %s", str(e))
            return False


class RegressionHarness:
    """Registers golden cases and re-runs them, diffing against the last baseline."""

    def __init__(self, notifier: Optional[SlackNotifier] = None, max_history: int = 20):
        self.golden_cases: List[GoldenCase] = []
        self.last_pass_state: Dict[str, bool] = {}
        self.run_history: List[RegressionRunResult] = []
        self.max_history = max_history
        self.notifier = notifier or SlackNotifier()

    def register_case(self, case: GoldenCase):
        self.golden_cases.append(case)

    async def _execute_case(self, case: GoldenCase) -> GoldenCaseResult:
        start = time.time()
        try:
            result = case.run()
            if inspect.isawaitable(result):
                result = await result
            failures = case.check(result)
            return GoldenCaseResult(
                case_id=case.case_id,
                category=case.category,
                description=case.description,
                passed=len(failures) == 0,
                duration_ms=round((time.time() - start) * 1000, 2),
                observed=result,
                failures=failures,
            )
        except Exception as e:
            return GoldenCaseResult(
                case_id=case.case_id,
                category=case.category,
                description=case.description,
                passed=False,
                duration_ms=round((time.time() - start) * 1000, 2),
                failures=["Case raised an exception instead of returning a result."],
                error=str(e),
            )

    async def run_suite(self, notify_on_regression: bool = True) -> RegressionRunResult:
        results = [await self._execute_case(c) for c in self.golden_cases]

        newly_regressed = []
        newly_recovered = []
        for r in results:
            previously_passed = self.last_pass_state.get(r.case_id)
            if previously_passed is True and not r.passed:
                newly_regressed.append(r.case_id)
            elif previously_passed is False and r.passed:
                newly_recovered.append(r.case_id)
            self.last_pass_state[r.case_id] = r.passed

        run_result = RegressionRunResult(
            run_id=f"reg-{uuid.uuid4().hex[:10]}",
            timestamp=time.time(),
            total_cases=len(results),
            passed_cases=sum(1 for r in results if r.passed),
            failed_cases=sum(1 for r in results if not r.passed),
            newly_regressed=newly_regressed,
            newly_recovered=newly_recovered,
            is_regression=len(newly_regressed) > 0,
            results=results,
        )

        self.run_history.append(run_result)
        if len(self.run_history) > self.max_history:
            self.run_history.pop(0)

        if run_result.is_regression and notify_on_regression:
            await self.notifier.notify_regression(run_result)

        return run_result

    def get_last_run(self) -> Optional[RegressionRunResult]:
        return self.run_history[-1] if self.run_history else None
