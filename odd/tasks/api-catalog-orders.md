# API catalog and orders

## Objective

Add the `catalog` (categories, products) and `orders` modules to the API so the admin can create and
manage real orders. Admin and web wiring come in a later feature.

## Problem / why

No orders or products backend exists: the admin orders board and the web table screen both run on
in-memory mocks, so an order created from the panel cannot be stored or seen elsewhere.

## Scope

- `catalog`: `Category` (slug id, name, description, visible, position) and `Product` (cuid id, sku,
  name, description, price, categoryId, publication published|draft, available, archived,
  allowCustomerNotes, option groups). `ProductOptionGroup` (title, selection single|multiple,
  required, max, defaultOptionId, position) and `ProductOption` (name, priceDelta, position).
  Staff CRUD endpoints. Exported application service to resolve products for pricing.
- `orders`: `Order` (cuid id, visible `number` autoincrement, tableNumber, customerName, note,
  status received|preparing|delivered|cancelled, cancellationReason, source staff|table),
  `OrderItem` (productId, quantity, note, snapshot of name, unit price and chosen options),
  `OrderEvent` (status history with actor and timestamp). Staff endpoints: create, list the day's
  orders, advance, cancel.
- Seed categories and products from the admin mock catalog.

Out of scope: moments, collections, public/table endpoints, table sessions, billing, admin/web wiring.

## Constraints

- Follow `api/src/modules/README.md`: domain is plain TS; Zod at the HTTP edge; Prisma adapters.
- Money is integer ARS pesos (no cents).
- The API prices orders from the catalog; clients send product ids, option ids, quantities, notes.
- Only published, available, non-archived products can be ordered; option choices must satisfy
  the group rules. Table number must exist and be enabled.
- Staff-only routes use `SessionGuard`; no roles guard yet.
- Migrations generated offline with `prisma migrate diff`.

## Acceptance criteria

- Use cases covered by unit tests with in-memory repositories; HTTP covered by e2e specs.
- `npm run typecheck`, `npm run lint`, `npm test`, `npx prisma validate`, `npm run build` pass in `api/`.

## Tasks

- [x] T1 — `catalog` module: schema + migration, domain, use cases, HTTP, tests (route: delegated writer; trigger: 2+ non-trivial files)
  - Slice branch `feat/api-catalog-orders-catalog`. SKU prefix = first 3 letters of the category slug.
    Option groups replaced as a whole on PATCH (ids kept when sent); default option sent by name.
    Restore brings a product back as draft. `ResolveOrderableProducts` exported for orders.
  - Not covered: category `visible` does not block ordering; no image field.
  - Evidence: prisma validate, typecheck, lint clean; 151 tests passed; build OK. ~2070 lines.
  - Commit `bf95c8a`. Review: assessed medium (slice_budget_reached); user declined for this candidate.
- [x] T2 — Seed categories and products from the admin mock catalog (route: delegated writer)
  - Slice branch `feat/api-catalog-orders-seed`. `api/prisma/seed-catalog.ts`: skips when any catalog
    row exists, else one transaction; data validated with domain rules; deterministic ids (`prd_<slug>`).
    9 categories, 13 products, 4 groups, 9 options. Vitest now includes `prisma/**/*.spec.ts`.
  - Commit `671ed0b`. Review: medium (slice_budget_reached); user declined for this candidate.
  - Evidence: typecheck, lint clean; 157 tests passed; build OK; db:seed run twice (second kept data).
- [x] T3 — `orders` module: schema + migration, domain (pricing, lifecycle), use cases, HTTP, tests (route: delegated writer)
  - Slice branch `feat/api-catalog-orders-orders`. Service day = `America/Argentina/Buenos_Aires`
    constant (venue exports no timezone service yet). No FK on productId (snapshots). New exported
    `FindTableByNumber` in tables. Sequence starts at #1001. Status changes guarded by expected status.
  - Follow-ups: read venue timezone once venue exports a service; admin must map cancellation
    reasons (API snake_case vs admin kebab-case).
  - Evidence: prisma validate, typecheck, lint clean; 187 tests passed; build OK; db:deploy applied.

## Delivery

Strategy: `ask-on-risk`. Forecast: ~2000 authored lines, above the ~400 budget.
Chain strategy: `feature-branch-chain` (user choice) — slice PRs target `feat/api-catalog-orders`,
which merges into `main` once at the end. Slices: T1 catalog, T2 seed, T3 orders.

## Progress

- Branch `feat/api-catalog-orders` created from `main`.

## Next step

T1.
