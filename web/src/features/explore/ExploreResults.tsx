"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import type { Moment } from "@/mocks/types";
import { CartFloatingCta } from "@/features/cart";
import { useMenu } from "@/features/menu/MenuProvider";
import { BottomDock, BottomNav, FilterChips } from "@/shared/ui";
import { ProductResults } from "./ProductResults";
import { getMomentFilters, getMomentProducts, resolveFilterId } from "./moment-products";

type ExploreResultsProps = {
  moment: Moment;
  /** Raw `?filter=` value to open with; invalid or missing values select the first filter. */
  requestedFilterId?: string | string[];
};

/**
 * Screen 02B · Explore results for one moment, with sub-filter chips (the menu categories of the
 * moment). Renders inside `<MenuGate>`, so the menu is loaded.
 */
export function ExploreResults({ moment, requestedFilterId }: ExploreResultsProps) {
  const { menu } = useMenu();
  const filters = getMomentFilters(menu, moment.id);
  const [filterId, setFilterId] = useState(() => resolveFilterId(filters, requestedFilterId));
  const products = getMomentProducts(menu, moment.id, filterId);

  return (
    <>
      <main className="flex flex-1 flex-col px-4 pt-2 pb-[164px]">
        <Link
          href="/explore"
          className="flex h-8 w-fit items-center gap-[7px] text-[10px] font-bold tracking-[0.8px] text-brand"
        >
          <ArrowLeft size={17} aria-hidden="true" />
          TODOS LOS MOMENTOS
        </Link>

        <header className="mt-[5px] flex items-center justify-between">
          <h1 className="font-display text-[34px] leading-tight font-bold text-ink">{moment.title}</h1>
          {/* Search is visual only in this prototype. */}
          <button
            type="button"
            aria-label={`Buscar en ${moment.title.toLowerCase()}`}
            className="flex size-[38px] items-center justify-center rounded-full bg-surface text-ink"
          >
            <Search size={19} aria-hidden="true" />
          </button>
        </header>

        <FilterChips
          className="mt-[7px]"
          label={`Categorías de ${moment.title.toLowerCase()}`}
          items={filters}
          selected={filterId}
          onSelect={setFilterId}
          weight="semibold"
        />

        <ProductResults products={products} />
      </main>
      <BottomDock>
        <CartFloatingCta variant="count" />
        <BottomNav active="explorar" />
      </BottomDock>
    </>
  );
}
