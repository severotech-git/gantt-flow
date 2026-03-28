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
- The three levels are stored internally as `epics → features → tasks`, but **all three display labels are fully configurable per workspace** via `WorkspaceSettings.levelNames`. Never hardcode "Epic / Feature / Task" in UI strings — always read from settings.
- Each item at every level has: `plannedStart`, `plannedEnd`, `actualStart`, `actualEnd`, `status`, `owner`, `pctComplete`
- Dates roll up automatically: task dates → feature dates → epic dates on every mutation (see `src/lib/dateUtils.ts`: `rollupFeatureDates`, `rollupEpicDates`)
- **Account** is the multi-tenant boundary. Every project and workspace setting is scoped to `accountId`. Users belong to accounts with roles: `owner | admin | member`.

### State Management
- `src/store/useProjectStore.ts` — Zustand + immer; owns all Gantt CRUD. Every mutating action calls `persistProject()` (debounced PATCH to `/api/projects/[id]`) and re-runs date rollup.
- `src/store/useSettingsStore.ts` — workspace settings (status configs, level names, theme, locale).
- `src/store/useAccountStore.ts` — current account, members, invitations, billing.
- `src/store/usePresenceStore.ts` — real-time cursors, drags, connected users (WebSocket/Socket.IO).

### Real-Time Collaboration (Socket.IO)
- `usePresenceStore` connects to a Socket.IO server on mount and emits cursor move / drag start / drag end events.
- Other clients receive these events and render remote-cursor overlays and drag ghost bars.
- Connected-user avatars are shown in the Gantt toolbar.
- Socket.IO falls back to HTTP long-polling when WebSocket is unavailable.

### Public Shared Links
- `SharedLink` model stores `projectId`, optional `snapshotId`, `expiresAt`, and a cryptographically random `token`.
- `GET /api/shared/[token]` is unauthenticated; it loads the project or snapshot, strips `accountId` and internal metadata, and returns the sanitized tree.
- `src/app/shared/[token]/page.tsx` is an SSR page that pre-fetches shared data and renders `GanttReadonlyBoard`.
- `GanttReadonlyBoard` has theme and language toggles (stored in cookies) but no editing capability.
- Creating and revoking share links requires `owner` or `admin` role (`requireManage()`).

### Item Changelog
- Every mutating store action that changes item fields writes an `ItemChangelog` document with `{ projectId, itemId, itemType, field, oldValue, newValue, changedBy, changedAt }`.
- `GET /api/projects/[id]/changelog` returns the full history, sorted by `changedAt` descending.
- The **Changelog** tab in `ItemDetailDrawer` renders these entries grouped by item.

### Auth Flow
- **NextAuth v5** (beta) with JWT strategy. Config split: `src/auth.config.ts` (edge-safe, no Mongoose) + `src/auth.ts` (Node.js, full providers).
- Middleware (`src/proxy.ts`) runs on every route, reads JWT from cookie without a DB call, redirects unauthenticated → `/login` and unverified-email → `/verify-email`.
- All API routes call `requireAuth()` from `src/lib/apiAuth.ts` which returns `{ userId, accountId, locale }` or a 401 `NextResponse`. Admin-only routes call `requireManage()`.
- MFA (email OTP) is enforced after credentials login. Trusted devices skip MFA for 30 days (`TrustedDevice` model).
- On first login, `seedAccountForNewUser()` creates a default Account + WorkspaceSettings.

