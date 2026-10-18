# Data Model: Rikken Scorekeeper

## Entities

### ScoringSystem

A maintained named numeric configuration used as the source for a new game's immutable snapshot.

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | Stable identifier for the maintained system. |
| `name` | string | Trimmed, non-empty, unique without regard to Dutch-locale case folding. |
| `revision` | positive integer | Increments when numeric values change. |
| `kind` | `source-preset` or `custom` | The source preset begins unverified; custom systems are user-authored. |
| `verification` | `unverified` or `confirmed` | Applies to the source preset. Confirmation remains true after numeric edits, as clarified. |
| `values.rikAfrik` | 14 signed integers | One value per rikkers' trick count from 13 down to 0; each opponent's value is its exact negation. |
| `values.soloContracts` | map of contract to positive integer | Values for Abondance, one-player Miserie, Open Miserie, 13 slagen, and Solo slim. Each must divide evenly among the three opponents. |
| `values.twoPlayerMiserie` | positive integer | Amount used by the three fixed two-player Miserie outcomes. |
| `values.verzaking` | absent / manual-only | No automatic value or payout mechanics are inferred until verified and configured. |

The contract definitions, participant roles, outcome patterns, Troel multiplier (2), and payout allocation are fixed. Users edit numeric values only. A source-preset confirmation flag gates automatic scoring for new games; custom systems can score configured outcomes. A game created while the source preset is unverified remains manual-only even after the maintained system is confirmed. Confirmation remains set on the maintained system after numeric edits, and snapshots created afterward record the confirmed state. Removing a maintained system requires confirmation and cannot affect game snapshots.

### RulesSnapshot

An immutable copy stored in each newly created `Game`.

| Field | Type | Rules |
|---|---|---|
| `systemId` | UUID | ID of the selected maintained system at game creation. |
| `name` | string | Selected display name at game creation. |
| `revision` | positive integer | Selected revision at game creation. |
| `kind` | `source-preset` or `custom` | Preserves source/custom behavior. |
| `verification` | `unverified` or `confirmed` | Captured at game creation and immutable; determines whether this game can use automatic scoring. |
| `values` | scoring values | Complete numeric rules required to score this game; snapshot is not changed by catalog edits/removal. |

### Player

A seat in a game, with a stable UUID and a trimmed non-empty name. New games have exactly four or five distinct names (case-insensitive in `nl-NL`). A locally remembered name is a suggestion only and is stored separately from a game's player records.

### Game

A table session with an immutable selected rules snapshot and ordered gifts.

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | Stable; preserved by edits, migration, and reload. |
| `name` | string | Trimmed display name; default may be supplied by the UI. |
| `players` | ordered `Player[]` | Four or five for new/playable games; migrated legacy history may contain six or seven. |
| `rulesSnapshot` | `RulesSnapshot` or `null` | Required for new games; null only for v1 legacy cards whose original contract rules are unknowable. |
| `gifts` | ordered `Gift[]` | Up to 12 for four-player and 15 for five-player playable games. |
| `legacy` | boolean | True for migrated v1 cards; these have no reconstructed contract history. |
| `createdAt`, `updatedAt` | ISO 8601 strings | Used for history ordering and save feedback. |

A six/seven-player legacy card is display-only. A four/five-player legacy card retains manual score entry but cannot use automatic scoring without an explicit new game; its existing gifts remain unchanged.

### Gift

One recorded deal. Its ordered position determines progress and the expected dealer; the dealer ID is also stored for historical display. Score totals are derived from 100 plus each gift's score changes.

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | Stable through edit, deletion of other gifts, and persistence. |
| `dealerId` | player UUID | Current dealer; a five-player dealer is not an active scorer. Later gifts' dealer assignments are recalculated after an earlier gift is removed. |
| `input` | discriminated contract input or `null` | Stores contract, outcome, trick count and/or participant IDs sufficient for preview/recalculation. `null` for legacy gifts. |
| `scoreChanges` | map of player UUID to integer | Applied per-player deltas; must include zero for a five-player sitting-out dealer. |
| `entryMode` | `automatic`, `manual`, or `legacy-manual` | Identifies whether the input was calculated, entered manually, or migrated. |
| `manualNote` | optional string | Explains an override/correction when supplied. |

