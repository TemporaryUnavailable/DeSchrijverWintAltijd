# Feature Specification: Rikken Scorekeeper Completion and Configurable Scorecard UI

**Feature Branch**: `002-configurable-scorecard-ui`

**Created**: 2026-10-07

**Status**: Draft

**Input**: User description: Implement all missing requirements in `docs/missing.md` and `docs/REQUIREMENTS.md`; add named configurable scoring systems selected at scorecard creation and retained for all gifts; use Materialize components and static Material Design 3 baseline colors; keep the UI clean and simple; add a top navbar with shadow level 5, a far-left menu icon, and home navigation; keep a round plus floating action button fixed at the bottom right on the home screen; provide a home side navigation opened from the navbar menu.

## Clarifications

### Session 2026-10-07

- Q: Should the cited scoring rules be active defaults, an unverified editable preset, or omitted until verified? → A: Include them as an editable, unverified preset; require explicit confirmation before automatic scoring uses them, while retaining manual scoring.
- Q: How may custom scoring systems differ? → A: They may change numeric point values only; contract definitions, player roles, and payout mechanics remain fixed.
- Q: Does confirmation of the source-based preset remain valid after its point values are edited? → A: Yes; confirmation remains valid after point values are edited.
- Q: Should confirmation enable automatic scoring for existing games created from an unverified snapshot? → A: No; only games created after confirmation can use automatic scoring. Earlier games remain manual-only.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Maintain Scoring Systems (Priority: P1)

A scorekeeper can create and maintain named scoring systems using the established Rikken contract terminology and their own point values.

**Why this priority**: Every new scorecard needs a chosen rule set, and scorekeepers need to maintain the alternatives available for future games.

**Independent Test**: Create a named scoring system with valid non-default values and verify it can be selected for a new scorecard.

**Acceptance Scenarios**:

1. **Given** the scoring-system maintenance view, **When** the user creates a uniquely named system with valid values, **Then** it is saved and appears in the available systems list.
2. **Given** an existing system, **When** the user edits or removes it, **Then** existing scorecards retain the rules snapshot they already use.
3. **Given** a blank or duplicate name, invalid point values, or an attempt to remove the final available system, **When** the user saves, **Then** the action is rejected with a clear explanation.
4. **Given** the source-based preset has not been confirmed, **When** a user records a gift, **Then** automatic scoring from that preset is unavailable while manual scoring remains available.
5. **Given** a game was created with an unverified source-preset snapshot, **When** the maintained preset is later confirmed, **Then** that existing game remains manual-only and a newly created game can use automatic scoring.

---

### User Story 2 - Create a Flexible Scorecard (Priority: P1)

A scorekeeper starts a four- or five-player game, chooses a scoring system, and sets any player lineup and order using optional remembered-name suggestions.

**Why this priority**: A complete lineup and immutable rules choice are prerequisites for fair, repeatable score entry.

**Independent Test**: Create four- and five-player scorecards with distinct lineups, orders, and scoring systems; verify 100 starting points, expected gift count, and first dealer.

**Acceptance Scenarios**:

1. **Given** at least one available scoring system, **When** a user opens new scorecard setup, **Then** selecting a system is required before creation.
2. **Given** remembered names, **When** the user fills the seats, **Then** suggestions are optional and a different combination and order can be used.
3. **Given** four or five distinct, non-empty player names, **When** the user creates a scorecard, **Then** each player starts at 100, the gift limit is 12 or 15, and the leftmost player deals first.
4. **Given** any blank seat, duplicate name, or unsupported new-game player count, **When** the user tries to start, **Then** creation is prevented and the issue is identified.

---

### User Story 3 - Record Gifts with the Chosen Rules (Priority: P1)

A scorekeeper records a contract, its participants, and its outcome. The scorecard applies its selected scoring system and previews each change before recording.

**Why this priority**: Correct, explainable score changes are the core value of the product.

**Independent Test**: Record representative results for every configured contract under two different systems and compare previews, saved changes, totals, and balance.

**Acceptance Scenarios**:

