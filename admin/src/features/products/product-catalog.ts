import {
  CONSUMPTION_MOMENTS,
  PRODUCT_CATEGORIES,
  type ConsumptionMomentId,
  type Product,
  type ProductCategoryId,
} from "@/mocks/service-day";

/** "Publicación" filter: `all` lists every product that is not archived. */
export type PublicationFilter = "all" | "published" | "draft" | "archived";

export type AvailabilityFilter = "all" | "available" | "unavailable";

/** Search box, the "Disponibles" chip (`availability`) and the three 07A filter selects. */
export type ProductFilters = {
  query: string;
  category: ProductCategoryId | "all";
  moment: ConsumptionMomentId | "all";
  publication: PublicationFilter;
  availability: AvailabilityFilter;
};

export const DEFAULT_PRODUCT_FILTERS: ProductFilters = {
  query: "",
  category: "all",
  moment: "all",
  publication: "all",
  availability: "all",
};

/** Row status chip: archived wins over the publication. */
export type ProductStatus = "published" | "draft" | "archived";

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  published: "Publicado",
  draft: "Borrador",
  archived: "Archivado",
};

/** "Publicación" badge of the 07A rows: drafts read "No publicado". */
export const PRODUCT_LIST_STATUS_LABELS: Record<ProductStatus, string> = {
  published: "Publicado",
  draft: "No publicado",
  archived: "Archivado",
};

export type FilterOption<T extends string> = { id: T; label: string };

/** A category as the filters, the editor select and the row labels show it. */
export type ProductCategoryOption = { id: ProductCategoryId; label: string };

/** Categories of the mock catalogue: the screen's forced variants, and the default before the API answers. */
export const MOCK_CATEGORY_OPTIONS: readonly ProductCategoryOption[] = PRODUCT_CATEGORIES.map(({ id, label }) => ({ id, label }));

/** Options of each select; the `all` option carries the filter name, as the closed 07A select. */
export function getCategoryFilterOptions(
  categories: readonly ProductCategoryOption[] = MOCK_CATEGORY_OPTIONS,
): FilterOption<ProductFilters["category"]>[] {
  return [{ id: "all", label: "Categoría" }, ...categories];
}

export const CATEGORY_FILTER_OPTIONS: FilterOption<ProductFilters["category"]>[] = getCategoryFilterOptions();

export const MOMENT_FILTER_OPTIONS: FilterOption<ProductFilters["moment"]>[] = [
  { id: "all", label: "Momento" },
  ...CONSUMPTION_MOMENTS,
];

export const PUBLICATION_FILTER_OPTIONS: FilterOption<PublicationFilter>[] = [
  { id: "all", label: "Publicación" },
  { id: "published", label: "Publicados" },
  { id: "draft", label: "Borradores" },
  { id: "archived", label: "Archivados" },
];

export function getCategoryLabel(
  id: ProductCategoryId | "",
  categories: readonly ProductCategoryOption[] = MOCK_CATEGORY_OPTIONS,
): string | null {
  return categories.find((category) => category.id === id)?.label ?? null;
}

export function getMomentLabel(id: ConsumptionMomentId): string {
  return CONSUMPTION_MOMENTS.find((moment) => moment.id === id)?.label ?? id;
}

/** "Momentos" column: labels in the canonical order, "Todo el día" when the product has every moment. */
export function formatMomentsLabel(moments: readonly ConsumptionMomentId[]): string {
  if (moments.length === 0) return "Sin momentos";
  const selected = CONSUMPTION_MOMENTS.filter((moment) => moments.includes(moment.id));
  if (selected.length === CONSUMPTION_MOMENTS.length) return "Todo el día";
  return selected.map((moment) => moment.label).join(" · ");
}

/** True when the search or any filter narrows the list ("Limpiar" is offered). */
export function hasActiveFilters(filters: ProductFilters): boolean {
  return (
    filters.query.trim() !== "" ||
    filters.category !== DEFAULT_PRODUCT_FILTERS.category ||
    filters.moment !== DEFAULT_PRODUCT_FILTERS.moment ||
    filters.publication !== DEFAULT_PRODUCT_FILTERS.publication ||
    filters.availability !== DEFAULT_PRODUCT_FILTERS.availability
  );
}

