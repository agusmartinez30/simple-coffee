import type {
  ConsumptionMomentId,
  OptionSelection,
  Product,
  ProductOption,
  ProductOptionGroup,
  ProductPublication,
} from "@/mocks/service-day";
import type { ProductCategoryOption } from "./product-catalog";
import type { OptionGroupErrors, ProductDraft, ProductField, ProductFormErrors } from "./product-form";

/**
 * `/catalog/*` API body ↔ admin products model. The API answers `position` (rank within the
 * category), `null` for unset texts, limits and defaults, and takes the preselected option of a
 * group by NAME; ids go only with the groups and options the saved product already has.
 */

export type ProductOptionBody = { id?: string; name: string; priceDelta: number };

export type ProductOptionGroupBody = {
  id?: string;
  title: string;
  selection: OptionSelection;
  required: boolean;
  max: number | null;
  /** Name of the preselected option. */
  defaultOption: string | null;
  options: ProductOptionBody[];
};

/** `POST /catalog/products` and `PATCH /catalog/products/:id` body (no sku: the API keeps or generates it). */
export type ProductBody = {
  name: string;
  plural: string | null;
  description: string;
  price: number;
  categoryId: string;
  image: string | null;
  moments: ConsumptionMomentId[];
  publication: ProductPublication;
  available: boolean;
  allowCustomerNotes: boolean;
  optionGroups: ProductOptionGroupBody[];
};

/** A 400 issue: `{ path: "optionGroups.0.title", code: "duplicate" }`. */
export type ProductIssue = { path: string; code: string };

const MOMENTS: readonly ConsumptionMomentId[] = ["desayunar", "merendar", "cenar", "tomar"];
const PUBLICATIONS: readonly ProductPublication[] = ["published", "draft"];
const SELECTIONS: readonly OptionSelection[] = ["single", "multiple"];

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const isString = (value: unknown): value is string => typeof value === "string";
const isNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const isBoolean = (value: unknown): value is boolean => typeof value === "boolean";
const isMoment = (value: unknown): value is ConsumptionMomentId => MOMENTS.includes(value as ConsumptionMomentId);

function mapAll<T>(values: unknown, map: (value: unknown) => T | null): T[] | null {
  if (!Array.isArray(values)) return null;
  const mapped = values.map(map);
  return mapped.every((entry) => entry !== null) ? (mapped as T[]) : null;
}

function toOption(value: unknown): ProductOption | null {
  if (!isRecord(value) || !isString(value.id) || !isString(value.name) || !isNumber(value.priceDelta)) return null;
  return { id: value.id, name: value.name, priceDelta: value.priceDelta };
}

function toOptionGroup(value: unknown): ProductOptionGroup | null {
  if (!isRecord(value)) return null;
  const { id, title, selection, required, max, defaultOptionId } = value;
  if (!isString(id) || !isString(title) || !SELECTIONS.includes(selection as OptionSelection) || !isBoolean(required)) {
    return null;
  }
  const options = mapAll(value.options, toOption);
  if (options === null) return null;
  const group: ProductOptionGroup = { id, title, selection: selection as OptionSelection, required, options };
  // The admin keeps a limit only on multiple groups: a single one always takes exactly one.
  if (selection === "multiple" && isNumber(max)) group.max = max;
  if (isString(defaultOptionId)) group.defaultOptionId = defaultOptionId;
  return group;
}

/** One API product, or null when the body is not one. Unknown moment ids are dropped. */
export function toProduct(value: unknown): Product | null {
  if (!isRecord(value)) return null;
  const { id, sku, name, plural, description, price, categoryId, image, moments, publication, available, archived } = value;
  if (!isString(id) || !isString(sku) || !isString(name) || !isString(description) || !isNumber(price)) return null;
  if (!isString(categoryId) || !Array.isArray(moments) || !PUBLICATIONS.includes(publication as ProductPublication)) return null;
  if (!isBoolean(available) || !isBoolean(archived) || !isBoolean(value.allowCustomerNotes) || !isNumber(value.position)) {
    return null;
  }
  const optionGroups = mapAll(value.optionGroups, toOptionGroup);
  if (optionGroups === null) return null;
  const product: Product = {
    id,
    sku,
    commercialRank: value.position,
    name,
    price,
    categoryId,
    description,
    moments: moments.filter(isMoment),
    publication: publication as ProductPublication,
    available,
    archived,
    allowCustomerNotes: value.allowCustomerNotes,
    optionGroups,
  };
  if (isString(plural) && plural !== "") product.plural = plural;
  if (isString(image) && image !== "") product.image = image;
  return product;
}

/** A list of API products, or null when any entry is not one. */
export function toProducts(value: unknown): Product[] | null {
  return mapAll(value, toProduct);
}

