import ast
import contextlib
import io
import multiprocessing as mp
import os
import sys
import time
from typing import Any, Dict, List, Optional, Set, Tuple


MAX_CODE_LENGTH = 12000
MAX_STEPS = 1500
BLOCKED_NAMES = {
    "open",
    "exec",
    "eval",
    "compile",
    "__import__",
    "input",
    "breakpoint",
    "globals",
    "locals",
    "vars",
    "getattr",
    "setattr",
    "delattr",
    "help",
    "dir",
    "quit",
    "exit",
    "exit",
}
ALLOWED_BUILTINS = {
    "print": print,
    "range": range,
    "len": len,
    "sum": sum,
    "min": min,
    "max": max,
    "abs": abs,
    "round": round,
    "sorted": sorted,
    "enumerate": enumerate,
    "zip": zip,
    "int": int,
    "float": float,
    "str": str,
    "bool": bool,
    "list": list,
    "tuple": tuple,
    "dict": dict,
    "set": set,
    "type": type,
    "isinstance": isinstance,
    "enumerate": enumerate,
    "all": all,
    "any": any,
}


def validate_code(source: str) -> ast.AST:
    if len(source) > MAX_CODE_LENGTH:
        raise ValueError(f"Code is limited to {MAX_CODE_LENGTH} characters.")
    try:
        tree = ast.parse(source)
    except SyntaxError as exc:
        raise ValueError(f"Syntax error on line {exc.lineno}: {exc.msg}") from exc

    for node in ast.walk(tree):
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            raise ValueError("Imports are disabled in this educational demo.")
        if isinstance(node, ast.Name) and node.id in BLOCKED_NAMES:
            raise ValueError(f"'{node.id}' is disabled in this educational demo.")
        if isinstance(node, ast.Attribute) and node.attr.startswith("__"):
            raise ValueError("Dunder attributes are disabled.")
    return tree


def _serialize(value: Any, seen: Optional[Set[int]] = None, depth: int = 0) -> Any:
    if seen is None:
        seen = set()

    if depth > 5:
        return repr(value)[:200]
    if value is None or isinstance(value, (bool, int, float, str)):
        return value
    if isinstance(value, bytes):
        return value.decode("utf-8", errors="replace")
    if isinstance(value, (list, tuple)):
        obj_id = id(value)
        if obj_id in seen:
            return "<circular>"
        seen.add(obj_id)
        items = [_serialize(item, seen, depth + 1) for item in value]
        seen.remove(obj_id)
        return items
    if isinstance(value, set):
        obj_id = id(value)
        if obj_id in seen:
            return "<circular>"
        seen.add(obj_id)
        items = sorted(_serialize(item, seen, depth + 1) for item in value)
        seen.remove(obj_id)
        return items
    if isinstance(value, dict):
        obj_id = id(value)
        if obj_id in seen:
            return "<circular>"
        seen.add(obj_id)
        serialized = {
            str(key): _serialize(item, seen, depth + 1)
            for key, item in value.items()
        }
        seen.remove(obj_id)
        return serialized
    if hasattr(value, "__dict__"):
        return {
            "__class__": type(value).__name__,
            "__repr__": repr(value)[:200],
        }
    if isinstance(value, type):
        return value.__name__
    if callable(value):
        return f"<function {getattr(value, '__name__', type(value).__name__)}>"
    return repr(value)[:300]


