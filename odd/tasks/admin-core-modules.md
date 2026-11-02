# Admin core modules

## Objective

Reduce the admin back office to its core modules so they can be reworked one by one.

## Problem / why

The admin carries 11 modules built against mocks. The user wants to keep only Orders, Digital menu,
Products, Categories and moments, and Settings, and remove the rest before working on them again.

## Scope

- Keep: `orders`, `menu`, `products`, `categories` (categories and moments), `settings` (payments).
- Remove: `overview` (`/`), `tables`, `table-management` (and `/tables/qr`), `bill-requests`,
  `history`, `staff` — routes, sidebar items, feature folders, mocks and tests used only by them.
- `/` redirects to `/orders`, since Resumen is gone.
- Shared code still used by a kept module stays (e.g. `venue`, `admin-shell`, `auth`).

## Constraints

- Removed code stays recoverable from git history; no rewrite of kept modules.
- Auth routes are untouched.

## Acceptance criteria

- Sidebar shows exactly the 5 kept modules.
- Removed routes and their exclusive code are deleted; no dead imports remain.
- `npm run lint`, `npx tsc --noEmit`, `npm test` and `npm run build` pass in `admin/`.

## Tasks

- [x] T1 — Remove the 6 modules and redirect `/` to `/orders` (route: delegated writer; trigger: 2+ non-trivial files and mapping of shared code)
  - Deleted features: overview, tables, table-management, table-qr, bill-requests, collections, venue
    (venue was only used by the table modules). Dropped `qrcode` deps. Redirect lives in `next.config.ts`.
  - Kept `mocks/service-day` intact (shared by kept modules; holds some now-unused fixtures).
  - Evidence: tsc 0, lint clean, 398 tests passed, build OK. Diff: +48 / -14940 (deletions, mechanical).

## Delivery

Strategy: `ask-on-risk`. Forecast: mostly deletions, likely above 400 lines but mechanical.

## Progress

- Branch `refactor/admin-core-modules` created.

## Next step

Rework the kept modules one by one, then reintroduce removed modules as needed.