For a contract edit, preserve the gift ID and recompute from its inputs using the game's rules snapshot. For a manual gift, preserve its entered changes. Gift deletion requires confirmation; subsequent dealer assignments, progress, and totals are recalculated without changing remaining gift IDs.

### PersistedStateV2

One versioned local envelope so a complete state transition can be written with one `localStorage.setItem` operation.

| Field | Type | Rules |
|---|---|---|
| `version` | literal `2` | Reject unsupported future versions without replacing stored data. |
| `games` | `Game[]` | Unique game UUIDs, newest first. |
| `activeGameId` | UUID or `null` | Must reference a game in `games`, if non-null. |
| `scoringSystems` | `ScoringSystem[]` | Unique IDs/names; at least one remains available. |
| `rememberedPlayerNames` | string array | Unique optional suggestions; never fixes lineup or order. |

During migration, parse the existing `rikken-scorekeeper-v1` and `rikken-scorecards-v1` envelopes, merge valid records by game ID (active record takes precedence for a matching ID), preserve their IDs and score changes, and mark them legacy-manual. Write and verify the complete v2 envelope before considering migration successful; leave v1 keys intact if validation or write fails.

## Contract Input Variants

- **Rik/Afrik and Troel**: exactly two distinct rikker UUIDs, two opposing active player UUIDs, and rikkers' trick count `0..13`; Troel uses the fixed multiplier of 2.
- **Solo contracts**: contract type, one soloist UUID, and success/failure. The other three active players are determined from the four active players for that gift.
- **Two-player Miserie**: two distinct Miserie player UUIDs and a success boolean for each; the three defined result combinations use the configured amount and fixed roles.
- **Verzaking**: manual entry only unless a verified scoring outcome is configured; no payout behavior is inferred by the model.
- **Manual gift**: per-player score changes and optional note, without an automatic contract calculation.

## Validation and Invariants

- New games have exactly four or five distinct non-empty players and a selected rules snapshot. Starting totals are 100 each.
- Each playable four-player game has a 12-gift limit; each five-player game has a 15-gift limit. No gift may be appended past its limit.
- A gift dealer is the first player for gift 1 and advances one seat per gift, wrapping at the final player. In a five-player game the dealer has zero score change and the other four are active.
- IDs for games, players, gifts, and systems are valid UUIDs and unique within their corresponding collection. Migration preserves IDs.
- Point values and score changes are safe integers. Solo-contract values are divisible by three. Contract outcomes conserve points across active players; manual imbalance requires a warning/confirmation before save.
- Running totals equal 100 plus the sum of each player's recorded gift deltas; progress and next dealer match recalculation.
- Editing a catalog system never mutates snapshots or score history. The source preset can be selected for manual scoring while unverified, but automatic calculation is gated by the verification state captured in that game's snapshot. Later confirmation enables automatic scoring only for subsequently created games; editing values does not revoke the maintained system's confirmation.
- Invalid state, duplicate IDs, storage quota/security errors, or failed migration are reported and must not overwrite valid persisted data.

## State Transitions

- **Scoring system**: draft -> validated and saved; source preset `unverified` -> `confirmed`; confirmed stays confirmed after numeric edits; removal -> confirmed -> deleted only after explicit confirmation and only if another system remains.
- **Game**: setup -> in progress -> complete at the configured gift limit. The selected rules snapshot does not transition.
- **Gift**: draft -> preview -> recorded; recorded -> edited (same ID) or deleted after confirmation; list changes recalculate totals, progress, and subsequent dealer assignments.
- **Legacy migration**: v1 parsed -> converted to legacy-manual v2 records -> validated -> one-envelope v2 save. Failure retains original v1 data and surfaces an error.