1. **Given** a scorecard with a chosen system, **When** a user enters a contract and result, **Then** the preview shows the contract, outcome, and score change for each active player using that scorecard's snapshot.
2. **Given** a five-player game, **When** a gift is entered, **Then** the dealer is marked as sitting out, the other four players are active, and the dealer receives zero change.
3. **Given** an unbalanced manual score entry where conservation is required, **When** the user saves, **Then** a warning is shown before accepting the changes.
4. **Given** the maintained system is edited after a game starts, **When** the next gift is scored, **Then** the game continues using its original snapshot.
5. **Given** the gift limit is reached, **When** the user attempts to add a gift, **Then** the action is prevented and the completed standings are shown.

---

### User Story 4 - Correct and Review Game History (Priority: P1)

A scorekeeper can edit a saved gift, undo the latest gift, view the archive, and confirm destructive actions without losing unrelated scorecards.

**Why this priority**: Table play requires safe correction and reliable history.

**Independent Test**: Edit and undo gifts, complete games, reload the app, and delete a game after confirmation; verify totals, dealer order, and unaffected archive entries.

**Acceptance Scenarios**:

1. **Given** a saved gift, **When** the user edits or removes it, **Then** totals, progress, and dealer order are recalculated without changing remaining gift identifiers.
2. **Given** a user requests deletion of a gift or game, **When** the action is destructive, **Then** its consequences are confirmed before data is removed.
3. **Given** all gifts are recorded, **When** the scorecard is opened, **Then** final scores and standings are clearly distinguished from an in-progress game.
4. **Given** a conserved game is complete, **When** standings are shown, **Then** totals sum to 400 for four players or 500 for five players.

---

---

### User Story 6 - Navigate a Clear Table-Ready Interface (Priority: P1)

A scorekeeper can return home, open navigation, start a new scorecard from a persistent floating action button, and scan the score table without clutter.

**Why this priority**: Navigation and score entry must be discoverable and reachable during a game on both phone and desktop.

**Independent Test**: On home and scorecard views, use the navbar, side navigation, and fixed add button; repeat at desktop and Samsung Galaxy A54 portrait widths while scrolling.

**Acceptance Scenarios**:

1. **Given** any application view, **When** the user activates the far-left menu icon, **Then** the side navigation opens with a home destination and scoring-system settings.
2. **Given** the side navigation is open, **When** the user selects home, **Then** the scorecard archive/home screen is shown.
3. **Given** the home screen is scrolled vertically, **When** the user moves the page, **Then** a round plus floating action button remains fixed at the bottom right and starts new scorecard setup.
4. **Given** the top navbar is visible, **When** it is reviewed, **Then** it has the requested level-5 shadow treatment and the menu control is at the far left.
5. **Given** a four- or five-player scorecard at the phone reference size, **When** it is viewed, **Then** all player columns fit without horizontal scrolling and vertical scrolling remains usable.
6. **Given** any view is displayed, **When** it is used, **Then** labels are Dutch and use Rikken terminology; standard components use Materialize patterns and colors use fixed Material Design 3 baseline roles.

---

### Edge Cases

- The user leaves a player seat empty, enters duplicate names, selects more than five or fewer than four new-game players, or changes lineup order.
- A scoring system has a blank or duplicate name, invalid point values, fractional equal shares, or changes while games reference it.
- A contract is not configured or not verified; the system must not invent automatic values and manual scoring remains possible.
- The dealer wraps from the last seat to the first; five-player dealers sit out every gift without score changes.
- A gift is edited or removed from the middle of the history, or a game reaches its 12/15 gift limit.
- Existing migrated archive entries have more than five players; they remain readable as display-only legacy history and cannot receive new gifts.
- Browser storage is unavailable, full, or fails during migration or save; data is not falsely reported as persisted.
- A game is deliberately copied; the copied game and gifts receive new GUIDs.
- The viewport is narrow or the page is scrolled; no horizontal page overflow occurs and the home floating action button remains fixed.

## Requirements *(mandatory)*

### Functional Requirements

#### Scoring Systems

- **FR-001**: The system MUST provide a maintenance view for creating and editing multiple named scoring systems using shared Rikken contract terminology. Systems MAY change numerical point values only; contract definitions, participant roles, outcome patterns, multipliers, and payout allocation MUST remain fixed.
- **FR-002**: Each scoring system MUST define whole-number point values for supported contract outcomes and MUST reject blank/duplicate names and fractional or non-conserving values with a clear explanation. Values MUST preserve the fixed scoring relationships in FR-011 and FR-012.
- **FR-003**: At least one scoring system MUST remain available. Removing a system MUST require confirmation and MUST NOT change any existing scorecard's rules snapshot.
- **FR-004**: Creating a scorecard MUST require selection of an available scoring system and MUST store its name and complete rules snapshot. Every gift on that card MUST use that snapshot regardless of later edits or removal of the source system.

