# Optional end-to-end smoke test (not part of the app)

Renders the real CleanConnect UI (navigation, every route, every role) in jsdom against a **stubbed API** and drives
the main workflows: login/logout, mobile menu, reporting an issue, assigning a task, the staff → admin maintenance
cycle, toilet-request review, staff creation, reviews, and the health card. It never contacts your backend or database.

```powershell
cd frontend
npm install --no-save jsdom@24      # test-only; package.json is not modified
node _e2e-harness/run.cjs
```
Expected last line: `23/23 scenarios passed`.

Limits: jsdom has no layout engine, so this checks structure, behaviour and accessibility attributes — not how the page
looks. The data is fake and lives in `helpers.tsx`. Delete this folder any time; nothing depends on it.
