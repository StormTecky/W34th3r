<!--
SYNC IMPACT REPORT (scratch material for review; remove before committing)
Version change: (unratified template) → 1.0.0
Modified principles: none renamed (all five were unfilled template placeholders)
Added principles:
  - I. Code Quality
  - II. Test-First (NON-NEGOTIABLE)
  - III. Layered Testing
  - IV. Maintainability & Simplicity
  - V. Reliable Failure Handling
Added sections: Quality Standards & Constraints; Development Workflow & Quality Gates
Removed sections: none
Deferred items: none. Tech stack is intentionally unspecified; principles are stack-agnostic.
  Concrete tool choices (linter, test runner, coverage tool) belong in the first plan.md.
-->
# W34th3r Constitution

## Core Principles

### I. Code Quality

All code merged to `main` MUST be readable, consistently formatted, and statically checked.

- An automated formatter and linter MUST be configured, and their output MUST be clean before merge.
  Style is never debated in review; it is enforced by tooling.
- Static typing (or the strictest type-checking mode the chosen language offers) MUST be enabled.
  Escape hatches (`any`, unchecked casts, lint suppressions) MUST carry a comment explaining why.
- Names MUST describe intent. Functions SHOULD do one thing; a function or module that needs
  "and" to describe it MUST be justified or split.
- Dead code, commented-out code, and unreferenced dependencies MUST be removed, not left behind.

Rationale: W34th3r exists to look better than existing weather apps. A polished product cannot rest
on a codebase that is hard to read or change, and automated checks keep quality independent of who
reviews the change.

### II. Test-First (NON-NEGOTIABLE)

Behavior MUST be specified by a failing test before it is implemented.

- The cycle is Red → Green → Refactor: write a test, see it fail for the expected reason, make it
  pass with the simplest change, then clean up with tests green.
- Every bug fix MUST begin with a test that reproduces the bug.
- A task is not complete while any test is failing, skipped without a linked issue, or deleted to
  make a change pass.

Rationale: Tests written after the fact tend to confirm what the code does rather than what it
should do. Test-first keeps requirements, design, and verification aligned with the feature spec.

### III. Layered Testing

Tests MUST cover each layer where defects realistically occur, with most coverage at the cheapest
layer that can catch the defect.

- **Unit tests**: Pure logic (unit conversion, forecast aggregation, formatting, date/time and
  timezone handling) MUST have unit tests, including boundary and empty/missing-data cases.
- **Contract tests**: Every integration with an external weather or geocoding provider MUST have
  contract tests against recorded or schema-validated responses. Tests MUST NOT call live
  third-party services in CI.
- **Integration tests**: User-facing flows (search a location, view current conditions and forecast,
  change units, handle offline or failed fetch) MUST have at least one integration or end-to-end
  test per flow.
- **Visual/UI tests**: Core display components MUST have snapshot or visual-regression coverage, and
  accessibility checks (contrast, labels, keyboard/screen-reader access) MUST run for each screen.
- Tests MUST be deterministic: time, randomness, locale, and network MUST be controlled or
  injected. Flaky tests MUST be fixed or quarantined with a tracking issue within one working week.

Rationale: A weather app's failure modes are wrong data, unhandled provider changes, and broken
presentation. Each layer targets one of these, and deterministic tests make CI results trustworthy.

### IV. Maintainability & Simplicity

The simplest design that satisfies the spec MUST be chosen; complexity MUST be justified.

- Code MUST be organized into modules with clear single responsibilities and explicit, minimal
  interfaces. Data fetching, domain logic, and presentation MUST be separable and independently
  testable.
- External providers MUST be isolated behind an adapter so a provider can be replaced without
  touching domain or UI code.
- Do not build for hypothetical future needs (YAGNI). Abstractions MUST be introduced only once
  there are at least two concrete uses, or when required for testability or provider isolation.
- Design tokens (colors, type scale, spacing, motion) MUST be defined centrally and reused; no
  duplicated magic values for visual styling.
