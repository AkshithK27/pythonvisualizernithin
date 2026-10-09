from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.models import AnalyzeRequest, CompareRequest, ExecuteRequest
from app.tracing.trace_engine import analyze_code, execute_python

app = FastAPI(title="Python Code Visualizer", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root() -> dict:
    return {
        "message": "Python Code Visualizer API is running",
        "endpoints": ["/health", "/execute", "/analyze", "/compare"],
    }


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "python-code-visualizer"}


@app.post("/execute")
def execute(request: ExecuteRequest) -> dict:
    try:
        result = execute_python(request.code, timeout_seconds=request.timeout_seconds)
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except TimeoutError as exc:
        raise HTTPException(status_code=408, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/analyze")
def analyze(request: AnalyzeRequest) -> dict:
    try:
        return analyze_code(request.code)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/compare")
def compare(request: CompareRequest) -> dict:
    try:
        left = execute_python(request.left_code, timeout_seconds=request.timeout_seconds)
        right = execute_python(request.right_code, timeout_seconds=request.timeout_seconds)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except TimeoutError as exc:
        raise HTTPException(status_code=408, detail=str(exc)) from exc

    summary = {
        "left_output": left.get("output", ""),
        "right_output": right.get("output", ""),
        "left_error": left.get("error"),
        "right_error": right.get("error"),
        "left_steps": len(left.get("steps", [])),
        "right_steps": len(right.get("steps", [])),
        "equal_output": left.get("output", "") == right.get("output", ""),
        "equal_final_variables": left.get("final_variables", {}) == right.get("final_variables", {}),
    }
    return {
        "status": "ok",
        "left": left,
        "right": right,
        "summary": summary,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
