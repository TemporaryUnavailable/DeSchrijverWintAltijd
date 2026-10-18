# Quickstart: Rikken Scorekeeper Feature

## Prerequisites

- Node.js matching the Angular 22.2 package engine range: `^22.22.3 || ^24.15.0 || >=26.0.0`.
- npm 11.19 (the repository's `packageManager` version).
- A current desktop or mobile browser.

The current README claims Node.js 20.19+, but this is not compatible with the locked Angular 22.2 dependencies. Update the README and development setup documentation to match the package lock.

## Install and Run

From the Angular project directory:

```powershell
Set-Location src
npm ci
npm start
```

Open `http://localhost:4200/`. Required Angular Material M3, Materialize CSS, and Lucide Angular dependencies must be installed at stable versions compatible with Angular 22.2 and committed in `package-lock.json`; after changing dependencies, verify a clean `npm ci` install.

## Tests and Build

```powershell
npm test -- --watch=false
npm run build
```

The domain unit suite must cover scoring calculations and validation, scoring-system snapshots/verification, 4/5-player setup, remembered names, dealer rotation/sit-out, limits, edits/undo, storage migration/failures, and stable IDs. Component/browser checks additionally verify Dutch labels, the home menu, fixed FAB while scrolling, and five-column fit at Samsung Galaxy A54 portrait dimensions.

## Manual Acceptance Sequence

1. Create a custom scoring system by changing numeric values only; verify contract roles and outcome patterns remain fixed.
2. Leave the source preset unverified, create a game, and record manual score changes. Confirm the preset, create another game, and verify only the newly created game's snapshot enables automatic scoring. Edit the confirmed preset and verify its confirmed status remains set.
3. Record and preview every configured contract outcome; verify whole-number changes, required conservation, dealer zero-change in five-player games, and correct 12/15 gift limits.
4. Edit and remove gifts, undo the latest gift, and verify totals/dealer order recalculate while remaining gift GUIDs stay unchanged.
5. Start with seeded v1 active/archive data and verify migration preserves IDs and signed deltas, leaves source keys if migration fails, and does not invent historical contract data. Six/seven-player legacy cards remain display-only.
6. Reload the app during an in-progress game and verify that recorded score changes are not applied twice.
7. At phone width, scroll the archive and scorecard; confirm there is no horizontal page/table scrolling and the home plus FAB stays at the bottom right.

## Deployment

Build the static SPA with `npm run build`. Deploy the Angular CLI output directory (`dist/scorekeeper/browser` unless the build configuration changes) to a static host configured to serve `index.html` for application routes. All application assets remain local; no backend or CDN is required.

## Documentation Follow-up

Update `src/README.md` to replace the stale Node prerequisite and cover `npm ci`, testing, production deployment/SPAs, local storage limitations, and the Dutch setup/scoring/correction/history workflows.
