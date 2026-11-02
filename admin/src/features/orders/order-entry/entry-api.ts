import type { EntryCatalog, EntryCategory, EntryOption, EntryOptionGroup, EntryProduct, EntryTable } from "./entry-types";

/**
 * Read-only client for what "Nuevo pedido" lists: `GET /catalog/products`, `GET /catalog/categories`
 * and `GET /tables/config` (staff session). Same `/api` rewrite and cookie as `orders-api.ts`; kept
 * inside the orders feature so it does not depend on the catalog or venue screens.
 */

export type EntryLoadError = { kind: "unauthorized" } | { kind: "network" } | { kind: "unknown" };

export type EntryLoadResult = { ok: true; value: EntryCatalog } | { ok: false; error: EntryLoadError };

type Fetched = { ok: true; body: unknown } | { ok: false; error: EntryLoadError };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const isString = (value: unknown): value is string => typeof value === "string";
const isNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

/** Parses every item or gives up: a body of another shape is not trusted at all. */
function parseAll<T>(value: unknown, parse: (item: unknown) => T | null): T[] | null {
  if (!Array.isArray(value)) return null;
  const parsed: T[] = [];
  for (const item of value) {
    const entry = parse(item);
    if (entry === null) return null;
    parsed.push(entry);
  }
  return parsed;
}

function toOption(value: unknown): EntryOption | null {
  if (!isRecord(value) || !isString(value.id) || !isString(value.name) || !isNumber(value.priceDelta)) return null;
  return { id: value.id, name: value.name, priceDelta: value.priceDelta };
}

function toGroup(value: unknown): EntryOptionGroup | null {
  if (!isRecord(value) || !isString(value.id) || !isString(value.title)) return null;
  if (value.selection !== "single" && value.selection !== "multiple") return null;
  const options = parseAll(value.options, toOption);
  if (options === null) return null;
  return {
    id: value.id,
    title: value.title,
    selection: value.selection,
    required: value.required === true,
    max: isNumber(value.max) ? value.max : null,
    defaultOptionId: isString(value.defaultOptionId) ? value.defaultOptionId : null,
    options,
  };
}

type RankedProduct = { product: EntryProduct; orderable: boolean; position: number };

function toRankedProduct(value: unknown): RankedProduct | null {
  if (!isRecord(value) || !isString(value.id) || !isString(value.name) || !isNumber(value.price) || !isString(value.categoryId)) {
    return null;
  }
  const optionGroups = parseAll(value.optionGroups ?? [], toGroup);
  if (optionGroups === null) return null;
  return {
    product: {
      id: value.id,
      name: value.name,
      price: value.price,
      categoryId: value.categoryId,
      allowCustomerNotes: value.allowCustomerNotes === true,
      optionGroups,
    },
    // Same rule as the API's `orderBlock`: published, available and not archived.
    orderable: value.publication === "published" && value.available === true && value.archived !== true,
    position: isNumber(value.position) ? value.position : 0,
  };
}

type RankedCategory = { id: string; name: string; visible: boolean; position: number };

function toRankedCategory(value: unknown): RankedCategory | null {
  if (!isRecord(value) || !isString(value.id) || !isString(value.name)) return null;
  return { id: value.id, name: value.name, visible: value.visible !== false, position: isNumber(value.position) ? value.position : 0 };
}

const byPosition = (a: { position: number }, b: { position: number }) => a.position - b.position;

/** Orderable products of `GET /catalog/products`, by category position then their own; null for another shape. */
export function toEntryProducts(products: unknown, categories: unknown): EntryProduct[] | null {
  const ranked = parseAll(products, toRankedProduct);
  if (ranked === null) return null;
  const categoryRank = new Map((parseAll(categories, toRankedCategory) ?? []).map((category) => [category.id, category.position]));
  const rankOf = (categoryId: string) => categoryRank.get(categoryId) ?? Number.MAX_SAFE_INTEGER;
  return ranked
    .filter((entry) => entry.orderable)
    .sort((a, b) => rankOf(a.product.categoryId) - rankOf(b.product.categoryId) || a.position - b.position)
    .map((entry) => entry.product);
}

/** Visible categories of `GET /catalog/categories` in position order; null for another shape. */
export function toEntryCategories(categories: unknown): EntryCategory[] | null {
  const ranked = parseAll(categories, toRankedCategory);
  if (ranked === null) return null;
  return ranked
    .filter((category) => category.visible)
    .sort(byPosition)
    .map(({ id, name }) => ({ id, name }));
}

/** Enabled tables of `GET /tables/config`, grouped by space order, then by number; null for another shape. */
export function toEntryTables(config: unknown): EntryTable[] | null {
  if (!isRecord(config)) return null;
  const spaces = parseAll(config.spaces, (space) =>
    isRecord(space) && isString(space.id) && isString(space.name) ? { id: space.id, name: space.name } : null,
  );
  const tables = parseAll(config.tables, (table) =>
    isRecord(table) && isNumber(table.number) && isString(table.label) && isString(table.spaceId)
      ? {
          number: table.number,
          label: table.label,
          spaceId: table.spaceId,
          capacity: isNumber(table.capacity) ? table.capacity : 0,
          enabled: table.enabled === true,
        }
      : null,
  );
  if (spaces === null || tables === null) return null;
  const spaceRank = (spaceId: string) => {
    const index = spaces.findIndex((space) => space.id === spaceId);
    return index === -1 ? spaces.length : index;
  };
  return tables
    .filter((table) => table.enabled)
    .sort((a, b) => spaceRank(a.spaceId) - spaceRank(b.spaceId) || a.number - b.number)
    .map((table) => ({
      number: table.number,
      label: table.label,
      capacity: table.capacity,
      spaceName: spaces.find((space) => space.id === table.spaceId)?.name ?? "",
    }));
}

async function get(path: string): Promise<Fetched> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, { method: "GET", credentials: "same-origin" });
  } catch {
    return { ok: false, error: { kind: "network" } };
  }
  if (response.status === 401) return { ok: false, error: { kind: "unauthorized" } };
  if (!response.ok) return { ok: false, error: { kind: "unknown" } };
  try {
    return { ok: true, body: await response.json() };
  } catch {
    return { ok: false, error: { kind: "unknown" } };
  }
}

/** The most telling failure of several: a lost session first, then the network. */
function firstError(results: readonly Fetched[]): EntryLoadError | null {
  const errors = results.flatMap((result) => (result.ok ? [] : [result.error]));
  return (
    errors.find((error) => error.kind === "unauthorized") ?? errors.find((error) => error.kind === "network") ?? errors[0] ?? null
  );
}

/** Loads the orderable products, their categories and the enabled tables in parallel. */
export async function loadEntryCatalog(): Promise<EntryLoadResult> {
  const results = await Promise.all([get("/catalog/products"), get("/catalog/categories"), get("/tables/config")]);
  const error = firstError(results);
  if (error !== null) return { ok: false, error };
  const [products, categories, tables] = results.map((result) => (result.ok ? result.body : null));
  const value = {
    products: toEntryProducts(products, categories),
    categories: toEntryCategories(categories),
    tables: toEntryTables(tables),
  };
  if (value.products === null || value.categories === null || value.tables === null) return { ok: false, error: { kind: "unknown" } };
  return { ok: true, value: { products: value.products, categories: value.categories, tables: value.tables } };
}
