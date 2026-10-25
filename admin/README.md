# Café Central · Admin

Frontend-only prototype of the Café Central staff back-office, built from the Pencil exports in
`exports/` (1440×900 desktop frames). There is no backend: auth and data are mocks in
`src/mocks/`.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
```

Checks: `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`.

## Demo credentials

| Field | Value |
| --- | --- |
| Email | `turno@cafecentral.com` |
| Password | `Mostrador2026!` |
| MFA code | `123456` |

Flow: `/login` → `/verify` (MFA) → `/` (overview). The admin routes redirect to `/login`
until the MFA step is completed. "Recordarme en este dispositivo" keeps the mock session in
`localStorage`; otherwise it lives in `sessionStorage` and ends with the tab. To sign out,
clear the site storage.

## Routes

| Route | Screen |
| --- | --- |
| `/login` | 11A · Staff Login |
| `/forgot-password` | 11B · Forgot Password |
| `/reset-password` | 11C · Reset Password |
| `/verify` | 11D · Multi-Factor Verification |
| `/` | 10A · Resumen general |
| `/tables` | 02 · Mesas (live operation): floor plan per space (tables with chairs by capacity, live account and time seated, zoom and fit, space tabs), Plano / Lista switch, search, "Cargar pedido" panel (02C: table selector, product search and quick categories, current order with kitchen note and total, "Asignar pedido") and quick-detail panel (02D: shared total, products grouped by order with kitchen status, "Cargar pedido / productos", "Cobrar mesa"), and the "Cobrar Mesa NN" dialog ("Medio de pago" among the methods enabled in 06, with the customer's preference as a hint only; "Propina": "Sin propina", 10% / 15% of the table total or "Otro monto"; Subtotal, Propina and "Total a cobrar"; "Registrar cobro" disabled until a method is chosen and the amount is valid; the tip is recorded with the collection, apart from the bill amount); loaded orders and charged tables update tiles, totals and summary in memory for the session (they do not reach other screens); spaces, tables and positions come from the shared venue store |
| `/tables/management` | Gestión de mesas (no export, built from 02/09): space tabs with "Nuevo espacio", the active space's plan in edit mode (drag tables with snapping to an 8px grid and clamping, arrow keys move the focused table 8px / Shift 40px, overlapping drops are refused), side panel with the table form (09B fields plus shape; "Eliminar mesa" deletes only tables that never had a session, otherwise offers to disable) or the space form (name, icon, color, delete when empty) with the ordered space list (reorder); deep links `?table=<id>|new`, `?space=<id>|new` |
| `/orders` | 03 · Gestión de pedidos (kanban, order drawer, cancel confirmation) |
| `/bill-requests` | 04 · Solicitudes de cuenta (requests table, quick-detail drawer) |
| `/history` | 05 · Historial de cobros (collections table with period, filters and pagination; read-only collection drawer) |
| `/payments` | 06 · Configuración de pagos (methods, request modes and bank details tabs, live customer preview, in-memory save after confirming) |
| `/menu/products` | 07 · Productos: list with metrics, search, filters and Duplicar / Archivar / availability (07A), editor (07B) and customer preview (07C) of the same draft, in-memory save |
| `/menu/categories` | 08 · Categorías y momentos: "Organización de la carta" tabs with moments (08A, visibility and drag/keyboard reordering) and categories (08C, search and reordering), moment editor with live phone preview (08B), category editor with archive confirmation (08D) and customer explore preview (08E), in-memory save |
| `/tables/qr` | 09 · Mesas y códigos QR: QR credentials only: tables list with filters and quick enable/disable (09A), space cards, "Nueva mesa" and row "Editar" linking to Gestión de mesas, QR detail with copy / PNG / SVG / PDF and token regeneration after confirming (09C, 09F), printable card and A4 sheet (09D), bulk print modal with A6 / compact A4 sheets (09E); real QR codes (`qrcode`) pointing to `NEXT_PUBLIC_CUSTOMER_APP_URL` (default `http://localhost:3000`) `/?mesa=NN&qr=<token>`; printing uses `window.print()` with print CSS |
| `/menu`, `/settings`, `/staff` | "Próximamente" placeholder |

