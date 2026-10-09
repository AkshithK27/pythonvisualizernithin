# Security and Reliability

## Local-only use

The application is designed for local educational use only. It should not be exposed to public internet access.

## Current mitigations

- Code is validated using Python's AST.
- Imports are blocked.
- A restricted builtins dictionary is used.
- Execution runs in a separate child process.
- A timeout guard terminates runaway programs.

## Remaining limitations

- This is not a full sandbox.
- User code still runs with the Python interpreter available on the host.
- Public internet deployment would require a hardened container, OS-level sandboxing, and strict resource limits.

## Recommendations for production use

- Run the backend inside a container or VM.
- Disable filesystem and network access for worker processes.
- Use CPU, memory, and process quotas.
- Keep the API bound to localhost or a private network.
- Keep user code and traces private unless the user explicitly chooses to save them.
