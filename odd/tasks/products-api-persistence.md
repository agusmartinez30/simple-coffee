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
- 2026-11-03: user chose chain strategy `feature-branch-chain`. Slices: S1 API (T1 `8f5636b`,
  T2 `f0cbbcf`), S2 admin (T3 `e62ec5f`), S3 web (T4). PRs target a feature integration branch,
  which merges to `main` once; push/PR creation stays with the user.

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
  - Review: T1+T2 slice medium, `slice_budget_reached` (465 lines). Preflight STATUS blocked on an
    undocumented `intended_untracked_selection` JSON (untracked `web/exports/*`, `.codegraph/`).
    2026-11-03: user disabled RDD for this clone (`review mode disable --scope clone`); delivery
    follows ordinary repository policy (`disabled/unmanaged`). Parent spot check: api test 194 OK.
- [x] T3 — Admin: products screen through the API (route: delegated writer; trigger: 2+ non-trivial files)
  - Built: `products-api.ts` (typed client like `orders-api.ts`: `/api/catalog/...`,
    `credentials: "same-origin"`, `Result` with invalid/conflict/not-found/unauthorized/network/
    unknown) for list (`?includeArchived=true`), categories, create, update, availability PATCH,
    archive, restore. `products-mapper.ts`: API → admin `Product` (`position` → `commercialRank`,
    `plural`/`image`/`max`/`defaultOptionId` null → unset, single groups drop `max`, unknown
    moments dropped), categories → `{ id, label }` by position, admin `Product` → body (`max`
    null on single groups, `defaultOption` by NAME, ids only for groups/options the saved product
    has, no sku), 400 issues → editor `ProductFormErrors` (fields, group title/max, option
    name/priceDelta by draft index). Reducer stays pure: new `loaded`, `save-started`/
    `save-succeeded`/`save-failed`, `duplicated`/`archived`/`restored`/`product-action-failed`,
    `finish-availability-save` with the API product; `getSaveRequest` / `getDuplicateRequest`
    build the bodies. `use-products-catalog.ts` holds the async (load, retry, save, list actions,
    availability; 401 → `sessionStore.signOut()`). The container shows "Cargando productos…" and
    "No se pudieron cargar los productos" + "Reintentar"; failed saves show "No se pudo guardar el
    producto. Intentá de nuevo." in the save bar, API field errors in the form. Categories of
    filters, editor select, row labels and preview come from `GET /catalog/categories`
    (`ProductsState.categories`, mock categories by default). `?state=` forced variants stay on
    the mock catalogue in memory (simulated availability save).
  - Decision: `ProductCategoryId` widened to `MockProductCategoryId | (string & {})` so API
    category slugs fit; admin SKU prefix falls back to the first three letters (like the API).
  - Evidence: RED first (mapper + client suites failed to import; 14 reducer tests failed), then
    GREEN. `tsc --noEmit`, `lint` clean; `test` 51 files / 564 tests passed; `build` OK.
  - Known gaps: a locally picked image is a `blob:` URL and is saved as such (no upload, out of
    scope); `commercialRank` is the API per-category position, so ranks interleave across
    categories in the list; the "Versión 42" counter stays the mock one (bumped locally); no
    browser run against a live API here; container wiring has no component test (covered by the
    reducer/request tests).
  - Review: RDD disabled for this clone (`disabled/unmanaged`); no review step.
