# TODO - Live updates for cards

- [x] Identify existing frontend polling logic in `frontend/src/App.jsx`.
- [x] Verify backend endpoint provides `/system-info` JSON (`backend/main.py` + `backend/system_scanner.py`).
- [x] Fix frontend backend URL construction to avoid stale/incorrect `localhost` usage.
- [ ] Confirm all card metrics update correctly every poll (CPU/memory/storage/GPU/OS).
- [ ] Ensure CORS and port configuration allow frontend fetch.
- [ ] (If still failing) implement SSE/WebSocket streaming or re-check response shape.

