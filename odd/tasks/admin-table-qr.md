# Feature: admin-table-qr

## Objective
Admin module to manage table QR codes: list the existing tables, preview each QR, download it, print cards,
and regenerate its token. The module is wired to the real `tables` API.

## Problem / Why
The admin was trimmed to core modules (`odd/tasks/admin-core-modules.md`, commit `2813bbd`). That removed the
mock-era `table-qr`, `venue` and `table-management` features. The API already serves table QR credentials
(`odd/tasks/api-tables.md`), but the admin has no screen to see, print or rotate them.

## Decisions (user, 2026-11-02)
- Scope: **QR only**. No table or space CRUD; tables come from the seed or the API.
- Rebuild on the `orders` module pattern, recovering pure logic from `git show 2813bbd^:admin/src/features/table-qr/<file>`.
  Drop any dependency on `features/venue`.

## Scope
- In scope:
  - `admin/src/features/table-qr/`
  - the route `admin/src/app/(admin)/tables/qr/page.tsx`
  - a sidebar entry
  - the `qrcode` and `@types/qrcode` dependencies
  - Vitest tests for the pure logic
- Out of scope:
  - table and space CRUD
  - the web app reading `?mesa=&qr=` (logical next feature)

## Constraints
- Admin Next.js has breaking changes: read `admin/node_modules/next/dist/docs/` before writing Next-specific code.
- Commits use Conventional Commits, without AI attribution.

## Delivery strategy
- `feature-branch-chain`, cached from api-foundation and api-tables: one branch and one PR per module, on the
  branch `feat/admin-table-qr`.
- Forecast is about 1,000 authored lines, mostly restored code.
- Slices follow the task commits.

## Tasks
- [x] T1 Data layer: `table-qr-api.ts` (`getTablesConfig`, `regenerateQr`) and `table-qr-mapper.ts`, with tests.
  Route: delegated (2+ non-trivial files). Commit `dd4653c`.
- [x] T2 QR rendering: deps, `qr-url.ts`, `qr-matrix.ts`, `QrCode.tsx`, `qr-download.ts`, with tests.
  Route: delegated. Commit `da6026c`.
- [x] T3 Screen: page route, `TableQrScreen`, `use-table-qr.ts`, `TableList`, `QrDetail`, `RegenerateDialog`,
  and a `NAV_ITEMS` entry. Route: delegated. Commit `38313db`.
- [x] T4 Printing: `print-card.ts`, `print-selection.ts`, `BulkPrintModal`, and the print sheets, cards and portal.
  Route: delegated. Commit `e1aa0aa`.

## Acceptance criteria
- `/tables/qr` lists the tables from `GET /tables/config`.
- Each QR encodes `${NEXT_PUBLIC_CUSTOMER_APP_URL}/?mesa=NN&qr=<token>`.
- Regenerating calls `POST /tables/:tableId/qr/regenerate` and updates the token and audit number.
- Download as SVG/PNG works, and printing one card or a selection of cards works.

## Checks
- `pnpm --filter admin test`
- `pnpm --filter admin typecheck` (or `tsc --noEmit`)
- `pnpm --filter admin lint`

## Progress
- Branch `feat/admin-table-qr` created from `main` (2897f62).
- T1 (route: delegated; 376 added lines incl. ~190 of tests and fixture). RED observed: both new spec files failed
  (modules `table-qr-mapper`, `table-qr-api` not found) before GREEN. Checks: `vitest run src/features/table-qr`
  2 files / 10 tests passed; `tsc --noEmit` clean; `eslint` clean. Commit `dd4653c`.
- T1 decisions: the API table is `{ id, number, label, spaceId, capacity, description, enabled, version, layout,
  qr: { token, issuedAt, issuedBy: { id, name } } | null, revokedQrs: [{ ...credential, revokedAt, auditNumber }] }`.
  The active credential has no audit number; audit numbers live on revoked credentials (newest first). View model
  `TableQr = { id, number, label, spaceId, spaceName, enabled, qr: { token, issuedAt, issuedBy } | null, revoked }`
  (ISO dates kept as strings, `issuedBy` flattened to the staff name). Errors: `invalid` (400 issues), `conflict`
  (409, API code kept as a string), `not-found`, `unauthorized`, `network`, `unknown`.
