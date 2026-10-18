# Rikken Scorekeeper Requirements

## Product Summary

A Dutch-language, personal webapp for keeping score during one Rikken table game. The app stores data only in the user's browser and does not require an account.

## Scope

A game is one table session: 12 gifts for four players or 15 gifts for five players. Players start at 100 points each. The app records each gift, shows running scores, and displays final standings. Tracking multi-table evenings or player rotations is out of scope for the first version.

## Functional Requirements

### Game Setup

- Start a game with four or five named players.
- Remember previously used player names locally and offer them as optional suggestions when setting up a game. Allow the user to enter new names, choose any combination of players, and set their order independently for every game; suggestions must never enforce a fixed roster or order.
- Initialize each player at 100 points and show the expected gift count.
- Prevent starting until every seat has a player name.
- Treat the leftmost player column as the first dealer. After each gift, move the dealer one column to the right and wrap from the last player column to the leftmost column (column four in a four-player game, column five in a five-player game).
- In five-player games, the dealer deals the gift but does not play it and has no score change for that gift. The remaining four players are the active players for that gift.

### Scoring

- Support automatic scoring by contract where the rules are known, plus manual per-player score changes and corrections.
- Show the selected contract, result, and resulting score changes before recording them.
- Keep each gift's changes balanced across the table where the rules require it; warn before saving unbalanced manual changes.
- Allow the last gift to be edited or undone.
- Show running totals and gift progress throughout the game.
- At game end, show final scores and standings. With conserved scores, totals should add to 400 for four players or 500 for five players.

### History and Data

- Save games automatically in browser local storage and restore them after reopening the app.
- List previous games and allow viewing, editing, and deleting them with confirmation.
- Assign every game and every gift a unique, stable GUID when it is created. Keep each identifier when its record is edited, saved, or reloaded.
- Make clear that local-only storage can be lost if browser site data is cleared or the user switches devices.

### Interface

- Use Dutch labels and Rikken terminology.
- Keep the layout clean and free of clutter while making the main game information and actions easy to find and use.
- Work on mobile and desktop, with score entry usable at a game table. Treat a Samsung Galaxy A54 in portrait orientation as the minimum phone-size reference.
- Allow vertical scrolling, but avoid horizontal scrolling: the full interface and score table, including five player columns, must fit within the phone viewport width.
- Make the current gift, player names, and running scores easy to scan.
- Display players in columns and gifts in rows in the score table.
- Clearly mark the dealer for each gift. For five-player games, visually distinguish the dealer as sitting out that gift.
- Use icons selectively where they make an action or status easier to recognize, such as undo or delete. Do not add icons decoratively or to every label; provide visible text or an accessible name for controls where the icon alone may be unclear.

## Scoring Rules and Source