#### Setup and Game Progress

- **FR-005**: New games MUST have exactly four or five distinct named players; all seats MUST be filled before creation. Previously used names MUST be optional suggestions and MUST NOT constrain the lineup or order.
- **FR-006**: Each player MUST start at 100 points. Four-player games MUST allow 12 gifts and five-player games 15 gifts, show progress, prevent gifts beyond the limit, and display final scores and standings on completion.
- **FR-007**: The leftmost player MUST deal first; the dealer MUST advance one seat after every gift and wrap after the final seat.
- **FR-008**: In five-player games the dealer MUST be excluded from play and scoring for that gift; the other four are active and the dealer's change is zero.
- **FR-009**: Migrated six- or seven-player archive entries MUST remain readable as display-only history and MUST NOT be treated as valid new games or enter automatic scoring.

#### Scoring and Corrections

- **FR-010**: Automatic scoring MUST be available for Rik/Afrik, Troel, Abondance, one-player Miserie, two-player Miserie, Open Miserie, 13 slagen, Solo slim, and Verzaking when the selected scoring system has configured rules for the outcome. The source-based preset MUST follow the confirmation restriction in FR-011.
- **FR-011**: The system MUST provide the source-based scoring values below as an editable preset marked unverified. Automatic scoring MUST NOT use this preset until a user explicitly confirms its values; manual scoring MUST remain available. Once confirmed, the preset MUST remain confirmed if its point values are edited. A game created while the preset is unverified MUST remain manual-only even if the maintained preset is confirmed later; only games created after confirmation MAY use automatic scoring. The preset values MUST follow the Rik/Afrik table and contract payouts below. Custom systems MAY change numerical values while preserving these mappings: each Rik/Afrik trick result MUST give each rikker the table's value and each opponent its equal-and-opposite value; Troel MUST double the corresponding Rik/Afrik values; and Abondance, one-player Miserie, Open Miserie, 13 slagen, and Solo slim MUST award the configured contract value to the soloist on success and charge one third to each of the three opponents, with all changes reversed on failure.

| Rik/Afrik tricks taken by rikkers | Each rikker | Tricks taken by opponents | Each opponent |
| ---: | ---: | ---: | ---: |
| 13 | +7 | 0 | -7 |
| 12 | +6 | 1 | -6 |
| 11 | +5 | 2 | -5 |
| 10 | +4 | 3 | -4 |
| 9 | +3 | 4 | -3 |
| 8 | +2 | 5 | -2 |
| 7 | -3 | 6 | +3 |
| 6 | -4 | 7 | +4 |
| 5 | -5 | 8 | +5 |
| 4 | -6 | 9 | +6 |
| 3 | -7 | 10 | +7 |
| 2 | -8 | 11 | +8 |
| 1 | -9 | 12 | +9 |
| 0 | -10 | 13 | +10 |

- **FR-012**: Two-player Miserie MUST support both players failing (each receives the negative configured amount; each other active player receives the positive amount), one succeeding and one failing (the successful player receives the positive amount, the failing player receives the negative amount, and the other active players receive zero), and both succeeding (each receives the positive amount; each other active player receives the negative amount). The amount MUST be configurable while these outcome and role mappings remain fixed.
- **FR-013**: Configured contract outcomes MUST conserve points across active players where required. Unconfigured or unverified outcomes MUST be identified and MUST NOT receive invented automatic values.
- **FR-014**: Before a gift is recorded, the system MUST preview its contract, outcome, and each player's score change. Manual per-player score entry and corrections MUST remain available; unbalanced manual changes MUST trigger a warning before saving.
- **FR-015**: Users MUST be able to edit a saved gift and undo the most recent gift. Gift deletion MUST require confirmation. Recalculation MUST preserve remaining GUIDs and MUST NOT duplicate score changes.

#### History and Persistence

- **FR-016**: Games MUST save automatically in browser storage, restore after reopening, and report unavailable storage or failed saves. The user MUST be told local data may be lost when site data is cleared or devices change.
- **FR-017**: The archive MUST list games newest first and allow viewing, editing, and confirmed deletion. It MUST identify each game's selected system and any manual corrections.
- **FR-018**: Every game and gift MUST have a unique stable GUID that survives edits, saves, and reloads.