### Gantt Rendering
- `GanttBoard` — top-level; owns `DndContext` with `restrictToHorizontalAxis`, syncs scroll between task panel and timeline.
- `GanttTaskPanel` — left column; collapsible rows, inline status dropdown, inline `pctComplete` editor.
- `GanttTimeline` — right column; date header + bars. Bars positioned by `pxPerDay` (day=40, week=28, month=10, quarter=4).
- `GanttBar` — individual bar; uses `useDraggable`. Drag end: `delta.x / pxPerDay` → `deltaDays` → `addDays(plannedStart/End)` → store action.
- Epic drag moves all descendant tasks; feature drag moves all its tasks.
- Delayed bar = red when `delayDays > 0` and status is not a "final" status (configured in WorkspaceSettings).
- **⚠️ Shared View Sync**: `GanttReadonlyBoard` (in `src/components/gantt/GanttReadonlyBoard.tsx`) is the read-only version for public shared links. **Any visual or behavioral change to the main Gantt chart (colors, fonts, sizes, layout, bar rendering, date calculations, delay logic, status colors) must be replicated in the readonly board** to ensure consistency. Key areas to sync: `BAR_H`, `EPIC_COLORS`, `getDelayDays` logic, `isDelayed` conditions, badge styling, header heights, indentation, font sizes, and status/owner rendering.

### i18n
- **next-intl v4**, cookie-based locale (no URL prefix). Locales: `en`, `pt-BR`, `es`.
- Message files: `messages/{en,pt-BR,es}.json`. Use `useTranslations()` in client components, `getTranslations()` in server components.
- Locale is stored on the `User` model and carried in the JWT.
- Resolution order: `NEXT_LOCALE` cookie → `Accept-Language` header → `en`.
- Error codes from API are translated: `tErr(data.code)` with `apiErrors` namespace fallback to `tErr('GENERIC')`.

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
| Email sending | `src/lib/email.ts` (nodemailer + Resend) |
| Seed on signup | `src/lib/seedWorkspace.ts` |
| Rate limiting | `src/lib/rateLimit.ts` (in-memory sliding window) |
| Styling utility | `src/lib/utils.ts` (`cn()` = clsx + tailwind-merge) |
| Custom hooks | `src/hooks/` (e.g. `useAccountRole.ts`) |
| Share link model | `src/lib/models/SharedLink.ts` |
| Item changelog model | `src/lib/models/ItemChangelog.ts` |
| Read-only board | `src/components/gantt/GanttReadonlyBoard.tsx` |
| Item detail drawer | `src/components/shared/ItemDetailDrawer.tsx` (Overview / Comments / Changelog tabs) |
| Public shared page | `src/app/shared/[token]/page.tsx` (SSR, no auth required) |
| Share API | `src/app/api/projects/[id]/shares/` |
| Changelog API | `src/app/api/projects/[id]/changelog/` |
| Public share API | `src/app/api/shared/[token]/` (rate-limited, sanitized) |

### Environment Variables Required
```
AUTH_SECRET          # Required by NextAuth
NEXTAUTH_URL         # e.g. http://localhost:3000
MONGODB_URI          # MongoDB connection string
GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET   # OAuth (optional)
EMAIL_FROM           # e.g. "GanttFlow <ganttflow@severotech.com>"
RESEND_API_KEY       # Resend API key for sending emails
```

---

## Coding Patterns

Follow these patterns when adding new features. Deviating silently leads to inconsistency.

### API Routes

Every route file under `src/app/api/` must follow this skeleton:

```ts
export const runtime = 'nodejs'; // always — needed for Mongoose

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  const { userId, accountId } = authResult;

  await connectDB();
  try {
    // implementation
    return NextResponse.json(data);
  } catch (err) {
    console.error('[ROUTE_NAME]', err);
    return NextResponse.json({ error: 'descriptive message' }, { status: 500 });
  }
}
```

- **Auth guard**: always check `requireAuth()` first; admin routes use `requireManage()`.
- **Validation**: inline, before DB — check presence, type, and length/format.
- **Error codes**: return `{ error: string, code?: string }`. Codes are used for i18n on the client.
- **Status codes**: 400 validation, 401 unauth, 403 forbidden/limit, 404 not found, 410 gone, 429 rate-limited, 500 server error.
- **Rate limit 429**: include `Retry-After` header.
- **Lean queries**: use `.lean()` on read-only Mongoose queries.