- [x] T4 — Web: menu from the public API (route: delegated writer; trigger: 2+ non-trivial files)
  - Built: `features/menu/menu-api.ts` (typed client like `table-access-api.ts`:
    `GET /api/catalog/menu`, `cache: "no-store"`, body shape check, `{ ok: false, error: "network" }`
    on throw / non-2xx / non-JSON / bad body). `menu-mapper.ts` (pure): API → web `Menu`
    (`mocks/types.ts`): categories `{ id, label: name }` in API order, hiding ones without
    products; products `slug = id`, `categoryId` → `category`, `plural`/`image` null → unset,
    image kept only for local `/…` paths (no remote hosts, no `blob:`), `allowCustomerNotes`,
    option groups `title` → `name` + `title`, `defaultOptionId` → `defaultChoiceId`, options →
    choices, `priceDisplay: "delta"`; moments `desayunar|merendar|cenar|tomar` →
    `para-desayunar|para-merendar|para-cenar|para-tomar` as `momentProductIds` (unknown dropped).
    `MenuProvider` (root layout, outermost) loads the menu in the browser after mount through
    the existing `/api/*` → `API_URL` rewrite; `useMenu()` gives `{ status, menu, retry }`, and
    lookups see `EMPTY_MENU` until it is ready. `MenuGate` shows "Cargando el menú" or "No
    pudimos cargar el menú" + "Reintentar" (no mock fallback). Pricing helpers moved to
    `features/menu/product-pricing.ts`; cart subtotal, cart lines, quick add, product detail and
    `buildOrder` take the loaded menu. Moments keep their local copy/imagery; their products and
    sub-filter chips ("Todos" + the moment's categories) come from the menu. `/product/[id]` and
    `/explore/categoria/[category]` lost `generateStaticParams` (params read behind Suspense,
    static titles) and show "… no está disponible" + "Volver a la carta" for unknown ids.
    `/explore/[moment]` stays prerendered. Products without photo show a sand placeholder
    (`ProductPhoto`); `allowCustomerNotes: false` hides "Indicaciones especiales".
  - Decision: client fetch through the existing rewrite (the `table-access` pattern) instead of a
    server fetch: the cart and table session live in the root layout and need synchronous
    lookups everywhere, and the build never reaches the API. Mocks stay as fixtures
    (`MOCK_MENU`) for tests and the seeded table orders.
  - Env: `API_URL` (server-only, read by `next.config.ts` at `next dev`/`next build`, default
    `http://localhost:3001`). Local run: `pnpm --dir api db:migrate`, `pnpm --dir api db:seed`,
    `pnpm --dir api dev` (port 3001), then `pnpm --dir admin dev` and `pnpm --dir web dev` (ports
    3000/3002, whichever starts first gets 3000; both are in the default `CORS_ORIGINS`); a product
    created and published in the admin, available, in a visible category, appears in the web
    after a reload.
  - Evidence: RED first (`menu-mapper.test` and `menu-api.test` failed to import), then GREEN.
    `tsc --noEmit`, `lint` clean; `test` 22 files / 167 tests passed; `build` OK with no API
    running (`/product/[id]`, `/explore/categoria/[category]` partial prerender).
  - Known gaps: `web/.env.example` not added (writing `.env*` is denied in this environment);
    page titles no longer name the product/category; the menu is not server-rendered (loading
    card first); group `max` is not enforced by the web; cart lines saved with old mock ids are
    dropped from the subtotal/lines (unknown products); photos the admin points to that are not
    in `web/public` 404; no browser run against a live API here; no component tests for the
    provider/gate.
  - Review: RDD disabled for this clone (`disabled/unmanaged`); no review step.

## Acceptance criteria

- A product created in the admin survives a reload and appears in `GET` of the API.
- A published product of a visible category appears in the customer app.
- API, admin and web tests, typecheck and lint pass.

## Progress

- Branch `feat/products-api-persistence` created from `main` (`d7e03b7`).
- T1 done in `8f5636b` (feat(api): store moments, plural and image on products); ~170 authored
  code/test lines.
- T2 done in `f0cbbcf` (feat(api): add public menu read for the customer app); ~175 authored
  code/test lines.
- T3 done in `e62ec5f` (feat(admin): persist products through the catalog API); ~1520 changed
  lines (about 610 test lines, 32 doc lines); over the 400 budget: the client, mapper, reducer
  actions and container are one work unit.

## Next step

Open the S3 (web) PR on the feature integration branch (user decision); push stays with the user.
