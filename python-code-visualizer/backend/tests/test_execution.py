import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.tracing.trace_engine import analyze_code, execute_python

client = TestClient(app)


def test_simple_assignment_trace():
    result = execute_python("x = 10\ny = x + 5\nprint(y)")
    assert result["status"] == "ok"
    assert result["output"] == "15\n"
    assert any(step["event_type"] == "line" for step in result["steps"])
    assert result["steps"][0]["line"] == 1
    assert result["steps"][0]["stack"] == ["global"]


def test_arithmetic_and_output():
    result = execute_python("a = 3\nb = 4\nprint(a * b)")
    assert result["output"] == "12\n"


def test_conditional_statement():
    result = execute_python("x = 3\nif x > 0:\n    y = 1\nelse:\n    y = 0\nprint(y)")
    assert result["output"] == "1\n"


def test_for_loop_trace():
    result = execute_python("total = 0\nfor number in [1, 2, 3]:\n    total += number\nprint(total)")
    assert result["output"] == "6\n"
    assert len(result["steps"]) > 0


def test_while_loop_trace():
    result = execute_python("count = 0\nwhile count < 3:\n    count += 1\nprint(count)")
    assert result["output"] == "3\n"


def test_function_return_value():
    result = execute_python("def add(a, b):\n    return a + b\n\nprint(add(2, 3))")
    assert result["output"] == "5\n"


def test_recursive_function():
    result = execute_python("def fact(n):\n    if n <= 1:\n        return 1\n    return n * fact(n - 1)\n\nprint(fact(5))")
    assert result["output"] == "120\n"


def test_lists_and_dicts():
    result = execute_python("numbers = [1, 2, 3]\nlookup = {'a': 10}\nprint(numbers[1], lookup['a'])")
    assert result["output"] == "2 10\n"


def test_invalid_syntax():
    with pytest.raises(ValueError, match="Syntax error"):
        execute_python("if True:\nprint('oops')")


def test_runtime_exception():
    result = execute_python("items = [1, 2]\nprint(items[10])")
    assert result["status"] == "error"
    assert result["error"] is not None


def test_timeout_handling():
    with pytest.raises(TimeoutError):
        execute_python("while True:\n    pass", timeout_seconds=0.1)


def test_malformed_execute_request():
    response = client.post("/execute", json={"code": ""})
    assert response.status_code == 422


def test_compare_result():
    response = client.post(
        "/compare",
        json={"left_code": "x = 1\nprint(x)", "right_code": "x = 2\nprint(x)"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["summary"]["equal_output"] is False


def test_analyze_code():
    info = analyze_code("x = 1\nif x > 0:\n    print(x)\nfor i in range(3):\n    pass")
    assert info["status"] == "ok"
    assert "x" in info["variables"]
    assert "if" in info["branches"]
    assert "For" in info["loops"] or "for" in info["loops"]
    assert "searching" not in info["concepts"]

    indexed = analyze_code("items = [2, 4]\nfirst = items[0]")
    assert "lists" in indexed["concepts"]
    assert "searching" not in indexed["concepts"]


def test_analyze_code_builds_concept_diagram_and_loop_details():
    info = analyze_code(
        "items = [1, 2]\n"
        "catalog = {'tea': 3}\n"
        "for item in range(3):\n"
        "    if item > 0:\n"
        "        total = item\n"
        "def count_down(n):\n"
        "    if n:\n"
        "        return count_down(n - 1)\n"
        "    return 0"
    )

    assert {"lists", "dictionaries", "loops", "conditions", "functions", "recursion"}.issubset(info["concepts"])
    assert info["loop_details"][0]["iteration_count"] == 3
    assert info["real_world_examples"]
    assert all(example["concept"] not in {"variables", "data-types"} for example in info["real_world_examples"])
    assert info["diagram"][2]["kind"] == "loop"
    assert info["diagram"][2]["children"][0]["kind"] == "condition"


def test_analyze_blocked_file_code_without_allowing_execution():
    source = "with open('notes.txt') as notes:\n    content = notes.read()"

    info = analyze_code(source)

    assert "file-handling" in info["concepts"]
    assert any("open" in item for item in info["unsupported_constructs"])
    with pytest.raises(ValueError, match="disabled"):
        execute_python(source)


def test_analyze_collection_algorithm_oop_and_exception_concepts():
    info = analyze_code(
        "class Record:\n"
        "    pass\n"
        "values = {3, 1, 2}\n"
        "point = (1, 2)\n"
        "ordered = sorted(values)\n"
        "try:\n"
        "    found = 2 in ordered\n"
        "except Exception:\n"
        "    found = False"
    )

    assert {"sets", "tuples", "sorting", "searching", "oop", "exceptions"}.issubset(info["concepts"])
    assert any(example["concept"] == "sets" for example in info["real_world_examples"])


def test_trace_reports_variable_types_and_changes():
    result = execute_python("total = 0\ntotal = total + 1\nprint(total)")
    changed_step = next(
        step for step in result["steps"]
        if any(change["name"] == "total" and change["after"] == 1 for change in step["changed_variables"])
    )

    assert changed_step["variable_types"]["total"] == "int"
    assert changed_step["previous_line"] == 2
    total_change = next(change for change in changed_step["changed_variables"] if change["name"] == "total")
    assert total_change["before"] == 0
