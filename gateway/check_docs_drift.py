#!/usr/bin/env python3
"""
Self-Healing Documentation CI check (Project 4).

Compares gateway/main.py's real function signatures against gateway/API_REFERENCE.md.
On drift, writes the healed markdown back to API_REFERENCE.md so the CI workflow can
open a pull request with the correction, instead of only printing a suggestion nobody
applies.

Exit code is always 0 — this script auto-heals rather than blocking the build; the
workflow surfaces the fix as a PR for review.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from spokes.self_healing_docs import SelfHealingDocsEngine

GATEWAY_DIR = os.path.dirname(os.path.abspath(__file__))
CODE_PATH = os.path.join(GATEWAY_DIR, "main.py")
DOCS_PATH = os.path.join(GATEWAY_DIR, "API_REFERENCE.md")


def main() -> int:
    with open(CODE_PATH, "r", encoding="utf-8") as f:
        code = f.read()
    with open(DOCS_PATH, "r", encoding="utf-8") as f:
        docs = f.read()

    engine = SelfHealingDocsEngine()
    report = engine.analyze_documentation_drift(code, docs)

    summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    lines = [f"## Self-Healing Docs: {'drift detected' if not report.is_synchronized else 'in sync'}"]

    if report.is_synchronized:
        print("API_REFERENCE.md is synchronized with main.py — no action needed.")
        lines.append("`gateway/API_REFERENCE.md` matches the current `main.py` signatures.")
    else:
        print(f"Detected {report.total_drift_detected} documentation drift item(s):")
        lines.append(f"Detected **{report.total_drift_detected}** drift item(s):")
        for item in report.drift_items:
            print(f"  [{item.severity}] {item.target_name}: {item.description}")
            print(f"  Patch:\n{item.suggested_patch}")
            lines.append(f"- `[{item.severity}]` **{item.target_name}**: {item.description}")

        with open(DOCS_PATH, "w", encoding="utf-8") as f:
            f.write(report.healed_doc_content)
        print(f"Wrote healed content to {DOCS_PATH}")
        lines.append("\n`gateway/API_REFERENCE.md` has been auto-corrected in this PR.")

    if summary_path:
        with open(summary_path, "a", encoding="utf-8") as f:
            f.write("\n".join(lines) + "\n")

    # Exposed for the workflow step to decide whether to open a PR.
    github_output = os.environ.get("GITHUB_OUTPUT")
    if github_output:
        with open(github_output, "a", encoding="utf-8") as f:
            f.write(f"drift_detected={'false' if report.is_synchronized else 'true'}\n")

    return 0


if __name__ == "__main__":
    sys.exit(main())