### Forced variants (`?state=`)

| Route | Values |
| --- | --- |
| `/login` | `error` (invalid credentials) |
| `/forgot-password` | `sent` (generic confirmation) |
| `/reset-password` | `mismatch`, `success` |
| `/verify` | `error` (wrong code) |
| `/tables` | `empty` (no tables), `no-results` (search for "Mesa 99"), `list` ("Lista" view), `terraza` (Terraza plan), `load-order` (02C: Cappuccino and Medialuna for Mesa 02), `detail` (02D: Mesa 02), `charge` ("Cobrar Mesa 02" dialog with no method chosen) |
| `/tables/management` | `table-edit` (Mesa 07), `table-new`, `space-edit` (Salón renamed, unsaved), `space-new` ("Barra" typed), `delete-table` (Mesa 01 has history: offers to disable), `delete-space` (Patio has tables: blocked), `errors` (Mesa 07 renamed "Mesa 05" with capacity 0 after saving) |
| `/tables/qr` | `detail` (09C: Mesa 07), `regenerate` (09F), `material` (09D: Mesa 07), `bulk-print` (09E); the old `edit`, `new`, `errors`, `space-edit`, `space-new` redirect to their Gestión de mesas variants |
| `/orders` | `detail` (drawer of #1051), `cancel` (cancel dialog of #1051), `empty` (no orders), `no-results` (search for "9999") |
| `/bill-requests` | `selected` (drawer of Mesa 10), `empty` (no requests), `no-results` (search for "Mesa 99") |
| `/history` | `selected` (drawer of COB-0026), `empty` (no collections), `no-results` (search for "Mesa 99") |
| `/payments` | `bank` ("Datos bancarios" tab), `bank-errors` (invalid alias and CBU after a save attempt), `confirm` (save confirmation with a pending change) |
| `/menu/products` | `edit` (07B: Cappuccino with "Tomar" added, unsaved), `preview` (07C of that draft), `new` (empty new product), `errors` (Cappuccino after publishing without a name and with an invalid price) |
| `/menu/categories` | `moment-edit` (08B: Para desayunar with Limonada added, unsaved), `moment-new`, `moment-errors` (saved without a name), `categories` (08C tab), `category-edit` (08D: Cafés with the export description, unsaved), `category-new`, `category-archive` (Cafés waiting for the archive confirmation), `preview` (08E of Para desayunar) |

## Structure

- `src/app/(auth)` — auth screens with the split brand layout.
- `src/app/(admin)` — authenticated shell (sidebar + top bar) and modules.
- `src/features/<feature>` — screens, presentational components and pure helpers (with tests).
- `src/shared/ui`, `src/shared/lib` — reusable primitives and utilities.
- `src/mocks` — typed mock data and mock auth.
  - `src/mocks/service-day` — the single "service day" (21/10/2026 at 14:42) that 10A, 02, 03, 04 and
    05 derive their rows and metrics from: tables sessions, orders, bill requests, collections, the
    product catalogue (also the 07 products screen: categories, moments, options, images in
    `public/images/products` copied from the customer app by `scripts/copy-product-images.mjs`;
    and the 08 menu organization: moment and category metadata, moment covers in
    `public/images/moments` copied by `scripts/copy-moment-images.mjs`; counts are always derived),
    staff and the 06 payment method / request mode names. `service-day.test.ts`
    checks that the screens agree with each other. Some numbers differ from the exports on purpose
    (see `odd/tasks/admin-mock-unification.md`). Each screen keeps its in-memory actions to itself,
    except the venue configuration below.
  - `src/features/venue` — the shared venue store (`useSyncExternalStore`): spaces and tables
    seeded from the service day and edited in Gestión de mesas, read by `/tables`,
    `/tables/management` and `/tables/qr`. It lives in memory for the browser session: client
    navigation keeps the changes, a full reload starts again from the seed (the server and the
    hydration render always use the seed).
  - `src/mocks/payments.ts` — the saved 06 payment configuration.
