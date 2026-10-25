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
- [x] T1 Pure helpers + mock data test-first: occupancy summary (available / occupied / bill requested), table tile view model (total, elapsed "18 min" / "1 h 08 min", party size), search and area filter, list view rows, occupied-table detail (shared total, products grouped by order with status), draft order builder (add/remove products, quantities, note, total, assign to table updates the service day in memory). Route: delegated. Commit: 636caf9.
- [x] T2 Board redesign (02): header, summary chips, search, Plano/Lista toggle, area tabs, table tiles, list view. Route: delegated. Commit: 514a16e.
- [x] T3 Panels (02C, 02D): "Cargar pedido" panel and occupied-table quick detail, wired to the in-memory state ("Cobrar mesa" reuses the existing payment/close flow if one exists, otherwise closes in memory and records the deviation). Route: delegated. Commit: 6b586c4.

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
- T2 done (route: delegated writer). Headless comparison at 1440×900 of `/tables` against the 02 export showed the board (title, subtitle, live pill, summary chips, "Buscar mesa", Plano/Lista switch, floor label, tiles with total and "◷" time, zoom controls, space tabs) already matched from earlier work; the remaining 02 differences were the default selection and the tab position. Changes: the board now opens with no table selected (full-width plan, Mesa 05 is no longer preselected) and the space tabs are centered at the bottom of the plan for any plan width. The header action "Cargar pedido a mesa" lands with its panel in T3. Stored layout and table sizes keep driving the plan. Test-first exception: presentational change, no meaningful runnable RED; checked visually. Checks: `npm run lint` OK, `npx tsc --noEmit` OK, `npx vitest run` 45 files / 592 tests passed.
- T2 deviations (02): shared sidebar and top bar kept ("Sofía M." session user, full navigation) instead of the export's reduced sidebar; tables keep their configured spaces (Salón shows its own tables; the export draws all twelve in "Salón principal") and stored coordinates (export spreads columns at 60/330/600/870 for the wide plan); floor label is the space name ("Salón"); summary counts, totals and times derive from the service day (2 disponibles / 5 ocupadas / 5 solicitan cuenta, "En vivo · 14:42:18", Mesa 02 "◷ 52 min"), not the export's 4/5/3, 10:42:18 and 18 min; tabs are centered (the export places them about 50px left of center).
- T3 done (route: delegated writer, 2+ non-trivial files). `tables-state.ts` reducer (container-presentational like 03): in-memory `ServiceDay`, panel (`none` / `detail` / `order` with the draft) and pending charge; times from the mock clock `day.now`; assigning runs against the live venue tables (tables created this session included) and then shows the table's detail; "Cobrar mesa" asks for confirmation (`ConfirmDialog`) and frees the table. `TablesScreen` now derives tiles, list rows and summary from the reducer's day; `OrderPanel.tsx` (02C, docked 400px panel, 820px board column) and `TableDetailPanel.tsx` rewritten for 02D (900px column); header "Cargar pedido a mesa" opens the panel for the selected table or with "Elegí una mesa". `?state=load-order` (02C) and `?state=detail` (02D) added. Dead code removed: `getTableDetailStats`/`DetailStat` and their tests, `TablesBoard.selectedTableId` (Mesa 05 preselection) in the mocks. README route and variant rows updated.
- T3 evidence: RED `npx vitest run src/features/tables/tables-state.test.ts` → missing `./tables-state`; GREEN 10/10 on first implementation. Checks: `npm run lint` OK, `npx tsc --noEmit` OK, `npx vitest run` 46 files / 599 tests passed, `npm run build` OK (20 static routes). Headless Playwright at 1440×900: `/tables`, `?state=load-order`, `?state=detail` match the 02/02C/02D layouts (panel geometry, header, selector, chips, rows, current order, note, total, primary action; 02D badge, total box, grouped orders, status chips, account tag, note, both actions); flow check: Mesa 01 → "Cargar pedido / productos" → Cafés + search → add/remove → note → "Asignar pedido a Mesa 01" turned the tile to "$8.500, 0 min", summary 2→1 disponibles / 5→6 ocupadas, detail shows "Pedido #1054 · Confirmado"; "Cobrar mesa" → confirm freed it again (2/5/5); no page errors. `/tables/management` and `/tables/qr` still render (plan editor with `TableFigure` intact).
- T3 deviations (02C/02D): "Cobrar mesa" has no shared payment flow to reuse (04 has no finalize transition), so it closes in memory via `closeTable` with a confirmation dialog, and the effect stays on this screen (other screens read the seed day). Order panel: native `<select>` for "Mesa" with an "Elegí una mesa" option, a small "−" per current-order line to remove one unit, four best sellers under "Frecuentes" (export shows two), lists scroll inside the panel, empty/disabled states, and the panel fits its 400px (the export's content-box overflows to ~440px). "Ver menú completo →" links to `/menu/products`. Detail: shows `Entregado` for delivered orders (export shows only `Confirmado`/`En cocina`), payment preference tag for tables that asked for the bill, free-table copy and no "Cobrar mesa" for free tables. Header keeps "Cargar pedido a mesa" while the detail is open (02D hides it). Data deviations as in T1/T2 (Mesa 02 $16.800 with #1046/#1050 instead of $14.300 with #1062/#1068; catalogue prices).

## Next step
Human review; native review of the work-unit commits if RDD applies; chain strategy before opening PRs.
