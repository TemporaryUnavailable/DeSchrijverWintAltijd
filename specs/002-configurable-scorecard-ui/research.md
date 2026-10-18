# Research: Rikken Scorekeeper Completion and Configurable Scorecard UI

## Decision 1: Match Dependencies to the Locked Angular Runtime

**Decision**: Keep Angular 22.2, TypeScript 6, and Angular CLI/Vitest. Add locally bundled Materialize CSS, Angular Material M3, and Lucide Angular at mutually compatible stable versions; verify peer dependencies against the installed Angular major and commit the lockfile. Set the supported Node range to `^22.22.3 || ^24.15.0 || >=26.0.0`, matching the Angular 22.2 lockfile engines, and update the README's stale Node 20.19 prerequisite.

**Rationale**: The lockfile requires that Node range for Angular 22.2 packages; the existing README's Node 20.19 claim is too low. The feature and constitution require UI assets bundled locally.

**Alternatives considered**: Retain Node 20.19 because the current README says so (rejected: incompatible with locked Angular engine requirements); load CSS/icons from a CDN (rejected: violates local-first/offline requirements); use a different app framework (rejected: existing Angular app and specification).

## Decision 2: Respect the Materialize and M3 Ownership Boundary

**Decision**: Use Materialize CSS and its layout patterns for the navbar, sidenav, floating-action-button placement, and responsive layout; use Angular Material M3 for standard interactive controls where its patterns conflict with Materialize. Keep M3 baseline roles static, bundle all styles locally, and use Lucide Angular for selected action icons.

**Rationale**: The feature requests Materialize and a fixed M3 palette. Constitution Principle IV specifically requires Materialize for locally bundled layout styling and Angular Material M3 for standard interactive components where the systems conflict.

**Alternatives considered**: Materialize-only interactive components (rejected where they conflict with the constitution's M3 component requirement); Angular Material-only (rejected because Materialize remains a feature and constitution requirement); runtime-generated theming (rejected by the spec).

## Decision 3: Extend Existing Domain and Persistence Boundaries

**Decision**: Keep `GameService` responsible for game lifecycle, dealer progression, and corrections; add focused scoring-system/rules logic for validation and score calculation; keep `GameRepository` responsible for local storage and migration. Decompose the root component into presentation/workflow components rather than adding more workflows to `App`.

**Rationale**: Repository inspection and a source-wide search confirmed production localStorage writes and serialization are confined to `GameRepository`. This is the smallest existing ownership boundary for persistence and migration. Current `App` owns setup, archive, scoring entry, and navigation decisions, so presentation decomposition is justified by concrete cohesion needs.

**Alternatives considered**: Rewrite the application or add a backend (rejected: unnecessary and violates local-first scope); put all new behavior in `App` (rejected: expands the existing workflow concentration); introduce multiple new projects/packages (rejected: no need for a new deployment boundary).

## Decision 4: Migrate Existing Games Without Inventing Their Rules

**Decision**: On startup, migrate the current version-1 active-game and archive envelopes into a version-2 local state only after validating the complete migrated payload and successfully writing it. Preserve the original v1 keys until the v2 write succeeds. Merge matching active/archive IDs using the active record as the current repository does, and retain valid distinct games. Preserve each old round's ID, dealer, and signed score deltas exactly. Represent old cards without contract inputs or rules snapshots as manual-only legacy cards; six- and seven-player cards remain display-only. Do not backfill unverifiable contract/rule data.

**Rationale**: Version-1 games store only player records, round score deltas, optional dealer IDs, and timestamps. They have no contract result or rules snapshot from which an automatic-scoring history can be reconstructed. The current archive may include up to seven players.

**Alternatives considered**: Reinterpret old score deltas as a verified default rules system (rejected: invents history); discard old keys after parsing but before a successful v2 write (rejected: risks data loss); reject all old records (rejected: violates readable-history requirement).

## Decision 5: Score from Immutable Snapshots and Preserve Legacy Deltas

**Decision**: New games require a selected scoring-system snapshot containing its name, revision/identity, numeric configuration, and source-preset verification status. The cited source system begins unverified and is manual-only until first confirmed; per the clarification, later numeric edits do not revoke the maintained system's confirmation. Verification is captured in each game snapshot at creation: a game created while the preset is unverified remains manual-only after later confirmation, while new games created afterward may use automatic scoring. User-created systems may change numeric values only and keep the established contract, roles, outcomes, multipliers, and allocation patterns. Store gift input and applied score changes; use the game's snapshot for previews and automatic changes. Existing cards retain their recorded deltas and are not auto-recalculated.

**Rationale**: This follows the three accepted clarifications and constitution Scoring Integrity. Values for unverified outcomes, including Verzaking until its automatic rules are verified/configured, must not be invented.

**Alternatives considered**: Treat source rules as active defaults (rejected by clarification); make approval expire after edits (rejected by clarification); make role mappings freely configurable (rejected by clarification); rewrite historical gifts when a catalog is edited (rejected by snapshot integrity).

## Decision 6: Test Domain Rules and State at the Owning Boundary

**Decision**: Put scoring, validation, migration, dealer, correction, and ID tests beside their domain services using the existing Vitest setup. Keep component tests for workflows and accessibility; add a browser viewport check for Galaxy A54 portrait fit and fixed FAB behavior. Update the README with accurate runtime, reproducible install, build/deploy, camera, privacy, and Dutch workflow instructions.

**Rationale**: The constitution requires unit-test coverage for every game-related requirement and edge case; browser tests cannot replace this domain coverage. Existing project testing uses Angular CLI's Vitest builder.

**Alternatives considered**: Only test through UI or browser flows (rejected: fails constitution coverage); create a separate test project (rejected: existing colocated test convention is sufficient).