#### Interface and Delivery

- **FR-022**: The interface MUST use Materialize component patterns and fixed Material Design 3 baseline color roles. Color selection MUST be static, not generated from runtime user/device input.
- **FR-023**: A navbar MUST appear at the top, provide home navigation, show a menu icon at the far left, and have the requested shadow level 5.
- **FR-024**: The menu icon MUST open a side navigation containing a home destination and scoring-system settings. Selecting home MUST show the archive/home screen.
- **FR-025**: The home screen MUST provide a round plus floating action button at the bottom right that remains fixed while the page scrolls and opens new scorecard setup. The plus MUST be text or a recognized icon, never an emoji, and the control MUST have an accessible name.
- **FR-026**: The score table MUST show players as columns and gifts as rows, identify the dealer, distinguish a five-player dealer sitting out, and use Dutch Rikken terminology with clear accessible labels.
- **FR-027**: At Samsung Galaxy A54 portrait dimensions, all five player columns MUST fit without horizontal scrolling; vertical scrolling MUST work on the home and game views.
- **FR-028**: The delivered experience MUST include automated unit tests for every game-related functional requirement and specified edge case, including scoring outcomes, systems/snapshots, setup, dealer/sit-out, limits, corrections, persistence/migration, and GUIDs. Browser layout tests MAY supplement but MUST NOT replace domain unit tests.
- **FR-029**: The README MUST document supported prerequisites, install/reproducible install, development, tests, production build/deployment and SPA fallback, local-data limitations, and Dutch walkthroughs for setup, scoring, corrections, and history.
- **FR-030**: Normal use MUST require no account, server-side database, or network. Required styling, components, icons, and fonts MUST be bundled locally.

### Key Entities

- **Scoring System**: Named, maintained values for stable Rikken contract terminology and outcomes.
- **Rules Snapshot**: Immutable copy of the selected system's name, revision, and complete values embedded in a scorecard.
- **Game**: One four- or five-player session, ordered players, selected rules, gifts, progress, and completion state.
- **Player**: A named seat with stable GUID and running total.
- **Gift**: Ordered game event containing dealer, contract, outcome, stable GUID, and player changes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can create four-player and five-player scorecards, complete exactly 12 or 15 gifts, and reach final standings.
- **SC-002**: In all defined outcomes, the preview and saved changes match the selected system; every conserved gift's changes sum to zero across active players.
- **SC-003**: 100% of game-related requirements and specified edge cases produce their expected state and scoring result during acceptance validation.
- **SC-004**: Reloading a game preserves its players/order, rules snapshot, gifts, IDs, totals, progress, and next dealer with no repeated score changes.
- **SC-005**: All five score columns fit the reference phone viewport without horizontal scrolling, and the floating action button remains visible at a fixed bottom-right position while scrolling.
- **SC-006**: A user can open the home menu and reach the home screen or scoring-system settings in one selection; the fixed add button opens scorecard setup in one selection.
- **SC-007**: Invalid system names/values and incomplete lineups are rejected with a clear explanation and leave existing saved games unchanged.
- **SC-008**: A new user can follow the README to install, run, test, build, deploy, and complete the principal Dutch-language scorekeeping workflows.

## Assumptions

- An editable, source-based scoring preset is available initially but remains unverified and unavailable for automatic scoring until explicitly confirmed; confirmation remains valid after value edits, but only games created after confirmation can use automatic scoring; names are unique without regard to case; at least one system remains selectable.
- Editing a maintained system affects future games only. Each existing card retains its complete rules snapshot.
- Custom values must produce whole-number changes and conserve scores where required. Unsupported Verzaking values are configurable only when confirmed; the app does not invent automatic rules.
- Existing six- or seven-player records are legacy display-only archive entries; new games remain limited to four or five players.
- The home/archive screen is the destination for the navbar's home action. The side navigation exposes home navigation, scoring-system settings, and handedness preferences.
- The plus action is fixed to the viewport bottom-right on the home screen and may account for mobile safe-area insets while remaining reachable.
- Static Material Design 3 baseline roles define the color palette; Materialize component patterns provide the specified interface components. No runtime-generated theme is required.
- The product remains a private browser-local scorekeeper for one table session; accounts, cloud sync, and multi-table rotation are out of scope.
