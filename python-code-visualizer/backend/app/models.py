from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class ExecuteRequest(BaseModel):
    code: str = Field(..., min_length=1, max_length=12000)
    timeout_seconds: float = Field(default=5.0, ge=0.1, le=30.0)


class CompareRequest(BaseModel):
    left_code: str = Field(..., min_length=1, max_length=12000)
    right_code: str = Field(..., min_length=1, max_length=12000)
    timeout_seconds: float = Field(default=5.0, ge=0.1, le=30.0)


class AnalyzeRequest(BaseModel):
    code: str = Field(..., min_length=1, max_length=12000)


class TraceResult(BaseModel):
    status: str
    steps: List[Dict[str, Any]]
    output: str
    error: Optional[str] = None
    final_variables: Dict[str, Any]
    execution_time_ms: int


class ComparisonResult(BaseModel):
    status: str
    left: TraceResult
    right: TraceResult
    summary: Dict[str, Any]
