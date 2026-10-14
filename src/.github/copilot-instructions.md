# Workspace Setup

- [x] Requirements clarified: Angular scorekeeper with Dutch UI, local persistence, score tracking, and QR/JSON transfer.
- [x] Angular workspace scaffolded in the workspace root; application code is under `src/`.
- [x] Scorecard workflows implemented and documented in `README.md`.
- [x] No additional VS Code extensions are required.
- [x] Production build and unit tests pass.
- [x] Existing npm start task runs the application at `http://localhost:4200/`.
- [x] README and project guidance are current.

## Project Guidance

- Keep Angular application code under `src/` and follow the standalone component structure.
- Keep score calculations in `src/app/score-rules.ts` and cover changes with its unit tests.
- Keep the Dutch user interface and preserve responsive table overflow on narrow screens.
- Persist the active card under `rikken-scorekeeper-v1` and the creation-date-sorted archive under `rikken-scorecards-v1`. Show the archive at startup and preserve existing active cards during migration.
- Confirm before replacing or deleting a card. Deleting a card removes only that card from the archive and active-card storage; it does not trigger JSON export.
- Run `npm test -- --watch=false` and `npm run build` after behavior changes.