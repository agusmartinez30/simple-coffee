# table-ordering

## Objective
Make Mi mesa (`/table`) the only place where guests review and send their order.

## Why
Simplified flow: guest picks products -> the order is shown on `/table` -> guest sends it. No separate cart / confirm / order-status screens and no kitchen statuses on the client.

## Scope
- `/table` shows the pending order (cart lines with quantity controls, subtotal) and an "Enviar pedido" button that places it via `placeOrder` and clears the cart.
- Delete `/order`, `/order/confirm`, `/order/[orderId]` and the screens/helpers only they use in `features/order`.
- Every link / CTA to `/order` points to `/table`.
- Client orders have no status: drop `OrderStatus` (`sent | preparing | delivered | cancelled`), `setOrderStatus`, status pills on order cards, status labels; bump table-session storage key to v5.
- Customer name: orders placed from the table use `Mesa {number}`.

## Constraints
- All changes inside `web/`; admin and api untouched (admin kanban keeps its own statuses).
- UI copy stays in Spanish (existing project language).

## Tasks
- [x] T1 Mi mesa shows and sends the order; delete `/order*` routes and dead `features/order` code; CTAs to `/table` (route: delegated, writer trigger: 10+ files)
- [x] T2 Remove order statuses from client model, session, mocks, tests and UI (route: delegated, writer trigger: 5+ files)

## Checks
- `pnpm --dir web test`
- `pnpm --dir web build`
- `rg "\"/order|features/order/|OrderStatus|setOrderStatus|ORDER_STATUS" web/src` -> no hits

## Delivery
Strategy: ask-on-risk. Forecast: ~400-600 changed lines, mostly deletions.

## Progress
- Branch `feat/table-ordering` created. Uncommitted start: "Enviar pedido" button in `TableScreen.tsx`.

- T1: `/table` shows "Tu pedido" (cart lines via `CartLineItem` + subtotal, hidden in the error view) above the history; "Enviar pedido" in the footer places it as `Mesa {number}`. `/order*` routes and `features/order` deleted; `CartLineItem` + `cart-lines` (ex `order-lines`, minus `countOrderItems`/`summary`) moved to `features/table`; CTAs point to `/table`. Status labels inlined in `OrderCard` until T2. Commit: 5d05339.
  - Verification: `pnpm --dir web test` 14 files / 92 tests pass; `tsc --noEmit` clean (after `next typegen` refreshed stale `.next/types`); `pnpm --dir web lint` clean. TDD exception: UI wiring and file moves have no meaningful RED; kept helper tests moved with the helper.

- T2: `OrderStatus` and `TableOrder.status` removed; every order counts in totals/summary and in the open/empty view decision. Session drops `setOrderStatus`, status validation and `status: "sent"`; storage key bumped to `cafe-central:table-session:v5`. `OrderCard` has no status pill; "El total excluye productos cancelados." note removed (`StatusPill` kept for the table status row). Commit: see `git log` (`refactor(web): drop order statuses from the client`).
  - Verification: RED first (3 failing: seed without status, buildOrder without status, parse accepts statusless order), then `pnpm --dir web test` 14 files / 93 tests pass; `tsc --noEmit` clean; `pnpm --dir web lint` clean; `pnpm --dir web build` succeeds (no `/order` routes); `rg "\"/order|features/order/|OrderStatus|setOrderStatus|ORDER_STATUS" web/src` -> no hits.

## Next step
Manual check of `/table` in the browser (add items, send, history updates); then push / PR is the user's call.
