# client-simplify

## Objective
Simplify the customer web app (`web/`) so guests only browse products and place orders.

## Why
The bill request, payment preference, bill status and "order more" flows add complexity the product no longer wants on the client side.

## Scope
- Bottom nav: only Explorar (`/explore`) and Mi mesa (`/table`).
- Delete `/menu`; `/explore` is the main products screen. `/info` reachable from the Explore header.
- Delete bill flow (`features/bill`, `/table/bill`, `/table/bill/status`).
- Table session: drop `tableStatus`, `paymentPreference`, auto-close timer; bump storage key to v4.
- Mi mesa: read-only list of orders + total; no bill / order-more actions.

## Constraints
- All changes inside `web/`; admin and api untouched.
- UI copy stays in Spanish (existing project language).

## Tasks
- [x] T1 Nav + `/menu` removal (route: delegated, writer trigger: 10+ files) — `1b73439`
- [x] T2 Bill flow + table session cleanup (route: delegated) — `86aa8bc`
- [x] T3 Mi mesa read-only (route: delegated) — `48d0d87`

## Checks
- `pnpm --dir web test`
- `pnpm --dir web build`
- `rg "/menu|/table/bill|features/bill|paymentPreference|tableStatus" web/src` → no hits

## Progress
- Branch `feat/client-simplify` created.
- T1: BottomNav is Explorar + Mi mesa; `/menu` and its components deleted (WelcomeScreen + `LINE_ART_SRC` kept); every `/menu` link points to `/explore`; Explore header links to `/info`.
- T2: `features/bill` and `/table/bill(/status)` deleted; session keeps only `orders` (storage key `v4`); the closed-table guard left checkout. `table-view` stopped reading `tableStatus` here so the commit builds.
- T3: Mi mesa is read-only (views `open | empty | error`, forced `?state=empty|error`); bill buttons, payment chip, muted action styles and unused `formatUnitCount`/`itemCount` removed; BottomNav shows on open and empty.

## Verification (after T3)
- `pnpm --dir web test`: 14 files, 93 tests passed.
- `pnpm --dir web build`: success; routes no longer include `/menu` or `/table/bill`.
- `rg "/menu|/table/bill|features/bill|paymentPreference|tableStatus|setTableStatus" web/src`: only `@/mocks/menu` / `@/features/menu` module imports remain (no route references).

## Next step
Manual check in the browser, then the user decides about the PR.
