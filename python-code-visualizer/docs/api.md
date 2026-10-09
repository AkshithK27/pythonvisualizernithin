# API Documentation

## GET /

Returns a simple status message and available endpoints.

## GET /health

Returns:

```json
{"status":"ok","service":"python-code-visualizer"}
```

## POST /execute

Request:

```json
{
  "code": "x = 5\nprint(x)",
  "timeout_seconds": 5
}
```

Response:

```json
{
  "status": "ok",
  "steps": [
    {"event_type": "line", "line": 1, "locals": {"x": 5}, "stack": ["global"], "output": ""}
  ],
  "output": "5\n",
  "error": null,
  "final_variables": {"x": 5},
  "execution_time_ms": 4
}
```

## POST /analyze

Returns a high-level summary of program structure such as variables, loops, functions, and branches.

## POST /compare

Compares two execution traces and returns a summary of output equality and variable equality.