class TraceRecorder:
    def __init__(self):
        self.steps: List[Dict[str, Any]] = []
        self.output_buffer = []
        self.error: Optional[str] = None
        self.last_seen_output = ""
        self.previous_values: Dict[int, Dict[str, Any]] = {}
        self.previous_lines: Dict[int, int] = {}

    def _current_output(self) -> str:
        return "".join(self.output_buffer)

    def _make_frame_snapshot(self, frame: Any, event_type: str, arg: Any = None) -> Dict[str, Any]:
        stack = []
        current = frame
        while current is not None:
            if current.f_code.co_filename == "<visualizer>":
                name = current.f_code.co_name
                stack.append("global" if name == "<module>" else name)
            current = current.f_back
        stack.reverse()

        local_vars = {
            key: _serialize(value)
            for key, value in frame.f_locals.items()
            if not key.startswith("__")
        }
        global_vars = {
            key: _serialize(value)
            for key, value in frame.f_globals.items()
            if key != "__builtins__" and not key.startswith("__")
        }
        variable_types = {
            key: type(value).__name__
            for key, value in frame.f_globals.items()
            if key != "__builtins__" and not key.startswith("__")
        }
        variable_types.update({
            key: type(value).__name__
            for key, value in frame.f_locals.items()
            if not key.startswith("__")
        })
        current_values = {**global_vars, **local_vars}
        previous_values = self.previous_values.get(id(frame), {})
        previous_line = self.previous_lines.get(id(frame))
        changed_variables = [
            {
                "name": key,
                "before": previous_values.get(key),
                "after": value,
                "type": variable_types.get(key, "unknown"),
            }
            for key, value in current_values.items()
            if key not in previous_values or previous_values[key] != value
        ]
        self.previous_values[id(frame)] = current_values

        step = {
            "event_type": event_type,
            "line": frame.f_lineno,
            "previous_line": previous_line,
            "function": frame.f_code.co_name,
            "locals": local_vars,
            "globals": global_vars,
            "variable_types": variable_types,
            "changed_variables": changed_variables,
            "stack": stack,
            "output": self._current_output(),
            "explanation": "",
        }
        if event_type == "line":
            self.previous_lines[id(frame)] = frame.f_lineno

        if event_type == "return":
            step["return_value"] = _serialize(arg)
            step["explanation"] = f"Function '{frame.f_code.co_name}' returned a value."
        elif event_type == "exception":
            step["exception"] = {
                "type": type(arg[1]).__name__ if arg and len(arg) > 1 else "Exception",
                "message": str(arg[1]) if arg and len(arg) > 1 else "Unknown exception",
            }
            step["explanation"] = f"An exception occurred while executing line {frame.f_lineno}."
        elif frame.f_code.co_name == "<module>":
            step["explanation"] = f"Executing line {frame.f_lineno} in the global scope."
        else:
            step["explanation"] = f"Executing line {frame.f_lineno} inside {frame.f_code.co_name}()."

        return step

    def trace(self, frame: Any, event: str, arg: Any) -> Any:
        filename = frame.f_code.co_filename
        if filename != "<visualizer>":
            return self.trace

        if len(self.steps) >= MAX_STEPS:
            raise RuntimeError(f"Trace stopped after {MAX_STEPS} steps to prevent runaway loops.")

        if event == "line":
            self.steps.append(self._make_frame_snapshot(frame, "line"))
        elif event == "call" and frame.f_code.co_name != "<module>":
            self.steps.append(self._make_frame_snapshot(frame, "call"))
        elif event == "return":
            self.steps.append(self._make_frame_snapshot(frame, "return", arg))
        elif event == "exception":
            self.steps.append(self._make_frame_snapshot(frame, "exception", arg))
        return self.trace


def _build_safe_namespace() -> Dict[str, Any]:
    namespace = {"__builtins__": ALLOWED_BUILTINS.copy()}
    return namespace


