# Admin products on mobile

## Objective

Make the admin products module (07A list, 07B editor, 07C preview) usable on phones, following the
mobile-first pattern of the orders view (`c103f09`): mobile layout below `lg`, desktop unchanged.

## Problem / why

`admin/src/features/products` has no responsive breakpoints; it is laid out for 1440×900. The admin
shell already collapses to a drawer below `lg`, so the products screens overflow on phones.

## Scope

- 07A list: header, metric cards, filters, and the catalogue table (rows become stacked cards
  below `lg`), pagination, availability switch and row actions reachable by touch (≥44px targets).
- 07B editor: single column below `lg`; save bar stays reachable (sticky bottom); option group
  cards and option rows wrap without horizontal scroll.
- 07C preview: customer preview fits a phone width.
- Desktop (`lg` and up) unchanged. No state/model changes unless a pure view helper is needed.

## Constraints

- Tailwind utilities, mobile-first with `sm:`/`md:`/`lg:`; reuse `--topbar-h`, `Drawer`,
  `useMediaQuery` from the orders work where useful.
- Keep UI copy in Spanish as it is today.

## Tasks

- [x] T1 — 07A list on mobile (route: delegated writer; trigger: 2+ non-trivial files)
  - Built: below `lg` the list page scrolls (`--topbar-h`, `px-4`), header stacks with a 44px
    full-width "Nuevo producto", metrics scroll sideways (168px min), filters wrap under a
    full-width search, and table rows become `ProductCard`s (44px Editar/Duplicar/Archivar or
    Restaurar, switch with a 44px hit area) with a compact 44px pager. Desktop classes unchanged.
  - Evidence: tsc, lint OK; 529 tests passed; build OK. No visual/browser check run.
  - Known gaps: no modal in the list needed the full-screen fix; shared `Pagination`/`RowMenu`
    stay 30px (only used at `lg+` here).
  - Commit `54b6f0e`. Review: medium, under budget (260 lines); pending in the slice with T2. Parent spot check: tsc OK.
- [x] T2 — 07B editor and 07C preview on mobile (route: delegated writer; trigger: 2+ non-trivial files)
  - Built: below `lg` editor and preview pages scroll (`--topbar-h`, `px-4`), headers stack (20px
    titles, wrapping breadcrumb with a 44px hit area); the editor is one column (image over fields,
    wrapping 44px moment chips, 1-col option groups with 44px rows/icons/settings) with a sticky,
    in-flow save bar (2+1 grid of 44px actions); 07C puts the 370px-capped phone first and the
    summary under it, full-width "Volver a editar" and version selector. Desktop classes kept under `lg:`.
  - Evidence: tsc, lint OK; 529 tests passed; build OK. No visual/browser check run.
  - Known gaps: no modal needed the full-screen fix; the form's `AvailabilitySwitch` (shared
    `ProductTags`) and the phone mock's chips/stepper keep their small sizes; inputs stay 12px
    (iOS may zoom on focus).
  - Commit `0ba43a9`. Parent spot check: tsc OK. Slice review (main..0ba43a9, 463 lines): medium, `slice_budget_reached`; user declined for this candidate.

## Acceptance criteria

- No horizontal page scroll at 375px width on list, editor, or preview.
- All actions of each screen remain reachable on mobile.
- Desktop layout at ≥1024px unchanged.

## Checks

- `pnpm --filter admin exec tsc --noEmit`, lint, tests, build.
- Test-first exception: layout-only change with no runnable visual test; structural/functional checks.

## Delivery

Strategy: `ask-on-risk`. Forecast ~300–450 authored changed lines. Branch `feat/admin-products-mobile`.

## Progress

- T1 done.
- T1 and T2 done. Next: visual check on a phone, then push/PR (user decision).
