/**
 * Client for the public, session-less menu endpoint (`GET /catalog/menu`). Calls go to
 * `/api/*`, which `next.config.ts` rewrites to `API_URL`, so the browser never needs the
 * API's origin (no CORS).
 */

export type ApiMenuOption = { id: string; name: string; priceDelta: number };

export type ApiMenuOptionGroup = {
  id: string;
  title: string;
  selection: "single" | "multiple";
  required: boolean;
  max: number | null;
  defaultOptionId: string | null;
  options: ApiMenuOption[];
};

export type ApiMenuCategory = { id: string; name: string; description: string };

export type ApiMenuProduct = {
  id: string;
  name: string;
  plural: string | null;
  description: string;
  price: number;
  categoryId: string;
  image: string | null;
  /** API moment ids: `desayunar | merendar | cenar | tomar`. */
  moments: string[];
  allowCustomerNotes: boolean;
  optionGroups: ApiMenuOptionGroup[];
};

/** Published, available, non-archived products of visible categories, already ordered. */
export type ApiMenu = { categories: ApiMenuCategory[]; products: ApiMenuProduct[] };

/** `network`: the API could not answer (offline, server error, unexpected body). */
export type MenuResult = { ok: true; menu: ApiMenu } | { ok: false; error: "network" };

const ENDPOINT = "/api/catalog/menu";

type Fields = Record<string, unknown>;

function isObject(value: unknown): value is Fields {
  return typeof value === "object" && value !== null;
}

function isStringOrNull(value: unknown): boolean {
  return value === null || typeof value === "string";
}

function isOption(value: unknown): boolean {
  return (
    isObject(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.priceDelta === "number"
  );
}

function isOptionGroup(value: unknown): boolean {
  return (
    isObject(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    (value.selection === "single" || value.selection === "multiple") &&
    typeof value.required === "boolean" &&
    (value.max === null || typeof value.max === "number") &&
    isStringOrNull(value.defaultOptionId) &&
    Array.isArray(value.options) &&
    value.options.every(isOption)
  );
}

function isCategory(value: unknown): boolean {
  return (
    isObject(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.description === "string"
  );
}

function isProduct(value: unknown): boolean {
  return (
    isObject(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    isStringOrNull(value.plural) &&
    typeof value.description === "string" &&
    typeof value.price === "number" &&
    typeof value.categoryId === "string" &&
    isStringOrNull(value.image) &&
    Array.isArray(value.moments) &&
    value.moments.every((moment) => typeof moment === "string") &&
    typeof value.allowCustomerNotes === "boolean" &&
    Array.isArray(value.optionGroups) &&
    value.optionGroups.every(isOptionGroup)
  );
}

function isApiMenu(value: unknown): value is ApiMenu {
  return (
    isObject(value) &&
    Array.isArray(value.categories) &&
    value.categories.every(isCategory) &&
    Array.isArray(value.products) &&
    value.products.every(isProduct)
  );
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/** `GET /catalog/menu`: the menu customers can order from right now. */
export async function fetchMenu(): Promise<MenuResult> {
  let response: Response;
  try {
    response = await fetch(ENDPOINT, { cache: "no-store" });
  } catch {
    return { ok: false, error: "network" };
  }
  if (!response.ok) return { ok: false, error: "network" };
  const body = await readJson(response);
  return isApiMenu(body) ? { ok: true, menu: body } : { ok: false, error: "network" };
}