The requested rules source is [Reglement Rikken Landelijke Gilde Beerse](https://tanseleer.be/rikken/landelijkegilde/). It specifies starting at 100 points per player and 12 gifts for four players or 15 for five. It also describes Rik/afrik, Abondance, Miserie, Open Miserie, 13 slagen, Solo slim, and Verzaking, including special scoring and doubling.

For Rik/afrik, each gift has 13 tricks in total. The two rikkers (challengers) and two tegenstanders (challengees) take the number of tricks shown, and the table gives the points received by each individual on that pair:

| Slagen rikkers | Points per rikker | Slagen tegenstanders | Points per tegenstander |
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

These are per-player scores: each of the two players on a side receives the listed value individually, and all four score changes sum to zero. Troel uses this same Rik/afrik scoring table, with every player's gain or loss doubled. Troel is the only contract that doubles points.

For Abondance (12 points), one-player Miserie (18), Open Miserie (24), 13 slagen (30), and Solo slim (48), the listed contract value is the soloist's gain on success. Each of the other three active players loses one third of that value. On failure, reverse those score changes: the soloist loses the listed value, and each of the other three active players gains one third. In five-player games, the dealer sits out and the remaining four players are the soloist and three opponents.

For two Miserie players, apply these per-player outcomes:

| Miserie player 1 | Miserie player 2 | Each Miserie player's score | Each of the other two active players' score |
| --- | --- | ---: | ---: |
| Failed | Failed | -12 | +12 |
| One succeeded, one failed | - | +12 for the successful player; -12 for the failed player | 0 |
| Succeeded | Succeeded | +12 | -12 |

All contract scoring changes for a gift must balance to zero. Manual correction must remain available.

Each game should retain the rules settings used when it was played, so later changes to configurable rules do not silently change historical scores.

## Technology

- Use Angular as the frontend application framework.
- Use Materialize CSS as the CSS framework for layout and interface styling, installed and bundled with the app rather than loaded from a CDN.
- Use Lucide icons through its Angular integration, bundled locally with the app.
- Use the Angular CLI and npm scripts to provide repeatable development and production builds.
- At implementation time, use the latest stable versions of packages that are mutually compatible; do not use prerelease versions unless explicitly approved.
- Commit the npm lockfile and use `npm ci` for reproducible dependency installation after the initial package setup.

## Build and Usage Instructions

- Provide documented prerequisites, including the supported Node.js and npm versions.
- Document dependency installation with `npm install` and local development with `npm start` (or the configured Angular CLI serve command).
- Document the repeatable install command `npm ci` and the unit-test command `npm test`.
- Provide a production build command using Angular's production configuration, such as `npm run build` invoking `ng build --configuration production`.
- The production build must compile Angular and include required Materialize styles and assets in deployable static output under `dist/`.
- Document how to serve the production output from a static web host, including the single-page-app fallback to `index.html` where the host requires it.
- Add a `README.md` with setup, development, production-build and deployment steps, plus a Dutch-language walkthrough for creating a game, entering gifts, correcting or undoing an entry, and reviewing game history.
- Explain that saved games are local to the browser and may be lost if browser data is cleared or the user changes devices.

## Unit Tests

- Add unit tests for game creation, score calculation, gift editing/undo, persistence, and GUID preservation.
- Test that remembered names are offered as suggestions while different names and player orders can be used in subsequent games.
- Cover edge cases including four- and five-player games, dealer rotation and sit-out scoring, gift-count limits, invalid or unbalanced score input, and resuming a midgame after reload without applying scores twice.
- Keep scoring tests driven by the configured rules so uncertain rules can be changed without encoding assumptions into test expectations.
- Make the full unit-test suite runnable with `npm test` and document it in the README.

## Non-Functional Requirements

- Structure the Angular app with focused components, services, and domain/model types or classes. Separate presentation, game and scoring rules, and persistence responsibilities; use Angular dependency injection and SOLID principles to keep units cohesive, testable, and easy to change. Avoid concentrating unrelated application logic in the root component.
- No account, server-side database, or network connection is required for normal use.
- Persist game state locally in the browser.
- Do not silently discard an in-progress game; confirm before destructive actions.
- Keep historical games understandable if scoring settings are changed later.

## Acceptance Criteria

1. A user can start a four-player game, record 12 gifts, and see final standings.
2. A user can start a five-player game, record 15 gifts, and see final standings.
3. Reloading the app restores saved and in-progress games.
4. A user can enter a manual correction and see its effect on all player totals.
5. Games using configurable or manually corrected scoring remain identifiable in history.
6. The score table displays each player in a column and each gift in a row.
7. The leftmost player deals the first gift; the dealer marker advances one column per gift and wraps after the last player column (column four or five according to table size).
8. In a five-player game, the dealer is excluded from play and scoring for that gift; their score remains unchanged.
9. The documented production build command completes successfully and creates deployable static output containing the Angular app and Materialize assets.
10. The README explains setup, local development, production deployment, and the scorekeeper's main user workflows.
11. Every game and gift has a unique, stable GUID that survives editing and reload.
12. The app is usable at Samsung Galaxy A54 portrait phone size, the five-player score table fits the viewport width, and vertical scrolling works without horizontal scrolling.
13. `npm test` runs the unit-test suite successfully, including the listed scoring, dealer, persistence, and GUID edge cases.
14. Previously used player names are suggested at setup, but a user can create each game with a different lineup and player order.

These requirements are based on the linked rules page, which notes it was last updated three years ago. Verify scoring details with the group before making them defaults.