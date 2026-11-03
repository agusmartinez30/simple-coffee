"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Category } from "@/mocks/types";
import { CartFloatingCta } from "@/features/cart";
import { useMenu } from "@/features/menu/MenuProvider";
import { BottomDock, BottomNav } from "@/shared/ui";
import { ProductResults } from "./ProductResults";
import { getCategoryProducts } from "./category-products";

type CategoryResultsProps = {
  category: Category;
};

/** Every product of one menu category, reached from "Ver más" on the home. */
export function CategoryResults({ category }: CategoryResultsProps) {
  const products = getCategoryProducts(useMenu().menu, category.id);

  return (
    <>
      <main className="flex flex-1 flex-col px-4 pt-2 pb-[164px]">
        <Link
          href="/explore"
          className="flex h-8 w-fit items-center gap-[7px] text-[10px] font-bold tracking-[0.8px] text-brand"
        >
          <ArrowLeft size={17} aria-hidden="true" />
          VOLVER AL INICIO
        </Link>

        <h1 className="mt-[5px] font-display text-[34px] leading-tight font-bold text-ink">
          {category.label}
        </h1>

        <ProductResults products={products} />
      </main>
      <BottomDock>
        <CartFloatingCta variant="count" />
        <BottomNav active="explorar" />
      </BottomDock>
    </>
  );
}
