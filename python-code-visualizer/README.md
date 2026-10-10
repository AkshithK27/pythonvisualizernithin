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

- Python-aware CodeMirror editor with source-line highlighting synchronized to trace steps.
- Real Python traces with call stacks, variable values/types, detected changes, console output, and errors.
- Previous, next, play, pause, restart, and adjustable execution-speed controls.
- AST-derived control-flow diagrams for assignments, branches, loops, functions, classes, and returns; diagram nodes can select trace lines.
- Live concept analysis, code-matched real-world mappings, list/dictionary memory cells, and relevant W3Schools/GeeksforGeeks resources.
- Adaptive original practice questions and independent GATE CS subject practice, with difficulty filters, explanations, and locally saved score totals. Questions are not represented as official or verified previous-year questions.
- Dark and light themes with saved user preference and operating-system theme used when no choice is saved.
- Example loader and what-if comparison panel.

## Quick Start in VS Code (Windows)

### Prerequisites

- Git
- Python 3.11 or newer
- Node.js 20.19+ or 22.12+ (required by Vite 8)
- VS Code

### Get the project

In a VS Code terminal, clone the repository and enter its folder:

```powershell
git clone https://github.com/AkshithK27/pythonvisualizernithin.git
Set-Location pythonvisualizernithin
```

If you already opened the project folder in VS Code, skip the clone commands. Run the following from the project root to create the Python environment and install backend dependencies:

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
```

### Start the application

Open a terminal in VS Code for the backend and run:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --reload --host 127.0.0.1 --port 8000
```

Open a second terminal for the frontend:

```powershell
Set-Location frontend
npm install
npm run dev
```

Open http://127.0.0.1:5173 in your browser. Keep both terminals open while using the visualizer. The backend health check is http://127.0.0.1:8000/health.

For a one-click Windows launch, run `run.bat` from the project root. It starts the API and frontend in separate terminals.

The frontend uses `http://127.0.0.1:8000` by default. Set `VITE_API_BASE_URL` before starting Vite to use another local API URL.

## Running tests

```bat
cd backend
..\.venv\Scripts\python.exe -m pytest tests -q
```

## Important security note

This is a local educational prototype, not a hardened security sandbox. Execution uses a separate process, restricted builtins, blocked imports/introspection, and a timeout, but Python process isolation alone is not a security boundary. Do not expose the API publicly or use it for untrusted submissions. AST analysis is read-only and may explain code that execution policy rejects; the UI reports unsupported constructs.

## Limitations

- Imports are disabled in this educational version.
- The tracer captures line-by-line execution rather than every bytecode event.
- Filesystem access, networking, and arbitrary imports are disabled during execution. External resource links require internet access.
- Exact loop counts are shown only for statically known iterables and `range` arguments.
- Practice questions are original local material, not verified official GATE previous-year questions.

## Final note

This MVP prioritizes working execution, predictable API contracts, and a clean learning flow over full-language sandboxing.
