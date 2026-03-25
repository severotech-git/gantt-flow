# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
pnpm run dev        # Start dev server (Next.js)
pnpm run build      # Type-check + production build
pnpm run lint       # ESLint

# No test suite exists yet
```

Package manager: **pnpm**. Always use `pnpm` — never `npm` or `yarn`.

## Architecture Overview

**GanttFlow** is a Gantt chart project management app built with Next.js 16 App Router.

### Data Model
Three-level hierarchy stored as embedded documents in a single MongoDB `Project` document:
- **Epic** → **Feature** → **Task** (all have `plannedStart`, `plannedEnd`, `actualStart`, `actualEnd`, `status`, `owner`, `pctComplete`)
- Dates roll up automatically: task dates → feature dates → epic dates on every mutation (see `src/lib/dateUtils.ts`: `rollupFeatureDates`, `rollupEpicDates`)
- **Account** is the multi-tenant boundary. Every project and workspace setting is scoped to `accountId`. Users belong to accounts with roles: `owner | admin | member`.

### State Management
- `src/store/useProjectStore.ts` — Zustand + immer; owns all Gantt CRUD. Every mutating action calls `persistProject()` (debounced PATCH to `/api/projects/[id]`) and re-runs date rollup.
- `src/store/useSettingsStore.ts` — workspace settings (status configs, level names, theme, locale).
- `src/store/useAccountStore.ts` — current account, members, invitations.

### Auth Flow
- **NextAuth v5** (beta) with JWT strategy. Config split: `src/auth.config.ts` (edge-safe, no Mongoose) + `src/auth.ts` (Node.js, full providers).
- Middleware (`src/proxy.ts`) runs on every route, reads JWT from cookie without a DB call, redirects unauthenticated → `/login` and unverified-email → `/verify-email`.
- All API routes call `requireAuth()` from `src/lib/apiAuth.ts` which returns `{ userId, accountId }` or a 401 `NextResponse`. Admin-only routes call `requireManage()`.
- MFA (email OTP) is enforced after credentials login. Trusted devices skip MFA for 30 days (`TrustedDevice` model).
- On first login, `seedAccountForNewUser()` creates a default Account + WorkspaceSettings.

### Gantt Rendering
- `GanttBoard` — top-level; owns `DndContext` with `restrictToHorizontalAxis`, syncs scroll between task panel and timeline.
- `GanttTaskPanel` — left column; collapsible rows, inline status dropdown, inline `pctComplete` editor.
- `GanttTimeline` — right column; date header + bars. Bars positioned by `pxPerDay` (day=40, week=28, month=10, quarter=4).
- `GanttBar` — individual bar; uses `useDraggable`. Drag end: `delta.x / pxPerDay` → `deltaDays` → `addDays(plannedStart/End)` → store action.
- Epic drag moves all descendant tasks; feature drag moves all its tasks.
- Delayed bar = red when `delayDays > 0` and status is not a "final" status (configured in WorkspaceSettings).

### i18n
- **next-intl v4**, cookie-based locale (no URL prefix). Locales: `en`, `pt-BR`, `es`.
- Message files: `messages/{en,pt-BR,es}.json`. Use `useTranslations()` in client components, `getTranslations()` in server components.
- Locale is stored on the `User` model and carried in the JWT.

### Key File Locations
| Concern | Path |
|---|---|
| Types | `src/types/index.ts` |
| DB connection | `src/lib/mongodb.ts` (singleton with global cache) |
| Mongoose models | `src/lib/models/` |
| Date utilities | `src/lib/dateUtils.ts` |
| Auth config (edge) | `src/auth.config.ts` |
| Auth config (node) | `src/auth.ts` |
| Middleware | `src/proxy.ts` (exported as `proxy`, re-exported in `middleware.ts`) |
| API auth helper | `src/lib/apiAuth.ts` |
| Email sending | `src/lib/email.ts` (nodemailer) |
| Seed on signup | `src/lib/seedWorkspace.ts` |

### Environment Variables Required
```
AUTH_SECRET          # Required by NextAuth
NEXTAUTH_URL         # e.g. http://localhost:3000
MONGODB_URI          # MongoDB connection string
GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET   # OAuth (optional)
EMAIL_FROM           # e.g. "GanttFlow <noreply@severotech.com>"
RESEND_API_KEY       # Resend API key for sending emails
```