- T2 (route: delegated; ~280 authored lines, mostly restored from `2813bbd^`, plus the `admin/package-lock.json`
  update). RED observed for the restored specs: `qr-url.test.ts` and `qr-matrix.test.ts` failed (modules not found)
  before the code was restored unchanged. `qr-download.test.ts` is new over restored code (stubbed `document` and
  `navigator`; no separate RED). Checks: `vitest run src/features/table-qr` 5 files / 23 tests passed; `tsc --noEmit`
  clean; `eslint` clean. Commit `da6026c`.
- T2 deviation: the admin is an npm project (`admin/package-lock.json`, no pnpm workspace at the repo root), so the
  dependencies were added with `npm install` (`qrcode ^1.5.4`, dev `@types/qrcode ^1.5.6`) and the npm lockfile
  changed; `pnpm --filter admin …` does not apply here.
- T3 (route: delegated; ~1,040 added lines, ~430 of them tests). Over the 400 heuristic because the page, container,
  hook, reducer, view logic, error copy, list, detail and dialog ship together as one usable screen. RED observed: the
  new specs `table-qr-view`, `table-qr-state`, `table-qr-errors` and `qr-file-name` failed (modules not found) and 3
  `navigation.test.ts` cases failed (no "QR de mesas" entry) before GREEN. Checks: `vitest run` 46 files / 514 tests
  passed; `tsc --noEmit` clean; `npm run lint` clean. Commit `38313db`.
- T3 decisions: one page instead of the old list/detail/material views: the list (search + "Espacio" filter) on the left
  and the selected table's QR panel on the right (stacked below `lg`); the first table is selected on load and the
  selection survives reloads. Nav entry `table-qr` "QR de mesas" → `/tables/qr` (lucide `QrCode`), placed before
  "Configuración", default `section` top bar. Credential dates ("hoy", "12 jun") use the venue time zone
  (`America/Argentina/Buenos_Aires`, as the orders board). A rotation closes the confirmation, shows "Regenerando…" and
  applies the API's configuration with a success notice; 404 reloads the list; 401 signs out (auth guard → /login).
  Tables without a credential offer "Generar código QR" (the API's rotation issues the first one). `getQrFileName`
  moved to `qr-file-name.ts` (the downloads need it before the print card). No `?state=` forced variants.
- T4 (route: delegated; ~685 added / 14 deleted, ~170 of them tests; card, sheets and portal restored from `2813bbd^`).
  RED observed: `print-card.test.ts` and `print-selection.test.ts` failed (modules not found) before GREEN; the
  selection spec was rewritten over `TableQr` fixtures (the old one read `@/mocks/service-day`) and extended with the
  bulk-print state and view. Checks: `vitest run` 48 files / 529 tests passed; `tsc --noEmit` clean; `npm run lint`
  clean; `next build` ok (`/tables/qr` static). Commit `e1aa0aa`.
- T4 decisions: single printing lives in the QR panel ("Imprimir tarjeta" prints the selected table's 09D card through
  `PrintPortal`, "Tarjeta PNG" downloads it at 960px); selection printing is the "Imprimir códigos QR" modal (space,
  A6/compact size, checklist, A4 preview, "Imprimir o guardar PDF"), built on the shared `Modal` instead of the old
  fixed 09E overlay so it works below `lg`. Only one print root renders at a time (sheets while the modal is open, else
  the selected card). No list checkboxes: the modal's checklist is the selection. Dropped the old 09D "material" view
  and its `SheetCard`.
- Pending: signed-in manual smoke against a running API (load, copy, PNG/SVG, print single and bulk, regenerate and
  reload); the customer web app does not read `?mesa=&qr=` yet (out of scope).

## Next step
All tasks done. Run the signed-in smoke, review the branch and decide delivery (push / PR `feat/admin-table-qr`).
