import { Suspense } from "react";
import type { Metadata } from "next";
import { MenuLoading, MenuScreen } from "@/features/menu";
import { ProductScreen } from "@/features/product";

export const metadata: Metadata = { title: "Detalle del producto · Café Central" };

/**
 * Products come from the menu API, so ids are not known at build time: the route is dynamic
 * (params read behind Suspense) and the product loads in the browser.
 */
export default function ProductPage({ params }: PageProps<"/product/[id]">) {
  return (
    <Suspense
      fallback={
        <MenuScreen>
          <MenuLoading />
        </MenuScreen>
      }
    >
      <ProductFromParams params={params} />
    </Suspense>
  );
}

async function ProductFromParams({ params }: { params: PageProps<"/product/[id]">["params"] }) {
  const { id } = await params;
  return <ProductScreen productId={id} />;
}
