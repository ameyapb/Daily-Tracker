# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Single user (the developer/owner) doing personal daily planning. Used repeatedly throughout the day to see what is TODO, IN PROGRESS, DELAYED, or COMPLETED across freeform, user-created lanes. No authentication, no multi-tenant concerns by design.

## Product Purpose

A Kanban-style daily activity tracker: freeform lanes hold cards (task name, optional description, optional reminder, status). Exists to keep the user from forgetting tasks and to give a satisfying sense of clearing the board. Success is a quick, low-friction glance at what needs attention plus the ability to move things forward without fighting the tool.

## Positioning

Not a general project-management tool. Status is decoupled from lane placement for user lanes, so lanes are purely organizational (freeform, user-named) while status (TODO/IN PROGRESS/COMPLETED/DELAYED) is tracked independently and drives two automatic system lanes (DELAYED, COMPLETED). This separation is the core mechanism: dragging a card between user lanes never changes its status, but status changes (including automatic overdue-to-DELAYED transitions) always move the card into the matching system lane.

## Operating Context

Single-page web app (React + Vite), backed by Supabase (Postgres + RLS, no auth, single-user by design). Checked throughout the day, not just once. Reminders fire as an in-app blocking modal via client-side polling against `remind_at` (no backend push, no service worker), so the app must be open/foregrounded to see a reminder fire. COMPLETED cards reset daily (archived, not deleted) on local-calendar-day boundaries; DELAYED persists until manually resolved.

## Capabilities and Constraints

- Lane CRUD, reorder; card CRUD, reorder, drag-and-drop within and across lanes.
- Two fixed system lanes (DELAYED, COMPLETED) always render after user lanes; only user lanes participate in lane reordering.
- No push notifications, no offline support, no multi-user/auth. These are explicit constraints, not gaps to fill.
- Deployed to Vercel; Supabase project referenced by `.env` (production) and a separate `.env.test` project for E2E tests.

## Brand Commitments

None binding. The current "Storybook Meadow" visual system (rose/green palette, Fraunces/Inter/Plex Mono fonts, Lottie meadow animations, documented in CLAUDE.md) is the incumbent look but is explicitly open to being replaced by future design work rather than treated as a fixed identity.

## Evidence on Hand

No testimonials, case studies, press, or external assets. Single real user (the owner). Existing UI, CSS tokens, and Lottie assets under `src/assets/lottie/` are the only design evidence on hand.

## Product Principles

- Status and lane placement are independent for user lanes; never conflate a lane move with a status change.
- Low friction over feature completeness: quick glance, quick update, minimal modal/form overhead.
- Automatic behavior (overdue to DELAYED, daily COMPLETED reset) should feel predictable and reversible, not surprising.
- Reminders are best-effort and in-app only; the product does not promise delivery when the app is closed.
- Whimsy/delight (current meadow theme) is a valid direction but subordinate to clarity and low cognitive load, per the Operate mode this surface is in.

## Accessibility & Inclusion

No formal compliance target. Best-effort: reasonable color contrast, keyboard usability, and respect for `prefers-reduced-motion` (already implemented via `usePrefersReducedMotion`).