def _execute_worker(code: str, queue: mp.Queue, timeout_seconds: float) -> None:
    try:
        validate_code(code)
        started = time.perf_counter()
        output_buffer = io.StringIO()
        recorder = TraceRecorder()

        def safe_print(*values: Any, sep: str = " ", end: str = "\n", file: Any = None, flush: bool = False) -> None:
            if file is None:
                file = output_buffer
            rendered = sep.join(str(value) for value in values)
            recorder.output_buffer.append(rendered + end)
            if file is not None:
                print(rendered, end=end, file=file, flush=flush)

        builtins = ALLOWED_BUILTINS.copy()
        builtins["print"] = safe_print
        working_namespace = {"__builtins__": builtins}

        def _trace_callback(frame: Any, event: str, arg: Any) -> Any:
            if frame.f_code.co_filename != "<visualizer>":
                return _trace_callback
            if len(recorder.steps) >= MAX_STEPS:
                raise RuntimeError(f"Trace stopped after {MAX_STEPS} steps to prevent runaway loops.")
            if event == "line":
                recorder.steps.append(recorder._make_frame_snapshot(frame, "line"))
            elif event == "call" and frame.f_code.co_name != "<module>":
                recorder.steps.append(recorder._make_frame_snapshot(frame, "call"))
            elif event == "return":
                recorder.steps.append(recorder._make_frame_snapshot(frame, "return", arg))
            elif event == "exception":
                recorder.steps.append(recorder._make_frame_snapshot(frame, "exception", arg))
            return _trace_callback

        compiled = compile(code, "<visualizer>", "exec")
        try:
            sys.settrace(_trace_callback)
            with contextlib.redirect_stdout(output_buffer):
                exec(compiled, working_namespace, working_namespace)
        except Exception as exc:  # pragma: no cover - exercised via integration tests.
            recorder.error = f"{type(exc).__name__}: {exc}"
            if not recorder.steps or recorder.steps[-1].get("event_type") != "exception":
                frame = sys._getframe()
                recorder.steps.append({
                    "event_type": "exception",
                    "line": 0,
                    "function": "<module>",
                    "locals": {},
                    "globals": {},
                    "stack": ["global"],
                    "output": "".join(recorder.output_buffer),
                    "exception": {"type": type(exc).__name__, "message": str(exc)},
                    "explanation": f"Execution halted because {type(exc).__name__} occurred.",
                })
        finally:
            sys.settrace(None)

        final_output = output_buffer.getvalue()
        final_variables = {
            key: _serialize(value)
            for key, value in working_namespace.items()
            if key != "__builtins__" and not key.startswith("__")
        }
        elapsed_ms = int((time.perf_counter() - started) * 1000)
        queue.put({
            "status": "ok" if recorder.error is None else "error",
            "steps": recorder.steps,
            "output": final_output,
            "error": recorder.error,
            "final_variables": final_variables,
            "execution_time_ms": elapsed_ms,
        })
    except Exception as exc:  # pragma: no cover - used for malformed execution fallbacks.
        queue.put({
            "status": "error",
            "steps": [],
            "output": "",
            "error": f"{type(exc).__name__}: {exc}",
            "final_variables": {},
            "execution_time_ms": 0,
        })


def execute_python(code: str, timeout_seconds: float = 5.0) -> Dict[str, Any]:
    if not isinstance(code, str):
        raise TypeError("Code must be a string.")
    if not code.strip():
        raise ValueError("Code cannot be empty.")
    validate_code(code)

    queue: mp.Queue = mp.Queue()
    process = mp.Process(target=_execute_worker, args=(code, queue, timeout_seconds))
    process.start()
    process.join(timeout_seconds)

    if process.is_alive():
        process.terminate()
        process.join(1)
        raise TimeoutError(f"Execution exceeded the {timeout_seconds} second time limit.")

    if queue.empty():
        raise RuntimeError("Execution worker did not return a result.")

    result = queue.get()
    if not isinstance(result, dict):
        raise RuntimeError("Execution result was not in the expected format.")
    return result


