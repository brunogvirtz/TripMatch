# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Project: TripMatch

A group travel planning web app (scalable to mobile) that helps friends decide on trips together using a swipe-based matching system.

### Core Features
- User onboarding (name only, stored in localStorage)
- Group creation with shareable invite codes
- Preferences questionnaire (budget, travel type, climate, activity level)
- Swipe deck — swipe right (like +1), left (dislike -1), up (superlike +2)
- Group matching algorithm: score = avg(swipes) - 0.5 * stdDev
- Results page showing top 3 destinations with consensus percentages
- Trip plan page with activities

### Pages
- `/` — Landing page
- `/onboarding` — Quick name setup
- `/dashboard` — User's active groups + stats
- `/groups/new` — Create a group
- `/groups/join` — Join via invite code
- `/groups/:id` — Group hub
- `/groups/:id/preferences` — Set preferences
- `/groups/:id/swipe` — Swipe deck (core feature)
- `/groups/:id/results` — Matching results
- `/groups/:id/plan` — Trip plan

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server
│   └── tripmatch/          # React + Vite web app (main)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
│   └── src/seed-destinations.ts  # Seeds 15 destinations
```

## Database Schema

- `users` — id, username, displayName, avatarUrl, preferences (jsonb)
- `groups` — id, name, inviteCode, status, createdByUserId
- `group_members` — userId, groupId, role, preferences fields
- `destinations` — id, name, country, description, imageUrl, tags[], costLevel, climateType, activityLevel, travelTypes[], avgRating
- `swipes` — userId, groupId, destinationId, value (-1/1/2)

## API Routes

- `POST /api/users` — Create/upsert user
- `GET/PUT /api/users/me` — Get/update current user (x-user-id header)
- `GET /api/dashboard` — Dashboard summary
- `GET/POST /api/groups` — List/create groups
- `GET/PATCH /api/groups/:id` — Get/update group
- `POST /api/groups/:id/join` — Join via invite code
- `GET /api/groups/:id/members` — Group members
- `POST /api/groups/:id/preferences` — Submit preferences
- `GET /api/groups/:id/results` — Matching results
- `GET /api/groups/:id/stats` — Group stats
- `GET /api/destinations` — All 15 destinations
- `POST /api/swipes` — Record a swipe
- `GET /api/swipes/group/:groupId` — All group swipes
- `GET /api/swipes/user/:groupId` — Current user's swipes

## Matching Algorithm

```
groupScore = mean(swipe_values) - 0.5 * stdDev(swipe_values)
matchPercentage = (likes + superlikes) / totalVotes * 100
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references
- `pnpm --filter @workspace/scripts run seed-destinations` — seed destination data
