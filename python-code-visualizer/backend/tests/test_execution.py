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
