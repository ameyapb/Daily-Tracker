# Daily Tracker

A single-user daily activity tracker, structured like a Kanban board: freeform
user-created lanes hold cards (task name, optional description, optional
reminder, status TODO / IN PROGRESS / COMPLETED / DELAYED). Two system lanes
(DELAYED, COMPLETED) sit alongside user lanes; a card moves into the matching
system lane automatically when its status becomes DELAYED or COMPLETED.
Reminders fire as an in-app blocking modal via a client-side poll.

Live app: https://daily-tracker-omega-sepia.vercel.app

## Stack

- React + Vite
- Supabase (Postgres, RLS) for data
- `@dnd-kit` for drag-and-drop, `framer-motion` for layout/spring transitions
- Vitest + React Testing Library for unit/component tests, Playwright for E2E

## Setup

```bash
npm install
cp .env.example .env   # fill in your Supabase project URL and publishable key
npm run dev
```

## Commands

- `npm run dev` - start the Vite dev server
- `npm run build` - production build
- `npm run lint` - oxlint
- `npm run preview` - preview a production build locally
- `npm run test` - run the Vitest suite once
- `npm run test:watch` - run Vitest in watch mode
- `npm run test:e2e` - run the Playwright E2E suite (requires `.env.test`, see `.env.test.example`)
- `npm run test:e2e:ui` - run Playwright in UI mode

## Deployment

Deployed on Vercel, connected to this repo's `main` branch. Build settings
are the Vite defaults (`npm run build`, output `dist`). Set
`VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in the Vercel
project's environment variables.

See [CLAUDE.md](CLAUDE.md) for full architecture and schema details.
