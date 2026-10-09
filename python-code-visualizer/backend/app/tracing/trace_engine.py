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

    def _current_output(self) -> str:
        return "".join(self.output_buffer)

    def _make_frame_snapshot(self, frame: Any, event_type: str, arg: Any = None) -> Dict[str, Any]:
        stack = []
        current = frame
        while current is not None:
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

        step = {
            "event_type": event_type,
            "line": frame.f_lineno,
            "function": frame.f_code.co_name,
            "locals": local_vars,
            "globals": global_vars,
            "stack": stack,
            "output": self._current_output(),
            "explanation": "",
        }

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
        elif event == "call":
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
            elif event == "call":
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
    tree = validate_code(code)
    variables = []
    functions = []
    loops = []
    branches = []

    for node in ast.walk(tree):
        if isinstance(node, (ast.Assign, ast.AnnAssign, ast.AugAssign)):
            targets = []
            for target in [node] if not hasattr(node, "targets") else node.targets:
                if hasattr(target, "id"):
                    targets.append(target.id)
                elif isinstance(target, ast.Tuple):
                    targets.extend([elt.id for elt in target.elts if isinstance(elt, ast.Name)])
            variables.extend(targets)
        elif isinstance(node, ast.FunctionDef):
            functions.append(node.name)
        elif isinstance(node, (ast.For, ast.AsyncFor, ast.While)):
            loops.append(type(node).__name__)
        elif isinstance(node, ast.If):
            branches.append("if")

    return {
        "status": "ok",
        "variables": sorted(set(variables)),
        "functions": functions,
        "loops": loops,
        "branches": branches,
        "line_count": len(code.splitlines()),
    }
