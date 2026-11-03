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
  - Review: medium (migration is executable), under budget (265 lines); pending in the slice with
    T2. Parent spot check: `pnpm --dir api typecheck` OK.
- [x] T2 — API: public menu read for `web/` (route: delegated writer; trigger: 2+ non-trivial files)
  - Built: `GET /catalog/menu` (module-prefixed like the public `GET /tables/qr`), no
    `SessionGuard`, served by `CatalogMenuController` and the `GetMenu` use case
    (`application/get-menu.ts`). Answers `{ categories: MenuCategory[]; products: MenuProduct[] }`:
    visible categories by position as `{ id, name, description }`; products that are published,
    available, not archived (`orderBlock(product) === null`) and in a visible category, by category
    position then product position, as `{ id, name, plural, description, price, categoryId, image,
    moments, allowCustomerNotes, optionGroups }` (groups: `id, title, selection, required, max,
    defaultOptionId, options[{ id, name, priceDelta }]`). No sku, version, publication, archived
    or dates.
  - Decision: unavailable products are left out (not sent with `available: false`): the web
    `Product` type (`web/src/mocks/types.ts`) and features have no availability / sold-out state.
    This also matches what `ResolveOrderableProducts` lets customers order.
  - CORS: `configureApp` (`api/src/app.setup.ts`) enables CORS with `credentials: true` for
    `CORS_ORIGINS` (`api/src/shared/config/env.ts`, default `http://localhost:3000,http://localhost:3002`).
    The web origin can call the API directly only if it is listed there. Locally `web/` and
    `admin/` both run plain `next dev` (port 3000, the second one falls to 3002 while the API holds
    3001), so both default origins are allowed; in production the web origin must be added to
    `CORS_ORIGINS`. Not changed here; T4 picks CORS vs a Next rewrite.
  - Evidence: RED first (`get-menu.spec` failed to import, catalog e2e `/catalog/menu` 404), then
    GREEN. `typecheck`, `lint` clean; `test` 27 files / 194 tests passed.
  - Known gaps: categories without menu products are still listed (the web can hide empty ones);
    web category/moment ids differ from the API ones — T4 maps them; no caching headers.
- [ ] T3 — Admin: products screen through the API (route: delegated writer; trigger: 2+ non-trivial files)
- [ ] T4 — Web: menu from the public API (route: delegated writer; trigger: 2+ non-trivial files)

## Acceptance criteria

- A product created in the admin survives a reload and appears in `GET` of the API.
- A published product of a visible category appears in the customer app.
- API, admin and web tests, typecheck and lint pass.

## Progress

- Branch `feat/products-api-persistence` created from `main` (`d7e03b7`).
- T1 done in `8f5636b` (feat(api): store moments, plural and image on products); ~170 authored
  code/test lines.

## Next step

T3.
