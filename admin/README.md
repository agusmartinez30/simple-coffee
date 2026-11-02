# Café Central · Admin

Frontend-only prototype of the Café Central staff back-office, built from the Pencil exports in
`exports/` (1440×900 desktop frames). Staff sign-in, MFA and logout use the Café Central API
(`../api`); forgot/reset password and all module data are still mocks in `src/mocks/`.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
```

Checks: `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`.

## API

Browser calls go to `/api/*`, which `next.config.ts` rewrites to the Café Central API
(`../api`), so its httpOnly `cp_session` cookie is first-party and no CORS is involved.
`src/features/auth/auth-api.ts` is the typed client for `/auth/login`, `/auth/mfa/verify`,
`/auth/logout` and `/auth/me`.

| Variable | Default | Purpose |
| --- | --- | --- |
| `API_URL` | `http://localhost:3001` | API base URL the `/api/*` rewrite targets. Server-only; read when `next dev` / `next build` loads the config, so set it before building (e.g. in `.env.local`). |

## Signing in

Start the API first (`../api/README.md`: Postgres, migrations and `npm run db:seed`). Sign in
with the owner from the API's `SEED_OWNER_EMAIL` / `SEED_OWNER_PASSWORD`; with
`SEED_OWNER_MFA=true` the seed prints an `otpauth://` URI to add to an authenticator app.

Flow: `/login` → `/verify` (only when the account has MFA) → `/` (redirects to `/orders`). The session is the
API's httpOnly `cp_session` cookie; "Recordarme en este dispositivo" makes it persistent,
otherwise it ends with the browser session. Admin routes ask `GET /auth/me` and redirect to
`/login` without a valid session; "Cerrar sesión" (sidebar) calls `POST /auth/logout`. Too
many attempts (HTTP 429) show "Demasiados intentos. Esperá un minuto y volvé a intentar.".

## Routes

| Route | Screen |
| --- | --- |
| `/login` | 11A · Staff Login |
| `/forgot-password` | 11B · Forgot Password |
| `/reset-password` | 11C · Reset Password |
| `/verify` | 11D · Multi-Factor Verification |
| `/` | Redirects to `/orders` |
| `/orders` | 03 · Gestión de pedidos, optimized proposal (alert metrics, search + quick filters, kanban with delay/new badges, persistent order detail panel with timeline, cancel confirmation) |
| `/settings/payments` | 06 · Configuración de pagos under Configuración; `/settings` and `/payments` redirect here keeping `?state=` ("Métodos y modalidades" and "Datos bancarios" tabs, read-only customer preview per tab, "Guardado hace N min" status, unsaved-changes bar and in-memory save after confirming) |
| `/menu/products` | 07 · Productos: list with metrics, search, filters and Duplicar / Archivar / availability (07A), editor (07B) and customer preview (07C) of the same draft, in-memory save |
| `/menu/categories` | 08 · Categorías y momentos: "Organización de la carta" tabs with moments (08A, visibility and drag/keyboard reordering) and categories (08C, search and reordering), moment editor with live phone preview (08B), category editor with archive confirmation (08D) and customer Preview Studio (08E: moment selector, phone/wide toggle, prototyped flow, "Actualizar preview"), in-memory save |
| `/menu` | "Próximamente" placeholder |

### Forced variants (`?state=`)

| Route | Values |
| --- | --- |
| `/login` | `error` (invalid credentials) |
| `/forgot-password` | `sent` (generic confirmation) |
| `/reset-password` | `mismatch`, `success` |
| `/verify` | `error` (wrong code) |
| `/orders` | `detail` (panel on #1051; by default it opens on the delayed #1048), `cancel` (cancel dialog of #1051), `empty` (no orders), `no-results` (search for "9999") |
| `/settings/payments` | `bank` ("Datos bancarios" tab), `bank-errors` (invalid alias and CBU after a save attempt), `confirm` (save confirmation with a pending change) |
| `/menu/products` | `edit` (07B: Cappuccino with "Tomar" added, unsaved), `preview` (07C of that draft), `new` (empty new product), `errors` (Cappuccino after publishing without a name and with an invalid price) |
| `/menu/categories` | `moment-edit` (08B: Para desayunar with Limonada added, unsaved), `moment-new`, `moment-errors` (saved without a name), `categories` (08C tab), `category-edit` (08D: Cafés with the export description, unsaved), `category-new`, `category-archive` (Cafés waiting for the archive confirmation), `preview` (08E of Para desayunar) |

## Structure

- `src/app/(auth)` — auth screens with the split brand layout.
- `src/app/(admin)` — authenticated shell (sidebar + top bar) and modules.
- `src/features/<feature>` — screens, presentational components and pure helpers (with tests).
- `src/shared/ui`, `src/shared/lib` — reusable primitives and utilities.
- `src/mocks` — typed mock data (and the former mock credentials, no longer used by the screens).
  - `src/mocks/service-day` — the single "service day" (21/10/2026 at 14:42) that 03 derives its
    rows and metrics from: tables sessions, orders, bill requests, collections, the product
    catalogue (also the 07 products screen: categories, moments, options, images in
    `public/images/products` copied from the customer app by `scripts/copy-product-images.mjs`;
    and the 08 menu organization: moment and category metadata, moment covers in
    `public/images/moments` copied by `scripts/copy-moment-images.mjs`; counts are always derived),
    staff and the 06 payment method / request mode names. `service-day.test.ts`
    checks that the derived data stays consistent. Some numbers differ from the exports on purpose
    (see `odd/tasks/admin-mock-unification.md`). Each screen keeps its in-memory actions to itself.
  - `src/mocks/payments.ts` — the saved 06 payment configuration.
