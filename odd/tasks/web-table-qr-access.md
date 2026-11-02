# Feature: web-table-qr-access

## Objective
The customer web app recognizes its table from the printed QR URL `/?mesa=07&qr=<token>`. It validates the QR
against the public API `GET /tables/qr?number=&token=`, and replaces the mock table number.

## Problem / Why
The admin prints table QR codes (`odd/tasks/admin-table-qr.md`), but the web app ignores `?mesa=&qr=`. It shows
a hardcoded `TABLE = { number: "07" }` (`web/src/mocks/table.ts:4`), so a QR never reaches a real table.

## Decisions (user, 2026-11-02)
- Without a valid QR, the menu stays browsable. "Mi mesa" and ordering are blocked by the 09E "Sesión no disponible"
  card, which asks the customer to scan the table QR.
- Credentials persist in localStorage and are revalidated on every load. Switching to another table or token resets
  the table session.

## Scope
- In scope:
  - the `/api` rewrite in `web/next.config.ts`
  - `web/src/features/table-access/`
  - the provider in the layout
  - the gating and copy in `WelcomeScreen`, `ExploreLanding` and `TableScreen`
  - the cleanup of the `TABLE` mock
- Out of scope: real orders and sessions on the API, and table CRUD in the admin.

## Constraints
- Next 16 has breaking changes and `cacheComponents: true`. Read `web/node_modules/next/dist/docs/` before writing
  Next-specific code.
- The web app uses npm (`web/package-lock.json`).
- Commits use Conventional Commits, without AI attribution.

## Delivery strategy
- `feature-branch-chain`: one branch and one PR (`feat/web-table-qr-access`, from `main` 2897f62).
- Forecast is about 600 authored lines.

## Tasks
- [x] T1 Data layer: rewrite, `table-qr-params.ts`, `table-access-api.ts`, `table-access-state.ts`,
  `formatTableNumber`, with tests. Route: delegated.
  - Evidence: RED `npx vitest run src/features/table-access` → 4 files failed (modules missing); GREEN → 4 files,
    29 tests passed; `npx tsc --noEmit` clean. Commit: see Progress.
  - Decisions: params are validated client-side with the API schema (number `^\d{1,6}$`, token 1–64), so a
    malformed URL is "no QR" and never hits the API. 400/404 → `invalid`; fetch failure, other non-2xx and an
    unexpected 200 body → `network` (keeps the credentials, shows offline). `sameTableCredentials` compares numbers
    by value ("07" = "7"). The reducer drops a stale `resolved` whose credentials are not the ones being checked.
    `formatTableNumber` lives in `table-number.ts`.
- [x] T2 `TableAccessProvider`: read URL params, persist and revalidate, clean the URL, reset the session on a table
  change; `useTableAccess()`. Route: delegated.
  - Evidence: RED `npx vitest run src/features/table-access/table-access-plan` → "Cannot find module
    './table-access-plan'"; GREEN `npx vitest run` → 19 files, 140 tests passed; `npx tsc --noEmit` and
    `npx eslint src/features/table-access src/app` clean. Commit: see Progress.
  - Decisions: pure `planAccess(urlCreds, storedCreds)` and `planOutcome(check, result)` drive the effects.
    Valid → save credentials, strip the URL if they came from it, `reset()` only when stored credentials existed and
    differ (a first scan keeps the session). Rejected → clear storage and strip the URL. Network → keep storage and
    URL untouched so a reload retries; `retry()` re-runs the last check. The provider reads `window.location` in a
    mount effect (no `useSearchParams`/Suspense in the layout); `replaceState` keeps `history.state`, path, other
    params and hash. A run counter drops answers superseded by a newer check or the Strict Mode re-mount.
    Storage key `cafe-central:table-access:v1`.
- [ ] T3 UI wiring: welcome badge, explore subtitle, `TableScreen` gate with `TableAccessCard` (09E), `customerName`,
  and the mock cleanup. Route: delegated.

## Acceptance criteria
- `/?mesa=07&qr=<valid>` shows "Mesa 07", the URL is cleaned, and "Mi mesa" works. A reload keeps the table.
- After regenerating the QR in the admin, "Mi mesa" shows the 09E card and the menu stays browsable.
- If the API is down, ordering is blocked and the offline variant is shown.

## Checks
In `web/`: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npx next build`.

## Progress
- Branch `feat/web-table-qr-access` created from `main` (2897f62).

## Next step
T1–T3 by one delegated writer, with one commit per task.