def analyze_code(code: str) -> Dict[str, Any]:
    if not isinstance(code, str):
        raise ValueError("Code must be a string.")
    if len(code) > MAX_CODE_LENGTH:
        raise ValueError(f"Code is limited to {MAX_CODE_LENGTH} characters.")
    try:
        tree = ast.parse(code)
    except SyntaxError as exc:
        raise ValueError(f"Syntax error on line {exc.lineno}: {exc.msg}") from exc
    nodes = list(ast.walk(tree))
    variables = sorted({
        node.id for node in nodes
        if isinstance(node, ast.Name) and isinstance(node.ctx, ast.Store)
    } | {node.arg for node in nodes if isinstance(node, ast.arg)})
    functions = [node.name for node in nodes if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))]
    loops = [node for node in nodes if isinstance(node, (ast.For, ast.AsyncFor, ast.While))]
    branches = [node for node in nodes if isinstance(node, ast.If)]
    calls = [node for node in nodes if isinstance(node, ast.Call)]
    function_names = set(functions)
    recursive_functions = [
        function.name for function in nodes
        if isinstance(function, (ast.FunctionDef, ast.AsyncFunctionDef))
        and any(
            isinstance(call, ast.Call)
            and isinstance(call.func, ast.Name)
            and call.func.id == function.name
            for call in ast.walk(function)
        )
    ]
    concepts = []
    if variables:
        concepts.append("variables")
    if any(isinstance(node, ast.Constant) and isinstance(node.value, (int, float, str, bool)) for node in nodes):
        concepts.append("data-types")
    if branches:
        concepts.append("conditions")
    if loops:
        concepts.append("loops")
    if functions:
        concepts.append("functions")
    if recursive_functions:
        concepts.append("recursion")
    if any(isinstance(node, (ast.List, ast.ListComp)) for node in nodes):
        concepts.append("lists")
    if any(isinstance(node, (ast.Dict, ast.DictComp)) for node in nodes):
        concepts.append("dictionaries")
    if any(isinstance(node, ast.Tuple) for node in nodes):
        concepts.append("tuples")
    if any(isinstance(node, ast.GeneratorExp) for node in nodes):
        concepts.append("generators")
    if any(isinstance(node, (ast.Set, ast.SetComp)) for node in nodes):
        concepts.append("sets")
    if any(isinstance(call.func, ast.Attribute) and call.func.attr == "sort" or isinstance(call.func, ast.Name) and call.func.id == "sorted" for call in calls):
        concepts.append("sorting")
    if any(
        isinstance(node, ast.Call)
        and (
            isinstance(node.func, ast.Attribute) and node.func.attr in {"index", "find", "get"}
            or isinstance(node.func, ast.Name) and node.func.id.lower() in {"search", "find", "lookup"}
        )
        for node in calls
    ) or any(
        isinstance(node, ast.Compare) and any(isinstance(operator, (ast.In, ast.NotIn)) for operator in node.ops)
        for node in nodes
    ) or any(
        isinstance(node, ast.Name) and any(token in node.id.lower() for token in ("search", "find", "lookup"))
        for node in nodes
    ):
        concepts.append("searching")
    if any(isinstance(node, (ast.Try, ast.Raise, ast.ExceptHandler)) for node in nodes):
        concepts.append("exceptions")
    if any(isinstance(node, ast.ClassDef) for node in nodes):
        concepts.append("oop")
    if any(
        isinstance(node, ast.Call) and (
            isinstance(node.func, ast.Name) and node.func.id == "open"
            or isinstance(node.func, ast.Attribute) and node.func.attr in {"read", "write", "read_text", "write_text"}
        )
        for node in calls
    ):
        concepts.append("file-handling")

    def source_label(node: ast.AST) -> str:
        label = ast.unparse(node).splitlines()[0]
        return label if len(label) <= 100 else label[:97] + "..."

    def build_diagram(statements: List[ast.stmt]) -> List[Dict[str, Any]]:
        diagram_nodes = []
        for node in statements:
            if isinstance(node, ast.If):
                diagram_nodes.append({
                    "kind": "condition",
                    "label": source_label(node.test),
                    "line": node.lineno,
                    "end_line": getattr(node, "end_lineno", node.lineno),
                    "branches": [
                        {"label": "True", "nodes": build_diagram(node.body)},
                        {"label": "False", "nodes": build_diagram(node.orelse)},
                    ],
                })
            elif isinstance(node, (ast.For, ast.AsyncFor, ast.While)):
                loop_label = f"{source_label(node.target)} in {source_label(node.iter)}" if isinstance(node, (ast.For, ast.AsyncFor)) else source_label(node.test)
                diagram_nodes.append({
                    "kind": "loop",
                    "label": loop_label,
                    "line": node.lineno,
                    "end_line": getattr(node, "end_lineno", node.lineno),
                    "phases": (
                        ["check condition", "execute body when true", "repeat condition", "terminate when false"]
                        if isinstance(node, ast.While)
                        else ["initialize iterator", "get next item", "execute body", "repeat or terminate"]
                    ),
                    "children": build_diagram(node.body),
                })
            elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                diagram_nodes.append({
                    "kind": "function",
                    "label": f"{node.name}({', '.join(arg.arg for arg in node.args.args)})",
                    "line": node.lineno,
                    "end_line": getattr(node, "end_lineno", node.lineno),
                    "recursive": node.name in recursive_functions,
                    "children": build_diagram(node.body),
                })
            elif isinstance(node, ast.ClassDef):
                diagram_nodes.append({
                    "kind": "class",
                    "label": node.name,
                    "line": node.lineno,
                    "end_line": getattr(node, "end_lineno", node.lineno),
                    "children": build_diagram(node.body),
                })
            else:
                kind = "return" if isinstance(node, ast.Return) else "operation"
                diagram_nodes.append({
                    "kind": kind,
                    "label": source_label(node),
                    "line": getattr(node, "lineno", 0),
                    "end_line": getattr(node, "end_lineno", getattr(node, "lineno", 0)),
                })
        return diagram_nodes

    concept_labels = {
        "recursion": "Recursive function calls build a call tree and return values unwind it.",
        "sorting": "The collection is ordered by the sorting operation in your code.",
        "searching": "The code accesses or searches within a collection.",
        "dictionaries": "Key-value data can model a product catalogue or student record.",
        "lists": "A sequence can model marks, attendance, or items in a cart.",
        "loops": "Repeated processing can model daily sales or a batch of student marks.",
        "conditions": "A decision can model eligibility or a pass/fail rule.",
        "functions": "A reusable operation can model a bill, calculation, or validation step.",
        "variables": "Named values hold the state used by the program.",
        "data-types": "Python values use types such as integers, strings, and booleans.",
        "exceptions": "Exception handling describes how the program responds to failures.",
        "oop": "Classes group related data and behavior into objects.",
        "file-handling": "The code contains a context-managed operation; filesystem access may be blocked by this demo's execution policy.",
        "tuples": "Tuples group values into a fixed sequence.",
        "generators": "Generator expressions produce values one at a time as they are consumed.",
        "sets": "Sets represent unique values without a fixed order.",
    }
    scenario_templates = {
        "recursion": ("Directory traversal", "Each recursive call explores a nested folder, then returns as the call stack unwinds."),
        "sorting": ("Ordering product prices", "The collection in your sorting expression represents prices being arranged for comparison."),
        "searching": ("Finding a record", "The collection access or lookup represents finding a student or inventory item."),
        "dictionaries": ("Student or product records", "Dictionary keys identify fields or products, and values store their associated details."),
        "lists": ("Shopping cart or class list", "The list in your code represents a collection processed by the program."),
        "loops": ("Batch processing", "The loop repeats the same operation for each item, like processing marks or daily sales."),
        "conditions": ("Eligibility decision", "The condition acts like a rule that selects one outcome, such as eligible or not eligible."),
        "functions": ("Reusable service calculation", "The function packages a repeatable operation, like calculating a bill or checking a withdrawal."),
        "tuples": ("Fixed student record", "A tuple can represent a fixed record such as a student's identifier and score."),
        "sets": ("Unique attendance IDs", "A set models unique values, such as student IDs counted once for attendance."),
        "generators": ("Streaming sales records", "Values are produced one at a time instead of materializing the entire collection."),
        "exceptions": ("Checkout error recovery", "Exception paths can model how a checkout handles invalid or unavailable data."),
        "oop": ("Inventory item model", "A class can group product fields and operations that use those fields."),
        "file-handling": ("Reading an application log", "The code describes file-oriented work; execution is blocked by this local demo's safety policy."),
        "data-types": ("Tracking measured values", "The values and their Python types represent measurements and labels in a workflow."),
        "variables": ("Tracking a process", "Assignments update named values that represent the current state of a small workflow."),
    }
    scenario_concept = next((concept for concept in scenario_templates if concept in concepts), "variables")
    scenario_title, scenario_mapping = scenario_templates[scenario_concept]
    used_names = variables[:6]
    assigned_lines = [line for line in code.splitlines() if line.strip()]
    scenario = {
        "title": scenario_title,
        "concept": scenario_concept,
        "mapping": scenario_mapping,
        "variables": used_names,
        "input": ", ".join(used_names) if used_names else "No named variables detected yet.",
        "process": f"Follow the highlighted steps and watch {', '.join(used_names[:3]) or 'the program state'} change.",
        "output": "Run the program to see its actual output; no output is inferred from the example template.",
        "source_lines": len(assigned_lines),
    }
    specific_scenarios = [
        concept for concept in scenario_templates
        if concept in concepts and concept not in {"variables", "data-types"}
    ]
    scenario_concepts = specific_scenarios[:4] if specific_scenarios else [
        concept for concept in ("data-types", "variables") if concept in concepts
    ][:1]
    real_world_examples = [
        {
            "title": scenario_templates[concept][0],
            "concept": concept,
            "mapping": scenario_templates[concept][1],
            "variables": used_names,
        }
        for concept in scenario_concepts[:4]
    ]

    loop_details = []
    for loop in loops:
        if isinstance(loop, (ast.For, ast.AsyncFor)):
            iterator = loop.iter
            header = f"for {ast.unparse(loop.target)} in {ast.unparse(iterator)}"
            iteration_count = None
            if isinstance(iterator, (ast.List, ast.Tuple, ast.Set)):
                iteration_count = len(iterator.elts)
            elif isinstance(iterator, ast.Call) and isinstance(iterator.func, ast.Name) and iterator.func.id == "range":
                try:
                    range_args = [ast.literal_eval(argument) for argument in iterator.args]
                    if all(isinstance(argument, int) for argument in range_args) and 1 <= len(range_args) <= 3:
                        iteration_count = len(range(*range_args))
                except (ValueError, TypeError):
                    pass
        else:
            header = f"while {ast.unparse(loop.test)}"
            iteration_count = None
        loop_details.append({
            "kind": "while" if isinstance(loop, ast.While) else "for",
            "header": header,
            "line": loop.lineno,
            "iteration_count": iteration_count,
        })
    unsupported_constructs = []
    for node in nodes:
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            unsupported_constructs.append("Imports are disabled during execution.")
        elif isinstance(node, ast.Name) and node.id in BLOCKED_NAMES:
            unsupported_constructs.append(f"'{node.id}' is disabled during execution.")
        elif isinstance(node, ast.Attribute) and node.attr.startswith("__"):
            unsupported_constructs.append("Dunder attributes are disabled during execution.")
    return {
        "status": "ok",
        "variables": variables,
        "functions": functions,
        "loops": [type(node).__name__ for node in loops],
        "branches": ["if" for _ in branches],
        "concepts": concepts,
        "concept_explanations": {concept: concept_labels[concept] for concept in concepts},
        "recursive_functions": recursive_functions,
        "diagram": build_diagram(tree.body),
        "real_world": scenario,
        "real_world_examples": real_world_examples,
        "loop_details": loop_details,
        "unsupported_constructs": sorted(set(unsupported_constructs)),
        "line_count": len(code.splitlines()),
    }
