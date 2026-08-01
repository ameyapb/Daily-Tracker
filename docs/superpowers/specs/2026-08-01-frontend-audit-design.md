# Frontend audit + refinement recommendation pass

## Purpose

Run a full design audit of the app's frontend (`src/components/`), refine findings through a frontend-design lens, and produce a single recommendation document with a prioritized, phased implementation plan. No code changes are made in this pass — the deliverable is the document, ready to hand to `superpowers:writing-plans` for actual implementation later.

## Scope

- Whole app: `Board`, `Lane`, `Card`, `CardModal`, `ReminderModal`, `Meadow`/`BushIdleRabbit`, and their CSS/tokens in `src/index.css`.
- Design direction is open: the current "Storybook Meadow" visual system is documented in `PRODUCT.md` as non-binding, so both the audit and refinement steps are free to recommend replacing it, not just polishing it in place, if that better serves the Operate-mode goal (clarity/low cognitive load over persuasion/delight, per `PRODUCT.md`'s Product Principles).
- Out of scope: no code/CSS edits, no dependency changes, no architecture changes. Any recommendation touching architecture (lane/card/status model, Supabase schema) is called out but not acted on.

## Process

1. **`impeccable` critique/audit** — run against `src/components/` using existing `PRODUCT.md` as product-truth context, since it's already initialized for this repo. Produces raw findings: UX, information architecture, accessibility, visual hierarchy, motion, anti-patterns.
2. **`frontend-design` refinement** — take the audit findings and develop concrete aesthetic/typographic/layout direction for the highest-value items, including whether to keep or replace Storybook Meadow.
3. **Synthesis** — write `docs/superpowers/specs/2026-08-01-frontend-audit-recommendations.md` (or similar), containing:
   - Prioritized findings grouped by theme/severity
   - A recommendation per finding
   - A phased implementation plan (following the existing CLAUDE.md "Phase N" convention already used in this repo's history) suitable as direct input to `superpowers:writing-plans`

## Success criteria

- The recommendation doc is concrete enough that `writing-plans` can turn it into an implementation plan without needing another audit round.
- Findings are traceable to specific components/files, not generic design advice.
- The doc explicitly states whether Storybook Meadow is recommended to stay, be refined, or be replaced, with reasoning tied to `PRODUCT.md`'s Operate-mode principle.

## Non-goals

- No code, CSS, or dependency changes in this pass.
- No new `DESIGN.md` (that's a separate, deliberate `/impeccable document` action per CLAUDE.md, not implied by this task).
