# Admin orders on the API

## Objective

Run the admin orders board (03 · Gestión de pedidos) on the real `/orders` API instead of the
`ORDERS_BOARD` mock, then let staff create orders from the panel.

## Problem / why

The board reads `ORDERS_BOARD` and keeps every change in memory, so it loses state on reload and
never sees orders created elsewhere. The API now exposes orders (feature `api-catalog-orders`).

## Scope

- Orders API client in `admin/src/features/orders` (self-contained; does not depend on `venue`,
  which `refactor/admin-core-modules` deletes). Follows the `/api` rewrite and cookie session.
- Map API orders to the board model (`HH:MM` times in the service time zone, lowercase statuses,
  cancellation reasons snake_case ↔ kebab-case, item options as `customization`).
- Board loads the day's orders, refreshes them periodically (~10 s) for the "En vivo" view, and
  sends advance / cancel to the API; errors surface without losing the board.
- Create order from the panel (T2): flow and design to be agreed before implementation.

## Constraints

- Keep the existing presentational components and pure view helpers; change the container and state.
- Clock: elapsed times and delays use the real current time, not `SERVICE_DAY.now`.
- Forced `?state=` variants keep working where they still make sense (empty, no-results) or are dropped
  with a note.

## Acceptance criteria

- Board shows API orders; advancing and cancelling persist across reloads.
- `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build` pass in `admin/`.

## Tasks

- [x] T1 — Orders API client, mapper and board wiring (route: delegated writer; trigger: 2+ non-trivial files)
  - Feature-owned `Order` type (API id string for calls, `number` for display). Advance/cancel wait
    for the API (buttons disabled while pending); poll every 10 s while visible, newer `updatedAt`
    wins. Errors in `Notice`; 401 signs out. Real clock in the service time zone. Delivered orders
    leave the board 30 min after delivery. `?state=detail|cancel` removed.
  - Evidence: tsc, lint OK; 809 tests passed; build OK. Not yet exercised against a live API.
  - Commit `22fa936`. Review: medium; user declined for this candidate.
- [x] T2 — Create order from the panel (route: delegated writer; trigger: 2+ non-trivial files)
  - Agreed design: "Nuevo pedido" button on the board opens a side panel modeled on export
    "ADMIN 02C · Cargar pedido": table picker, product search + category chips, option picker for
    products with option groups, cart with quantities, kitchen note, total, submit via `POST /orders`.
  - Built in `features/orders/order-entry/` + shared `Drawer`. "Frecuentes" chip → "Todas" (no frequency data); table picker is a native select. 409 errors name the product line.
  - Evidence: tsc, lint OK; 845 tests passed; build OK. Full create flow not exercised live (login needs MFA).

## Delivery

Slice of the `feature-branch-chain` of `api-catalog-orders`: branch `feat/api-catalog-orders-admin-orders`
on top of `feat/api-catalog-orders-orders`. No overlap with `refactor/admin-core-modules` in
`features/orders`, `mocks/types.ts` or `features/auth`.

## Next step

T1.
