# Python Code Visualizer

A beginner-friendly educational web application for understanding Python execution step by step. The platform executes user code in a controlled backend, captures trace events, and presents a simple visual analysis in a React frontend.

## Architecture overview

- Frontend: Vite + React for the editor, step controls, variable inspector, and comparison panels.
- Backend: FastAPI API for health checks, code execution, analysis, and comparison.
- Tracing engine: Python `sys.settrace` with multiprocessing-based isolation and a safe serializer.
- Tests: backend test suite using pytest and FastAPI TestClient.

## Project structure

```text
python-code-visualizer/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── models.py
│   │   ├── tracing/
│   │   │   └── trace_engine.py
│   │   └── services/
│   ├── tests/
│   │   └── test_execution.py
│   ├── requirements.txt
│   └── main.py
├── docs/
│   ├── architecture.md
│   ├── api.md
│   └── security.md
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       └── styles.css
├── .gitignore
├── README.md
├── run.bat
└── tests/
    └── test_notes.txt
```

## Features

- Real Python execution with trace capture.
- Step backward and forward through execution snapshots.
- Variable inspector and call-stack display.
- Output and error visualization.
- Example code loader and comparison panel.
- Beginner-friendly execution explanations.
- Local-only educational prototype with honest security limits.

## Windows VS Code setup

1. Install Python 3.11+ and Node.js 18+.
2. Open the project folder in VS Code.
3. Open a terminal in the project root.
4. Create a virtual environment:

```bat
cd python-code-visualizer
py -m venv .venv
```

5. Activate the environment in PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

6. Install backend dependencies:

```bat
python -m pip install -r backend\requirements.txt
```

7. Start the backend server:

```bat
python -m uvicorn app.main:app --app-dir backend --reload --host 127.0.0.1 --port 8000
```

8. Open a second terminal and install frontend dependencies:

```bat
cd frontend
npm install
npm run dev
```

9. Open the frontend in your browser at http://localhost:5173.
10. The API health check is available at http://127.0.0.1:8000/health.

## Running tests

```bat
cd backend
..\.venv\Scripts\python.exe -m pytest tests -q
```

## Important security note

This is a local educational prototype, not a publicly exposed sandbox. The backend intentionally runs code in a separate process, but it is still a local-development tool and should not be used for untrusted submissions or public internet deployment.

## Limitations

- Imports are disabled in this educational version.
- The tracer captures line-by-line execution rather than every bytecode event.
- Advanced Python features such as networking, filesystem access, and arbitrary imports are intentionally unsupported.

## Final note

This MVP prioritizes working execution, predictable API contracts, and a clean learning flow over full-language sandboxing.
