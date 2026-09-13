import ast
import re
from typing import List, Dict, Any, Tuple, Optional
from dataclasses import dataclass

@dataclass
class DocDriftItem:
    item_type: str        # "PARAMETER_MISMATCH", "MISSING_FUNCTION", "STALE_DOCSTRING"
    target_name: str      # e.g., "chat_completions"
    severity: str         # "HIGH", "MEDIUM", "LOW"
    description: str
    suggested_patch: str

@dataclass
class HealingReport:
    total_drift_detected: int
    is_synchronized: bool
    drift_items: List[DocDriftItem]
    healed_doc_content: str

class SelfHealingDocsEngine:
    """
    Project 4: Self-Healing Technical Documentation.
    Monitors a codebase, uses AST parsing to detect when code changes make documentation
    inaccurate, and auto-generates patches or PR review suggestions.
    """
    def __init__(self):
        pass

    def extract_code_symbols(self, python_code: str) -> Dict[str, Dict[str, Any]]:
        """Parses Python code into an AST and extracts public function and class signatures."""
        tree = ast.parse(python_code)
        symbols = {}

        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                # Skip private functions
                if node.name.startswith("_"):
                    continue
                # Positional args plus keyword-only args (those after a bare `*`) —
                # both are part of the real call signature. Missing kwonlyargs here
                # previously made `def foo(a, *, b, c)` look like `foo(a)`, which made
                # the healer falsely believe `b, c` had been removed from code and
                # delete them from the documentation instead of leaving them alone.
                args = [arg.arg for arg in node.args.args if arg.arg != "self"]
                args += [arg.arg for arg in node.args.kwonlyargs]
                symbols[node.name] = {
                    "type": "function",
                    "args": args,
                    "docstring": ast.get_docstring(node) or "",
                    "lineno": node.lineno,
                }
            elif isinstance(node, ast.ClassDef):
                if node.name.startswith("_"):
                    continue
                symbols[node.name] = {
                    "type": "class",
                    "docstring": ast.get_docstring(node) or "",
                    "lineno": node.lineno,
                }
        return symbols

    def analyze_documentation_drift(self, python_code: str, markdown_docs: str) -> HealingReport:
        """Compares code AST signatures with markdown documentation content."""
        code_symbols = self.extract_code_symbols(python_code)
        drift_items: List[DocDriftItem] = []
        healed_docs = markdown_docs

        for name, meta in code_symbols.items():
            if meta["type"] == "function":
                args = meta["args"]
                # Check if function is documented in markdown
                func_doc_pattern = rf"(`?{name}`?\s*\((.*?)\))"
                match = re.search(func_doc_pattern, markdown_docs)

                if match:
                    documented_args_str = match.group(2)
                    documented_args = [a.strip().split(":")[0].split("=")[0].strip() for a in documented_args_str.split(",") if a.strip()]

                    # Check for missing new parameters in docs
                    missing_in_docs = [a for a in args if a not in documented_args]
                    stale_in_docs = [a for a in documented_args if a not in args]

                    if missing_in_docs or stale_in_docs:
                        correct_sig = f"{name}({', '.join(args)})"
                        old_sig = match.group(1)
                        
                        desc = []
                        if missing_in_docs:
                            desc.append(f"Parameters {missing_in_docs} added in code but missing from documentation.")
                        if stale_in_docs:
                            desc.append(f"Parameters {stale_in_docs} documented in docs but no longer exist in code.")

                        drift_items.append(
                            DocDriftItem(
                                item_type="PARAMETER_MISMATCH",
                                target_name=name,
                                severity="HIGH",
                                description=" ".join(desc),
                                suggested_patch=f"- {old_sig}\n+ {correct_sig}",
                            )
                        )
                        # Apply automated healing patch
                        healed_docs = healed_docs.replace(old_sig, correct_sig)

        # Check for documented functions that no longer exist in code
        doc_functions = re.findall(r"### `?([a-zA-Z0-9_]+)`?\s*\(", markdown_docs)
        for doc_fn in doc_functions:
            # extract_code_symbols() intentionally excludes private (leading-underscore)
            # functions, so it can never confirm one still exists — checking it here
            # would flag every documented private helper as "removed" forever, even
            # when it's untouched. Only public functions are eligible for this check.
            if doc_fn.startswith("_"):
                continue
            if doc_fn not in code_symbols:
                drift_items.append(
                    DocDriftItem(
                        item_type="MISSING_FUNCTION",
                        target_name=doc_fn,
                        severity="MEDIUM",
                        description=f"Function '{doc_fn}' is documented in markdown but does not exist in code.",
                        suggested_patch=f"[Deprecated/Removed] Function '{doc_fn}' removed from codebase.",
                    )
                )

        return HealingReport(
            total_drift_detected=len(drift_items),
            is_synchronized=len(drift_items) == 0,
            drift_items=drift_items,
            healed_doc_content=healed_docs,
        )
