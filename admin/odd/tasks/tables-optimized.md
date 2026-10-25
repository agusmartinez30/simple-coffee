# Feature: tables-optimized

## Objective
Update the admin `/tables` screen to the improved exports:
- `web/exports/ADMIN 02 · Gestión de Mesas · Desktop-export.html` (floor plan board)
- `web/exports/ADMIN 02C · Gestión de Mesas · Cargar pedido-export.html` (load order panel)
- `web/exports/ADMIN 02D · Gestión de Mesas · Detalle mesa ocupada-export.html` (occupied table quick detail)

## Problem / Why
The current `/tables` screen follows the original 02 exports. The new proposal adds a live header ("En vivo · hh:mm:ss", "Cargar pedido a mesa"), occupancy summary chips, table search, Plano/Lista toggle, area tabs (Salón / Terraza / Patio), table tiles with total and elapsed time, a "Cargar pedido" panel (product search, categories, current order, kitchen note, assign to table) and a quick detail panel for occupied tables (shared bill total, products grouped by order with status, "Cargar pedido / productos", "Cobrar mesa").

## Scope
- In: `admin/src/features/tables/**`, `admin/src/mocks/**`, `admin/src/app/(admin)/tables/page.tsx` (and its route folder except `management/`), related tests and README.
- Out: shared sidebar/shell (keeps the shared admin navigation, consistent with previous screens), `/tables/management` editor and table-resize behavior, other admin screens.

## Constraints
- English identifiers/comments; UI copy in Spanish as in the exports.
- Test-first for pure helpers (vitest), time passed in (mock clock).
- Respect the unified service-day mock invariants (`service-day.test.ts`); record deviations from export data.
- Existing `/tables` behavior that the exports keep (floor plan from the stored layout, table sizes) keeps working.

## Delivery strategy
`ask-on-risk`. Forecast ~600–900 authored lines; chain strategy for PRs is asked before opening PRs (local work-unit commits only).

## Tasks
- [x] T1 Pure helpers + mock data test-first: occupancy summary (available / occupied / bill requested), table tile view model (total, elapsed "18 min" / "1 h 08 min", party size), search and area filter, list view rows, occupied-table detail (shared total, products grouped by order with status), draft order builder (add/remove products, quantities, note, total, assign to table updates the service day in memory). Route: delegated. Commit: see Progress.
- [ ] T2 Board redesign (02): header, summary chips, search, Plano/Lista toggle, area tabs, table tiles, list view. Route: delegated.
- [ ] T3 Panels (02C, 02D): "Cargar pedido" panel and occupied-table quick detail, wired to the in-memory state ("Cobrar mesa" reuses the existing payment/close flow if one exists, otherwise closes in memory and records the deviation). Route: delegated.

## Acceptance criteria
- `/tables` visually matches the 02, 02C and 02D exports at 1440×900 (with `?state=` variants for the panels if needed).
- Loading an order to a table updates its tile, total and the summary; the occupied detail reflects the table's orders.
- `npm run lint`, `npx tsc --noEmit`, `npx vitest run` and `npm run build` pass in `admin/`.

## Checks
lint, tsc, vitest, build.

## Progress / Evidence
- Branch `feat/tables-optimized` from main `ef0f81d` (independent of `feat/orders-optimized`).
- T1 done (route: delegated writer, preparation + 3 new modules). Already present from earlier work and reused, not rewritten: occupancy summary (`getPlanSummary`), tile view model with stored layout/size (`getSpacePlan`), elapsed time (`formatDuration`), search (`filterTables`), area tabs (`getSpaceTabs`), list rows (`TableBoard` list). New pure modules in `src/features/tables`:
  - `table-service.ts`: `assignOrder` (adds a `received` order priced from the catalogue to the open session, opening one at the mock clock when the table is free; empty / unknown product / non-live table → same day) and `closeTable` ("Cobrar mesa": closes the session, finalizes the bill request with the staff member, appends a collection; method from the request mode, register/cash without request). Both are immutable over `ServiceDay`, so tiles, totals and the summary derive from the new day.
  - `order-draft.ts`: draft builder (add / remove one unit, table, note), "Pedido actual" summary (`1×`, subtotals, "2 ítems", total), assign guard and label, "Categorías rápidas" (`Frecuentes` = today's top 4 sellers, `Cafés` = cafes, `Comidas` = tostadas/tostados/sándwiches/hamburguesas, `Extras` = panadería/postres/bebidas/licuados), accent-insensitive menu search over orderable products, "Mesa 02 · 4 personas" table options.
  - `table-detail.ts`: 02D view model (badge, shared total, "N productos", products grouped by order with status `Confirmado` (received) / `En cocina` (preparing) / `Entregado` (delivered), account tag `Cuenta abierta` or `Pago en caja|en mesa|por transferencia`, free-table copy, `canCharge`).
  - `@/mocks/service-day` now also exports `getOpenSession`, `getSessionOrders`, `getActiveBillRequest`, `getOrderTotal`.
- T1 evidence: RED `npx vitest run src/features/tables` → 3 files failed (missing `./table-service`, `./order-draft`, `./table-detail`); GREEN 68/68 in the folder on first implementation. Checks: `npm run lint` OK, `npx tsc --noEmit` OK, `npx vitest run` 45 files / 592 tests passed.
- T1 deviations: no export data replaced the service day; values derive from it (Mesa 02 account $16.800 with orders #1046/#1050, not the 02D $14.300 with #1062/#1068; catalogue prices, e.g. Cappuccino $4.600 and Medialuna $3.900, not $3.800/$1.900). There is no product called "Extras" in the catalogue, so `Extras` groups the side categories. Staff-loaded orders use the staff member's name as `customer`.

## Next step
T2.
