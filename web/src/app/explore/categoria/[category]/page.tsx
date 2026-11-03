import { Suspense } from "react";
import type { Metadata } from "next";
import { CategoryScreen } from "@/features/explore";
import { MenuLoading, MenuScreen } from "@/features/menu";

export const metadata: Metadata = { title: "Categoría · Café Central" };

/**
 * Categories come from the menu API, so ids are not known at build time: the route is dynamic
 * (params read behind Suspense) and the category loads in the browser.
 */
export default function ExploreCategoryPage({ params }: PageProps<"/explore/categoria/[category]">) {
  return (
    <Suspense
      fallback={
        <MenuScreen>
          <MenuLoading />
        </MenuScreen>
      }
    >
      <CategoryFromParams params={params} />
    </Suspense>
  );
}

async function CategoryFromParams({
  params,
}: {
  params: PageProps<"/explore/categoria/[category]">["params"];
}) {
  const { category } = await params;
  return <CategoryScreen categoryId={category} />;
}