```ts
// Validation example
if (!body.name || typeof body.name !== 'string') {
  return NextResponse.json({ error: 'name is required' }, { status: 400 });
}
if (body.name.trim().length > 255) {
  return NextResponse.json({ error: 'name must be 255 characters or fewer' }, { status: 400 });
}

// Rate limit 429 example
return NextResponse.json(
  { error: 'Too many attempts', code: 'TOO_MANY_ATTEMPTS' },
  { status: 429, headers: { 'Retry-After': String(seconds) } }
);
```

### Mongoose Models

```ts
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IFooDocument extends Document {
  field: string;
}

const FooSchema = new Schema<IFooDocument>({ field: { type: String, required: true } }, { timestamps: true });

// Dev hot-reload cleanup
if (process.env.NODE_ENV !== 'production') {
  delete (mongoose.models as Record<string, unknown>).Foo;
}

const Foo: Model<IFooDocument> =
  (mongoose.models.Foo as Model<IFooDocument>) || mongoose.model<IFooDocument>('Foo', FooSchema);

export default Foo;
```

- Sub-document arrays use `{ _id: true }` unless IDs are not needed.
- Use TTL indexes (`expireAfterSeconds`) for tokens/sessions.
- Index frequently-queried fields (`accountId`, `userId`, foreign keys).

### Zustand Stores

```ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface State { /* ... */ }
interface Actions { /* ... */ }

export const useFooStore = create<State & Actions>()(
  immer((set, get) => ({
    // initial state
    fetchFoo: async () => {
      set((s) => { s.isLoading = true; });
      try {
        const res = await fetch('/api/foo');
        const data = await res.json();
        set((s) => { s.items = data; });
      } finally {
        set((s) => { s.isLoading = false; });
      }
    },
  }))
);
```

- Action naming: `fetch*` for reads, `add*` / `update*` / `remove*` for mutations, `toggle*` / `set*` for UI state.
- Use `immer` — mutate draft directly inside `set((s) => { ... })`.
- Access store outside React with `useFooStore.getState().action()`.

### React Components

```tsx
'use client'; // only for client components
import { useTranslations } from 'next-intl';

interface Props { value: string; onChange: (v: string) => void; }

export function FooComponent({ value, onChange }: Props) {
  const t = useTranslations('namespace');
  return <div>{t('label')}</div>;
}
```

- Mark `'use client'` only when needed (event handlers, hooks, browser APIs).
- Prefer named exports; default exports only for pages and providers.
- Dynamic colors go in `style={{ backgroundColor: color }}`; all other classes via `cn()`.

### Dialog / Form Components

```tsx
const [loading, setLoading] = useState(false);

async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  if (!name.trim()) return;
  setLoading(true);
  try {
    await store.action(name.trim());
    onClose();
  } finally {
    setLoading(false);
  }
}
```

- Status feedback: `'idle' | 'loading' | 'success' | 'error'` state; clear with `setTimeout` after 3 s.
- API error codes → `tErr(data.code as never)` with `'GENERIC'` fallback.

### Styling

- Use `cn()` (from `src/lib/utils.ts`) for conditional/merged class names.
- Shadcn/Radix primitives live in `src/components/ui/`.
- Tailwind scale: `text-xs`/`text-sm`, `gap-2`/`gap-4`, `p-3`/`px-1.5 py-0.5`.
- Semantic muted text: `text-muted-foreground`.
- Disabled states: `disabled:opacity-50 cursor-not-allowed`.

### i18n — Adding New Strings

1. Add the key to all three files: `messages/en.json`, `messages/pt-BR.json`, `messages/es.json`.
2. Group under the nearest logical namespace (e.g. `dialogs.newProject`, `settings.profile`).
3. API error codes belong in the `apiErrors` namespace.
4. Use parametric translations (`{date}`, `{name}`) instead of string concatenation.

### Import Order Convention

1. External packages (`react`, `next-auth`, `zustand`, `mongoose`)
2. Types (`@/types`)
3. Utilities / stores / hooks (`@/lib`, `@/store`, `@/hooks`)
4. Components (`@/components`)
5. Icons / assets

Use `@/` path alias throughout — never relative paths beyond one level.