- New dependencies MUST be justified in the PR description (purpose, maintenance status, size).
  Prefer the platform and existing dependencies over adding new ones.

Rationale: The visual design will evolve and weather providers can change terms or shape. Isolation
and simplicity keep those changes cheap and local.

### V. Reliable Failure Handling

Every external or fallible operation MUST have a defined, tested failure behavior.

- Network errors, timeouts, rate limits, malformed responses, and missing fields MUST be handled
  explicitly and surfaced to the user with a clear, non-technical state, never a blank or broken
  screen.
- Errors MUST NOT be swallowed silently. They MUST be logged with enough context to diagnose
  (operation, location identifier, provider status) and without personal data such as precise
  user coordinates.
- Stale or cached data shown to the user MUST be visibly marked with its age.

Rationale: Users open a weather app in poor-connectivity situations. Trust depends on the app being
honest about what it knows and does not know.

## Quality Standards & Constraints

- **Coverage**: Overall automated test coverage MUST NOT decrease in a PR, and new or changed
  domain logic MUST be covered at 90% or higher (line and branch). Coverage is a floor, not a
  substitute for meaningful assertions.
- **Complexity limits**: Functions SHOULD stay under 40 lines and cyclomatic complexity under 10.
  Exceeding a limit MUST be explained in a code comment or the PR description.
- **Performance**: Initial render of the primary weather view SHOULD complete within 2 seconds on a
  mid-range device on a typical mobile connection. Regressions MUST be explained in the PR.
- **Accessibility**: Text and meaningful graphics MUST meet WCAG 2.2 AA contrast. Information MUST
  NOT be conveyed by color alone.
- **Privacy & secrets**: API keys and secrets MUST NOT be committed; they MUST be supplied through
  environment configuration. Location data MUST be used only to fulfil the user's request.
- **Dependencies**: Dependencies MUST be pinned via a lockfile and reviewed for known
  vulnerabilities in CI.

## Development Workflow & Quality Gates

- All changes MUST land through a pull request; direct commits to `main` are prohibited.
- A PR MUST NOT be merged unless CI passes: format, lint, type check, and all test layers
  applicable to the change.
- Every PR MUST be reviewed by at least one person other than the author (or, for a solo
  maintainer, a documented self-review against this constitution's checklist) and MUST state
  which principles it touches.
- PRs SHOULD be small and focused on one concern. Refactors and behavior changes SHOULD be
  separate commits so each can be reviewed and reverted independently.
- User-visible behavior changes MUST be traceable to a spec in `specs/`, and the spec, plan,
  and tasks MUST be updated when the implementation diverges from them.
- Public modules and non-obvious decisions MUST be documented where they live (docstrings, ADR
  or plan notes). The README MUST describe how to install, run, and test the project.

## Governance

This constitution supersedes other project practices and conventions. When a conflict arises, this
document wins until it is amended.

- **Amendments**: Changes MUST be proposed in a PR that edits this file, states the rationale, and
  includes a migration note when existing code or processes must change. An amendment takes effect
  when merged.
- **Versioning**: The constitution follows semantic versioning. MAJOR for removing or redefining a
  principle in a backward-incompatible way; MINOR for adding a principle or section or materially
  expanding guidance; PATCH for clarifications and wording fixes.
- **Compliance review**: Every PR review MUST verify compliance with these principles. Spec Kit
  plans MUST include a constitution check, and violations MUST be recorded with justification
  (the simpler alternative considered and why it was rejected) before work proceeds.
- **Exceptions**: A principle may be waived only for a specific change, with the waiver and its
  expiry recorded in the PR description. Waivers for Principle II (Test-First) additionally
  require maintainer approval.
- **Review cadence**: The constitution SHOULD be reviewed at least every six months, or when
  the technology stack is chosen, to replace stack-agnostic wording with concrete tooling.

**Version**: 1.0.0 | **Ratified**: 2026-10-20 | **Last Amended**: 2026-10-20
