# Architecture

## Frontend

The frontend uses Vite + React to provide a code editor, execution controls, a variable inspector, output logs, and a comparison view. The app fetches data from the FastAPI backend and updates the UI based on the recorded execution trace.

## Backend

The backend acts as the execution engine. It validates submitted Python source, runs the code in a child process, captures line events with Python's tracing API, and returns a structured JSON payload.

## Trace model

Each step includes:

- event type (`line`, `call`, `return`, `exception`)
- source line number
- active function name
- local and global variables
- stack snapshot
- output so far
- explanatory text

## Why multiprocessing

Running user code in a separate process helps keep the main server alive even when a program hangs or loops forever. The backend uses a timeout guard to terminate runaway tasks and return a `408` or timeout error.

## Safety note

This is an educational local prototype. It does not attempt to provide a fully fledged public sandbox. It restricts imports and builtins, but should still only be used on a trusted local machine.