/** Lower case without accents or surrounding spaces, for search and name comparisons. */
export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Slug of `name` ("te-verde"), numbered when the id is taken ("cappuccino-2"). */
export function createProductId(name: string, existingIds: readonly string[]): string {
  const slug = normalizeText(name).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "producto";
  const taken = new Set(existingIds);
  let candidate = slug;
  for (let index = 2; taken.has(candidate); index += 1) candidate = `${slug}-${index}`;
  return candidate;
}

/** 07A SKU prefix of each category; Tostadas and Tostados share "TOS", as the export does. */
export const SKU_PREFIXES: Record<ProductCategoryId, string> = {
  cafes: "CAF",
  bebidas: "BEB",
  panaderia: "PAN",
  tostadas: "TOS",
  tostados: "TOS",
  sandwiches: "SAN",
  hamburguesas: "HAM",
  postres: "POS",
  licuados: "LIC",
};

/** SKU prefix of a category: the 07A one, else the first three letters of its id ("brunch" → "BRU"), as the API does. */
function getSkuPrefix(categoryId: ProductCategoryId): string {
  return SKU_PREFIXES[categoryId] ?? (categoryId.replace(/[^a-z]/gi, "").slice(0, 3).toUpperCase() + "XXX").slice(0, 3);
}

/** Next SKU of the category prefix: one above the highest taken number ("CAF-018"). */
export function createProductSku(categoryId: ProductCategoryId, existingSkus: readonly string[]): string {
  const prefix = getSkuPrefix(categoryId);
  const taken = existingSkus
    .filter((sku) => sku.startsWith(`${prefix}-`))
    .map((sku) => Number(sku.slice(prefix.length + 1)))
    .filter(Number.isInteger);
  const next = Math.max(0, ...taken) + 1;
  return `${prefix}-${String(next).padStart(3, "0")}`;
}

/** Rank for a product added at the end of the relevance order. */
export function getNextCommercialRank(products: readonly Product[]): number {
  return Math.max(0, ...products.map((product) => product.commercialRank)) + 1;
}

export function getProductStatus(product: Product): ProductStatus {
  return product.archived ? "archived" : product.publication;
}

function matchesPublication(product: Product, filter: PublicationFilter): boolean {
  if (filter === "archived") return product.archived;
  if (product.archived) return false;
  return filter === "all" || product.publication === filter;
}

function matchesQuery(product: Product, query: string, categories: readonly ProductCategoryOption[]): boolean {
  const needle = normalizeText(query);
  if (!needle) return true;
  const haystack = `${product.name} ${getCategoryLabel(product.categoryId, categories) ?? ""} ${product.sku}`;
  return normalizeText(haystack).includes(needle);
}

/** Products matching the search and every select, in catalogue order. */
export function filterProducts(
  products: readonly Product[],
  filters: ProductFilters,
  categories: readonly ProductCategoryOption[] = MOCK_CATEGORY_OPTIONS,
): Product[] {
  return products.filter(
    (product) =>
      matchesPublication(product, filters.publication) &&
      (filters.category === "all" || product.categoryId === filters.category) &&
      (filters.moment === "all" || product.moments.includes(filters.moment)) &&
      (filters.availability === "all" || product.available === (filters.availability === "available")) &&
      matchesQuery(product, filters.query, categories),
  );
}

const collator = new Intl.Collator("es", { sensitivity: "base" });

/** A sorted copy, "Orden: relevancia comercial"; equal ranks follow the name. */
export function sortProductsByRelevance(products: readonly Product[]): Product[] {
  return [...products].sort((a, b) => a.commercialRank - b.commercialRank || collator.compare(a.name, b.name));
}

