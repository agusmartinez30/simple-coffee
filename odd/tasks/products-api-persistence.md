# Products persisted through the API

## Objective

Products created or edited in the admin are saved in the database through the API, and the
customer app (`web/`) shows the menu from the API instead of mocks.

## Problem / why

- `admin/src/features/products/ProductsScreen.tsx` starts from `@/mocks/service-day/catalog`
  and keeps every change in memory only; the availability save is simulated
  (`product-availability.ts`).
- `web/` reads its menu from `@/mocks/menu`, `@/mocks/moments`.
- The API catalog (`api/src/modules/catalog`) already persists products with Prisma, but it lacks
  `image`, `moments` and `plural`, and every `/catalog/*` route needs a staff session.

## Scope

- API: add `moments` (list of moment ids), `plural` (optional) and `image` (optional URL/path
  text) to products: domain, schemas, Prisma migration, repository, seed, tests.
- API: public, session-less read of the menu (published, available-or-not, non-archived
  products of visible categories) for `web/`.
- Admin: products screen lists, creates, edits, duplicates, archives, restores and toggles
  availability through the API.
- Web: menu, explore and product detail read from the public API.

Out of scope: image file upload (image stays a URL/path string), menu-organization screens.

## Constraints

- Follow existing patterns: `orders-api.ts` typed client + mapper in admin, `/api/*` rewrite to
  `API_URL`; NestJS module/use-case/repository layering in API.
- UI copy stays in Spanish as today; code and docs in English.

## Decisions

- 2026-11-03: user chose to add `image`, `moments`, `plural` to the API (not leave them out).

## Delivery

- Strategy: `ask-on-risk`. Forecast: ~1200 authored lines across 4 tasks → above 400; chain
  strategy to ask before the second slice.

## Tasks

- [x] T1 — API: `moments`, `plural`, `image` on products (route: delegated writer; trigger: 2+ non-trivial files)
  - Built: `Product`/`ProductDraft` gain `moments` (ids `desayunar|merendar|cenar|tomar`, the admin
    ones), `plural` and `image` (string | null, blank → null). Issues: `plural` too_long (60),
    `image` too_long (500), `moments.N` unknown_moment / duplicate. Create defaults: `[]`, null,
    null. Zod schemas, Prisma columns + migration `20261103000000_product_moments_plural_image`,
    repository mapping, in-memory fixture and seed (moments/plural/photos from the admin mock).
  - Evidence: RED first (product.spec 3 failing, catalog e2e 1 failing), then GREEN.
    `typecheck`, `lint` clean; `test` 26 files / 190 tests passed. Migration SQL equals
    `prisma migrate diff` from the previous schema. Commit: see Progress.
  - Known gaps: web moment ids are `para-desayunar|…` (not the admin ids) — T4 must map them;
    image accepts any text up to 500 (no URL/path format check); migration not applied to a live
    DB here; `pnpm --filter api` matches nothing (package is `cafe-central-api`, no workspace
    file) — scripts were run inside `api/`.
- [ ] T2 — API: public menu read for `web/` (route: delegated writer; trigger: 2+ non-trivial files)
- [ ] T3 — Admin: products screen through the API (route: delegated writer; trigger: 2+ non-trivial files)
- [ ] T4 — Web: menu from the public API (route: delegated writer; trigger: 2+ non-trivial files)

## Acceptance criteria

- A product created in the admin survives a reload and appears in `GET` of the API.
- A published product of a visible category appears in the customer app.
- API, admin and web tests, typecheck and lint pass.

## Progress

- Branch `feat/products-api-persistence` created from `main` (`d7e03b7`).

## Next step

T2.
