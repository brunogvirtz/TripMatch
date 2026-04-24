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
- Browser auth via Replit OIDC (sessions persisted in DB; users login from any device)
- Group creation with shareable invite codes
- Group memberships persist server-side; users stay until they explicitly leave
- Preferences questionnaire (budget, travel type, climate, activity level)
- Swipe deck — swipe right (like +1), left (dislike -1), up (superlike +2)
- Group matching algorithm: score = avg(swipes) - 0.5 * stdDev
- Results page showing top 3 destinations with consensus percentages
- Trip plan page with activities

### Pages
- `/` — Landing page with login button
- `/dashboard` — User's active groups + stats
- `/groups/new` — Create a group
- `/groups/join` — Join via invite code
- `/groups/:id` — Group hub (with leave button)
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
│   ├── replit-auth-web/    # useAuth() hook for browser
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
│   └── src/seed-destinations.ts  # Seeds 15 destinations
```

## Database Schema

- `users` — id (varchar from OIDC sub claim), email, firstName, lastName, profileImageUrl, preferences (jsonb)
- `sessions` — sid, sess (jsonb), expire (DB-backed Replit Auth sessions)
- `groups` — id, name, inviteCode, status, createdByUserId (varchar)
- `group_members` — userId (varchar), groupId, role, preferences fields
- `destinations` — id, name, country, description, imageUrl, tags[], costLevel, climateType, activityLevel, travelTypes[], avgRating
- `swipes` — userId (varchar), groupId, destinationId, value (-1/1/2)

## API Routes

### Auth
- `GET /api/auth/user` — current authenticated user (or null)
- `GET /api/login` — start OIDC browser login
- `GET /api/callback` — OIDC callback
- `GET /api/logout` — clear session + OIDC logout

### App
- `GET/PUT /api/users/me` — Get/update current user (uses session)
- `GET /api/dashboard` — Dashboard summary
- `GET/POST /api/groups` — List/create groups
- `GET/PATCH /api/groups/:id` — Get/update group
- `POST /api/groups/:id/join` — Join via invite code
- `POST /api/groups/:id/leave` — Leave group (deletes member + their swipes)
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
