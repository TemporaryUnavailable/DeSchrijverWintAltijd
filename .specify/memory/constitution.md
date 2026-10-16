<!--
Sync Impact Report
Version change: unfilled template -> 1.0.0 (first adoption)
Modified principles: template slots -> five project principles
Added sections: Product and Technical Constraints; Delivery Workflow
Removed sections: none
Templates: .specify/templates/plan-template.md updated;
	.specify/templates/tasks-template.md updated; .specify/templates/spec-template.md aligned, no change;
	.specify/templates/commands absent
Runtime guidance: src/README.md updated; .github/copilot-instructions.md aligned, no change
Follow-up TODO: confirm the original ratification date
-->
# Rikken Scorekeeper Constitution

## Core Principles

### I. Scoring Integrity
Every game MUST retain the complete scoring rules selected when it was created. Gift previews and recorded changes MUST use that snapshot, preserve stable game and gift GUIDs, and balance across active players whenever the contract requires conservation. Manual corrections MUST remain available and identifiable. Editing a maintained scoring system MUST NOT alter historical games.

### II. Local-First Privacy and Data Integrity
Normal use MUST require no account, server, or network connection. Game data MUST stay in browser storage unless the user explicitly exports or imports a backup. Imports MUST be validated and previewed, MUST NOT silently replace existing games, and destructive actions MUST require confirmation. Storage failures MUST NOT be reported as successful saves.

### III. Complete Game Requirement Unit Coverage
Every game-related functional requirement, acceptance scenario, and specified edge case MUST map to one or more automated unit tests. Coverage MUST include scoring systems, contract outcomes, setup, player selection, dealer progression, sit-outs, gift limits, corrections, standings, migration, persistence, stable identifiers, backup/restore, duplicate handling, and midgame resume without replay. Tests MUST use configured rules rather than duplicate scoring assumptions. Browser or integration tests MAY supplement unit tests but MUST NOT replace unit coverage of game rules and state transitions. All required unit tests MUST pass before release.

### IV. Material Design and Table-Ready Usability
The interface MUST use Material Design 3 components and fixed static baseline color roles, with accessible contrast and no runtime-generated palette. Materialize CSS MUST remain installed and locally bundled for layout styling; Angular Material M3 MUST provide standard interactive components where the two systems conflict. The interface MUST remain clean, lean, and simple, use Dutch labels and Rikken terminology, and make scores, gifts, and dealer status easy to scan. The complete five-player table MUST fit the Samsung Galaxy A54 portrait viewport without horizontal scrolling. Controls MUST have accessible names and destructive actions MUST explain their consequences.

### V. Clean, Cohesive Angular Architecture
Angular code MUST follow clean architecture with explicit, testable responsibility boundaries. Models MUST describe domain data; services MUST own application use cases, rules, persistence, and transfer operations; components MUST focus on presentation and user interaction. Responsibilities MUST be divided into the smallest cohesive units that improve isolation or testability. Components MUST use Angular dependency injection and MUST NOT bypass service boundaries for domain or storage operations. Avoid monolithic units and fragmentation that adds indirection without a clear benefit.

## Product and Technical Constraints

- The product is a personal scorekeeper for one four- or five-player Rikken table game. Multi-table sessions and player rotations are out of scope unless separately approved.
- Angular is the application framework. Materialize CSS, Angular Material M3 components, and Lucide Angular icons MUST be installed and bundled locally, not loaded from a CDN.
- Game data MUST persist in browser storage. The app MUST offer backup export and restore and explain that clearing browser data or changing devices can lose local games.
- Game and gift identifiers MUST be unique stable GUIDs. A deliberately copied game MUST receive new identifiers.
- Production output MUST be deployable as static files and include all required application styles, icons, and fonts.

## Delivery Workflow

- Feature specifications MUST define independently testable user journeys, acceptance scenarios, functional requirements, and measurable success criteria.
- Plans MUST complete and re-check the Constitution Check before implementation. Every game-related functional requirement and edge case MUST be mapped to unit-test coverage in the plan and carried into implementation tasks.
- Changes to scoring, state transitions, persistence, validation, or transfer MUST include focused tests. Documentation-only changes may omit domain tests when the scope is explicit.
- User-facing or deployment changes MUST keep the README accurate for setup, testing, production builds, deployment, and affected workflows.
- A design exception MUST identify the principle, the reason, and the simpler compliant alternative considered; record it in the plan's Complexity Tracking section.

## Governance

This constitution governs project planning, implementation, and review. Amendments require project-owner approval, an updated version and amendment date, and synchronization of affected templates and runtime guidance. Versioning follows semantic versioning: MAJOR for incompatible governance or principle changes, MINOR for new principles or materially expanded requirements, and PATCH for clarifications that do not change obligations. Each feature review MUST check applicable principles; exceptions require explicit justification and MUST NOT weaken local-data privacy or scoring integrity without an approved amendment.

**Version**: 1.0.0 | **Ratified**: TODO(RATIFICATION_DATE): original adoption date is unknown | **Last Amended**: 2026-10-07
