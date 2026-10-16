# Implementation Plan: Rikken Scorekeeper Completion and Configurable Scorecard UI

**Branch**: `002-configurable-scorecard-ui` | **Date**: 2026-10-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-configurable-scorecard-ui/spec.md`

## Summary

Extend the current Angular scorekeeper with named configurable scoring systems and immutable per-game rules snapshots; contract scoring and previews; safe corrections, local persistence migration, and validated JSON backup/restore; and table-ready navigation and responsive UI. Keep the app local-first and build on the existing repository and transfer-service boundaries.

## Technical Context

**Language/Version**: TypeScript 6.0; Angular 22.2; Node.js `^22.22.3 || ^24.15.0 || >=26.0.0`; npm 11.19.

**Primary Dependencies**: Existing Angular standalone app, RxJS, and Vitest; add Angular Material M3 at a version compatible with the installed Angular major, locally bundled Materialize CSS, and Lucide Angular icons. Lock compatible stable versions in `package-lock.json` and use `npm ci` after dependency setup.

**Storage**: Browser `localStorage`, currently split across version-1 active-game and archive envelopes. Add validated, versioned migration to the expanded game/scoring model; preserve source data until migration is durably written and report storage failures.

**Testing**: Angular CLI unit-test builder with Vitest. Domain services and migration/transfer validators receive focused unit tests; component tests cover setup, scoring, navigation, import preview, and accessibility. Phone-width behavior is checked in browser tests.

**Target Platform**: Static Angular SPA on current desktop/mobile browsers. No application server or network connection for normal use.

**Project Type**: Existing single-project Angular web application under `src/`.

**Performance Goals**: No remote calls or formal throughput SLO. Rules operate over at most five active players and 15 gifts; previews and score updates must remain immediate during table use.

**Constraints**: Local-only game data; fixed static Material Design 3 baseline roles; Materialize bundled for layout and navbar/sidenav/FAB patterns; Angular Material M3 for standard interactive controls where patterns conflict; Dutch Rikken labels; no horizontal overflow at Samsung Galaxy A54 portrait width; new games have four or five players; legacy six/seven-player entries remain display-only; assets bundled locally.

**Scale/Scope**: One local scorekeeper and table session at a time, with multiple archived games; 4-5 players and 12/15 gifts for playable games; retain readable legacy archive records up to seven players.

## Constitution Check

*Initial gate before Phase 0: PASS. Post-design recheck after Phase 1: PASS.*

- **Scoring integrity — PASS**: New games keep a full immutable rules snapshot. Gifts keep stable IDs, typed inputs, and applied changes; corrections recompute using the same snapshot. Legacy games retain their recorded manual deltas and are not auto-scored.
- **Local-first privacy — PASS**: Persistence and backup processing stay in browser storage. Imports validate and preview before save, ID conflicts never silently overwrite, destructive actions confirm, and storage failures are surfaced.
- **Game requirement unit tests — PASS**: Every game requirement and edge case maps to domain unit-test groups; UI/browser tests supplement rather than replace domain coverage.
- **Material Design usability — PASS**: Materialize is locally bundled for layout and navbar/sidenav/FAB patterns; Angular Material M3 supplies standard interactive controls where patterns conflict. Static baseline roles, Dutch labels, accessible names, and phone-width table behavior are explicit.
- **Angular architecture — PASS**: Models define game/rule/transfer data; cohesive services own scoring, repository/migration, names, and transfer; components own presentation and interaction. The root component is decomposed rather than expanded.

No constitution deviations are required. The post-design recheck is recorded after the Phase 1 artifacts are completed.

## Project Structure

### Documentation (this feature)

```text
specs/002-configurable-scorecard-ui/
├── contracts/score-transfer-v2.schema.json
├── data-model.md
├── plan.md
├── quickstart.md
└── research.md
```

### Source Code (repository root)

```text
src/
├── package.json
├── package-lock.json
├── README.md
└── src/
    ├── styles.css
    └── app/
        ├── app.ts
        ├── components/            # Archive, setup, scoring, table, navigation, transfer UI
        ├── models/                # Game, scoring-system, gift, snapshot, transfer types
        ├── services/              # Scoring, repository/migration, names, transfer use cases
        └── *.spec.ts              # Focused Vitest domain and component tests
```

**Structure Decision**: Keep the existing Angular project under `src/` and its `src/src/app/models`, `services`, and colocated `*.spec.ts` conventions; add cohesive presentation components without adding a backend or new workspace project. Feature planning artifacts and the transfer schema live under the feature directory.

## Requirement-to-Test Map

| Spec requirements | Primary automated coverage |
|---|---|
| FR-001–004; Story 1 | `scoring-system.service.spec.ts`: create/edit/delete, names/value validation, final-system guard, source preset confirmation, confirmation persistence after edits, rules snapshots, and non-retroactive confirmation. |
| FR-005–009; Story 2 | `game.service.spec.ts` and `game-repository.service.spec.ts`: four/five distinct filled seats, free lineup/order, remembered suggestions, 100-point start, limits, first dealer, rotation/wrap, five-player sit-out, and six/seven-player legacy display-only migration. |
| FR-010–015; Story 3–4 | `scoring.service.spec.ts` and `game.service.spec.ts`: every configured contract result, Troel multiplier, role allocation, conservation, unverified/manual fallback, preview deltas, manual imbalance warning state, gift edit/delete/undo, recalculated totals/dealer order, stable remaining gift IDs, and completion standings. |
| FR-016–018; Story 4–5 | `game-repository.service.spec.ts`: reload, newest-first archive, selected-system/correction metadata, source-preserving v1 migration, active/archive merge, localStorage unavailable/quota/write failures, and stable IDs through save/reload. |
| FR-019–021; Story 5 | `score-transfer.service.spec.ts` and repository tests: v1/v2 parse, schema/domain validation, preview data, invalid version/payload, archive-wide duplicate ID conflict, explicit copy with regenerated IDs, backup restore, and midgame resume without replay. |
| FR-022–027; Story 6 | Component tests for Materialize/M3 patterns, static palette roles, navbar/menu/home, accessible fixed plus FAB, Dutch labels, table dealer/sit-out state; browser viewport test for five-column fit, vertical scroll, fixed FAB, and no horizontal overflow at Galaxy A54 portrait dimensions. |
| FR-028–030; Success Criteria | `npm test -- --watch=false` is a release gate; production build and local asset/network checks cover deployment and offline constraints; README acceptance review covers prerequisites, install, workflows, camera/HTTPS, local-data caveat, and SPA fallback. |

All listed domain edge cases are asserted in unit tests at their owning service boundary; browser tests supplement but do not replace those tests. Named test files are implementation targets and should follow the existing colocated Vitest convention.

## Complexity Tracking

No violations.