/** Rows of the 07A table. */
export function getVisibleProducts(
  products: readonly Product[],
  filters: ProductFilters,
  categories: readonly ProductCategoryOption[] = MOCK_CATEGORY_OPTIONS,
): Product[] {
  return sortProductsByRelevance(filterProducts(products, filters, categories));
}

export type ProductMetrics = { published: number; available: number; unavailable: number };

/** 07A metric cards: published products, split by availability. Drafts and archived are left out. */
export function getProductMetrics(products: readonly Product[]): ProductMetrics {
  const published = products.filter((product) => getProductStatus(product) === "published");
  const available = published.filter((product) => product.available).length;
  return { published: published.length, available, unavailable: published.length - available };
}

const COPY_SUFFIX = /\s+\(copia(?:\s+\d+)?\)$/i;

/** "Cappuccino (copia)", then "Cappuccino (copia 2)", … — the first name not taken. */
export function getDuplicateName(name: string, existingNames: readonly string[]): string {
  const original = name.replace(COPY_SUFFIX, "").trim();
  const taken = new Set(existingNames.map(normalizeText));
  let candidate = `${original} (copia)`;
  for (let index = 2; taken.has(normalizeText(candidate)); index += 1) {
    candidate = `${original} (copia ${index})`;
  }
  return candidate;
}

/**
 * Inserts an unpublished copy right after the original ("Duplicar"). The copy gets its own SKU
 * and shares the original rank, so it lists right after it.
 */
export function duplicateProduct(
  products: Product[],
  id: string,
): { products: Product[]; product: Product | null } {
  const index = products.findIndex((product) => product.id === id);
  if (index < 0) return { products, product: null };
  const source = products[index];
  const name = getDuplicateName(
    source.name,
    products.map((product) => product.name),
  );
  const copy: Product = {
    ...source,
    id: createProductId(
      name,
      products.map((product) => product.id),
    ),
    sku: createProductSku(
      source.categoryId,
      products.map((product) => product.sku),
    ),
    name,
    plural: undefined,
    publication: "draft",
    archived: false,
  };
  return { products: [...products.slice(0, index + 1), copy, ...products.slice(index + 1)], product: copy };
}

function updateProduct(
  products: Product[],
  id: string,
  changes: Partial<Product>,
): Product[] {
  const index = products.findIndex((product) => product.id === id);
  if (index < 0) return products;
  const current = products[index];
  const changed = (Object.keys(changes) as (keyof Product)[]).some((key) => current[key] !== changes[key]);
  if (!changed) return products;
  return products.map((product, position) => (position === index ? { ...product, ...changes } : product));
}

/** "Archivar": products with confirmed orders are archived, never deleted. */
export function archiveProduct(products: Product[], id: string): Product[] {
  return updateProduct(products, id, { archived: true });
}

/** Back to the menu as a draft, so it is not published again by surprise. */
export function restoreProduct(products: Product[], id: string): Product[] {
  const product = products.find((candidate) => candidate.id === id);
  if (!product?.archived) return products;
  return updateProduct(products, id, { archived: false, publication: "draft" });
}

export function setProductAvailability(products: Product[], id: string, available: boolean): Product[] {
  return updateProduct(products, id, { available });
}

/** The list with `product` in place of the one with its id, or appended when it is new. */
export function upsertProduct(products: Product[], product: Product): Product[] {
  return products.some((candidate) => candidate.id === product.id)
    ? products.map((candidate) => (candidate.id === product.id ? product : candidate))
    : [...products, product];
}

/** "Result Count" of the 07A footer. */
export function formatProductCount(count: number): string {
  return `${count} ${count === 1 ? "producto" : "productos"}`;
}

/** "Filter Summary" of the 07A footer. */
export function formatListSummary(filtered: boolean): string {
  return `${filtered ? "Con filtros aplicados" : "Mostrando todos"} · Orden: relevancia comercial`;
}

/** "Publicados" metric support text, e.g. "86% del catálogo". */
export function formatCatalogShare(count: number, total: number): string {
  const share = total > 0 ? Math.round((count / total) * 100) : 0;
  return `${share}% del catálogo`;
}