/** `GET /catalog/categories` → select options by position; hidden categories stay assignable. */
export function toProductCategories(value: unknown): ProductCategoryOption[] | null {
  const categories = mapAll(value, (entry) =>
    isRecord(entry) && isString(entry.id) && isString(entry.name) && isNumber(entry.position)
      ? { id: entry.id, label: entry.name, position: entry.position }
      : null,
  );
  if (categories === null) return null;
  return [...categories].sort((a, b) => a.position - b.position).map(({ id, label }) => ({ id, label }));
}

/**
 * The request body of an admin product. `current` is the product as the API last answered it
 * (null when creating): only its group and option ids are sent, so new ones get API ids.
 */
export function toProductBody(product: Product, current: Product | null): ProductBody {
  return {
    name: product.name,
    plural: product.plural ?? null,
    description: product.description,
    price: product.price,
    categoryId: product.categoryId,
    image: product.image ?? null,
    moments: [...product.moments],
    publication: product.publication,
    available: product.available,
    allowCustomerNotes: product.allowCustomerNotes,
    optionGroups: product.optionGroups.map((group) => {
      const saved = current?.optionGroups.find((candidate) => candidate.id === group.id);
      const options = group.options.map((option): ProductOptionBody => {
        const body = { name: option.name, priceDelta: option.priceDelta };
        return saved?.options.some((candidate) => candidate.id === option.id) ? { id: option.id, ...body } : body;
      });
      const body: ProductOptionGroupBody = {
        title: group.title,
        selection: group.selection,
        required: group.required,
        max: group.selection === "multiple" ? (group.max ?? null) : null,
        defaultOption: group.options.find((option) => option.id === group.defaultOptionId)?.name ?? null,
        options,
      };
      return saved ? { id: group.id, ...body } : body;
    }),
  };
}

const FIELD_MESSAGES: Record<ProductField, Record<string, string>> = {
  name: {
    required: "Ingresá el nombre del producto.",
    too_long: "Usá hasta 60 caracteres.",
    duplicate: "Ya existe un producto con ese nombre.",
  },
  description: { too_long: "Usá hasta 140 caracteres." },
  price: { out_of_range: "Ingresá un precio válido." },
  categoryId: { unknown_category: "La categoría ya no existe. Elegí otra." },
  image: { too_long: "La dirección de la imagen es demasiado larga." },
};

const GROUP_MESSAGES: Record<"title" | "max", Record<string, string>> = {
  title: { required: "Ingresá el nombre del grupo.", too_long: "Usá hasta 40 caracteres.", duplicate: "El grupo ya existe." },
  max: { out_of_range: "Ingresá un máximo válido." },
};

const OPTION_MESSAGES: Record<"name" | "priceDelta", Record<string, string>> = {
  name: {
    required: "Ingresá el nombre de la opción.",
    too_long: "Usá hasta 40 caracteres.",
    duplicate: "La opción ya existe en el grupo.",
  },
  priceDelta: { out_of_range: "Ingresá un ajuste válido." },
};

const GROUP_PATH = /^optionGroups\.(\d+)\.(title|max)$/;
const OPTION_PATH = /^optionGroups\.(\d+)\.options\.(\d+)\.(name|priceDelta)$/;

/**
 * Editor messages for the API's 400 issues. Group and option indexes follow the draft order (the
 * body keeps it); issues with no editor field (sku, moments, ids) are left out.
 */
export function toFormErrors(issues: readonly ProductIssue[], draft: ProductDraft): ProductFormErrors {
  const errors: ProductFormErrors = {};
  const groupErrors = (groupId: string): OptionGroupErrors => {
    errors.optionGroups ??= {};
    return (errors.optionGroups[groupId] ??= {});
  };
  for (const { path, code } of issues) {
    if (path in FIELD_MESSAGES) {
      const message = FIELD_MESSAGES[path as ProductField][code];
      if (message) errors[path as ProductField] ??= message;
      continue;
    }
    const group = GROUP_PATH.exec(path);
    if (group) {
      const target = draft.optionGroups[Number(group[1])];
      const key = group[2] as "title" | "max";
      const message = GROUP_MESSAGES[key][code];
      if (target && message) groupErrors(target.id)[key] ??= message;
      continue;
    }
    const option = OPTION_PATH.exec(path);
    if (option) {
      const target = draft.optionGroups[Number(option[1])];
      const optionId = target?.options[Number(option[2])]?.id;
      const message = OPTION_MESSAGES[option[3] as "name" | "priceDelta"][code];
      if (target && optionId && message) {
        const entry = groupErrors(target.id);
        entry.options ??= {};
        entry.options[optionId] ??= message;
      }
    }
  }
  return errors;
}
