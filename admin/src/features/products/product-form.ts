import type {
  ConsumptionMomentId,
  OptionSelection,
  Product,
  ProductCategoryId,
  ProductOption,
  ProductOptionGroup,
} from "@/mocks/service-day";
import { formatPrice } from "@/shared/lib/format-price";
import { CONSUMPTION_MOMENTS } from "@/mocks/service-day";
import { getCategoryLabel, normalizeText, type ProductCategoryOption } from "./product-catalog";

/** An option row while it is edited: the adjustment stays the typed text. */
export type OptionDraft = { id: string; name: string; priceDelta: string };

/** A "Personalizaciones" group while it is edited. */
export type OptionGroupDraft = {
  id: string;
  title: string;
  selection: OptionSelection;
  required: boolean;
  max?: number;
  defaultOptionId?: string;
  options: OptionDraft[];
};

/** Fields of the 07B editor, as typed. */
export type ProductDraft = {
  name: string;
  description: string;
  /** "Precio base (ARS)" as typed, e.g. "$4.600". */
  price: string;
  categoryId: ProductCategoryId | "";
  moments: ConsumptionMomentId[];
  image?: string;
  available: boolean;
  /** 07B "Publication Control": the publication "Guardar cambios" saves with. */
  published: boolean;
  allowCustomerNotes: boolean;
  optionGroups: OptionGroupDraft[];
};

/** "Guardar borrador" or "Publicar producto". */
export type SaveMode = "draft" | "publish";

export const NAME_MAX_LENGTH = 60;
export const DESCRIPTION_MAX_LENGTH = 140;
export const PRICE_MAX = 1_000_000;

/** Whole pesos, plain ("4600") or grouped with dots ("$4.600"). */
const PRICE_PATTERN = /^(?:\d+|\d{1,3}(?:\.\d{3})+)$/;

/** Reads a typed amount in whole pesos; null when it is empty, negative, decimal or malformed. */
export function parsePriceInput(value: string): number | null {
  const compact = value.replace(/\s+/g, "").replace(/^\$/, "");
  if (!PRICE_PATTERN.test(compact)) return null;
  return Number(compact.replace(/\./g, ""));
}

/** "+$800", as the 07B option rows. */
export function formatOptionDelta(amount: number): string {
  return `+${formatPrice(amount)}`;
}

/** 07B/07C option price: a free option is "Incluido" in a required group and "Sin cargo" otherwise. */
export function getOptionPriceLabel(priceDelta: number, required: boolean): string {
  if (priceDelta === 0) return required ? "Incluido" : "Sin cargo";
  return formatOptionDelta(priceDelta);
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** 07C "2 grupos · 6 opciones". */
export function getOptionGroupsSummary(groups: readonly { options: readonly unknown[] }[]): string {
  if (groups.length === 0) return "Sin personalizaciones";
  const options = groups.reduce((total, group) => total + group.options.length, 0);
  return `${plural(groups.length, "grupo", "grupos")} · ${plural(options, "opción", "opciones")}`;
}

type GroupSettings = Pick<OptionGroupDraft, "selection" | "required" | "max"> & { options: readonly unknown[] };

/** 07B group header: "Selección única · Obligatorio", "Selección múltiple · Máximo 2". */
export function getOptionGroupMeta(group: GroupSettings): string {
  const selection = group.selection === "single" ? "Selección única" : "Selección múltiple";
  if (group.options.length === 0) return `${selection} · Sin opciones`;
  if (group.required) return `${selection} · Obligatorio`;
  return `${selection} · ${group.selection === "multiple" && group.max ? `Máximo ${group.max}` : "Opcional"}`;
}

/** Customer-side hint: "Obligatorio · Elegí 1", "Opcional · Hasta 2". */
function getCustomerGroupMeta(group: GroupSettings): string {
  const requirement = group.required ? "Obligatorio" : "Opcional";
  if (group.selection === "single") return `${requirement} · Elegí 1`;
  return group.max ? `${requirement} · Hasta ${group.max}` : requirement;
}

/** The option preselected for customers: only required single groups have one (the chosen, else the first). */
function resolveDefaultOption(group: OptionGroupDraft): string | undefined {
  if (group.selection !== "single" || !group.required || group.options.length === 0) return undefined;
  return group.options.some((option) => option.id === group.defaultOptionId) ? group.defaultOptionId : group.options[0].id;
}

function toOptionDraft(option: ProductOption): OptionDraft {
  return { id: option.id, name: option.name, priceDelta: String(option.priceDelta) };
}

function toOptionGroupDraft(group: ProductOptionGroup): OptionGroupDraft {
  return { ...group, options: group.options.map(toOptionDraft) };
}

export function toProductDraft(product: Product): ProductDraft {
  return {
    name: product.name,
    description: product.description,
    price: formatPrice(product.price),
    categoryId: product.categoryId,
    moments: [...product.moments],
    image: product.image,
    available: product.available,
    published: product.publication === "published",
    allowCustomerNotes: product.allowCustomerNotes,
    optionGroups: product.optionGroups.map(toOptionGroupDraft),
  };
}

/** "Nuevo producto": empty, available, unpublished and accepting customer notes. */
export function createEmptyDraft(): ProductDraft {
  return {
    name: "",
    description: "",
    price: "",
    categoryId: "",
    moments: [],
    image: undefined,
    available: true,
    published: false,
    allowCustomerNotes: true,
    optionGroups: [],
  };
}

function toOption(option: OptionDraft): ProductOption {
  return { id: option.id, name: option.name.trim(), priceDelta: parsePriceInput(option.priceDelta) ?? 0 };
}

/** The saved group: the default only for required single groups, the limit only for multiple ones. */
function toOptionGroup(group: OptionGroupDraft): ProductOptionGroup {
  const saved: ProductOptionGroup = {
    id: group.id,
    title: group.title.trim(),
    selection: group.selection,
    required: group.required,
    options: group.options.map(toOption),
  };
  if (group.selection === "multiple" && group.max !== undefined) saved.max = group.max;
  const defaultOptionId = resolveDefaultOption(group);
  if (defaultOptionId) saved.defaultOptionId = defaultOptionId;
  return saved;
}

/**
 * The product saved from a valid draft. `base` gives the id, SKU, rank and the archived flag; the
 * save mode sets the publication. The plural name only survives while the name is unchanged.
 */
export function applyProductDraft(draft: ProductDraft, base: Product, mode: SaveMode): Product {
  const name = draft.name.trim();
  return {
    ...base,
    name,
    plural: name === base.name ? base.plural : undefined,
    price: parsePriceInput(draft.price) ?? base.price,
    categoryId: draft.categoryId || base.categoryId,
    description: draft.description.trim(),
    image: draft.image,
    moments: [...draft.moments],
    publication: mode === "publish" ? "published" : "draft",
    available: draft.available,
    allowCustomerNotes: draft.allowCustomerNotes,
    optionGroups: draft.optionGroups.map(toOptionGroup),
  };
}

export type ProductField = "name" | "description" | "price" | "categoryId" | "image";

/** Messages of one group: its title, its limit and its options by option id. */
export type OptionGroupErrors = { title?: string; max?: string; options?: Record<string, string> };

/** Field messages plus group messages by group id. Empty when the draft can be saved. */
export type ProductFormErrors = Partial<Record<ProductField, string>> & {
  optionGroups?: Record<string, OptionGroupErrors>;
};

export type ValidationContext = {
  mode: SaveMode;
  /** Names of the other products that are not archived, to keep names unique. */
  otherNames: readonly string[];
};

function validateOptions(options: readonly OptionDraft[]): Record<string, string> {
  const errors: Record<string, string> = {};
  const seen = new Set<string>();
  for (const option of options) {
    const name = normalizeText(option.name);
    if (!name) errors[option.id] = "Ingresá el nombre de la opción.";
    else if (seen.has(name)) errors[option.id] = "La opción ya existe en el grupo.";
    else if (parsePriceInput(option.priceDelta) === null) errors[option.id] = "Ingresá un ajuste válido.";
    seen.add(name);
  }
  return errors;
}

function validateOptionGroups(groups: readonly OptionGroupDraft[]): Record<string, OptionGroupErrors> {
  const errors: Record<string, OptionGroupErrors> = {};
  const seen = new Set<string>();
  for (const group of groups) {
    const groupErrors: OptionGroupErrors = {};
    const title = normalizeText(group.title);
    if (!title) groupErrors.title = "Ingresá el nombre del grupo.";
    else if (seen.has(title)) groupErrors.title = "El grupo ya existe.";
    seen.add(title);
    if (group.selection === "multiple" && group.max !== undefined && !(Number.isInteger(group.max) && group.max >= 1)) {
      groupErrors.max = "Ingresá un máximo válido.";
    }
    const options = validateOptions(group.options);
    if (Object.keys(options).length > 0) groupErrors.options = options;
    if (Object.keys(groupErrors).length > 0) errors[group.id] = groupErrors;
  }
  return errors;
}

/**
 * Checks the draft before saving. A draft only needs a name, a price, a category and valid
 * groups; publishing also asks for a description and an image.
 */
export function validateProductDraft(draft: ProductDraft, context: ValidationContext): ProductFormErrors {
  const errors: ProductFormErrors = {};
  const name = draft.name.trim();
  if (!name) errors.name = "Ingresá el nombre del producto.";
  else if (name.length > NAME_MAX_LENGTH) errors.name = `Usá hasta ${NAME_MAX_LENGTH} caracteres.`;
  else if (context.otherNames.some((other) => normalizeText(other) === normalizeText(name))) {
    errors.name = "Ya existe un producto con ese nombre.";
  }

  const description = draft.description.trim();
  if (description.length > DESCRIPTION_MAX_LENGTH) {
    errors.description = `Usá hasta ${DESCRIPTION_MAX_LENGTH} caracteres.`;
  } else if (!description && context.mode === "publish") {
    errors.description = "Ingresá una descripción para publicar.";
  }

  const price = parsePriceInput(draft.price);
  if (price === null || price <= 0) errors.price = "Ingresá un precio válido.";
  else if (price > PRICE_MAX) errors.price = `El precio máximo es ${formatPrice(PRICE_MAX)}.`;

  if (!draft.categoryId) errors.categoryId = "Elegí una categoría.";
  if (!draft.image && context.mode === "publish") errors.image = "Agregá una imagen para publicar.";

  const optionGroups = validateOptionGroups(draft.optionGroups);
  if (Object.keys(optionGroups).length > 0) errors.optionGroups = optionGroups;
  return errors;
}

export function hasFormErrors(errors: ProductFormErrors): boolean {
  const { optionGroups, ...fields } = errors;
  return (
    Object.keys(fields).length > 0 ||
    Object.values(optionGroups ?? {}).some(
      (group) => Boolean(group.title || group.max) || Object.keys(group.options ?? {}).length > 0,
    )
  );
}

function sameOptions(a: readonly OptionDraft[], b: readonly OptionDraft[]): boolean {
  return (
    a.length === b.length &&
    a.every(
      (option, index) =>
        option.name.trim() === b[index].name.trim() &&
        parsePriceInput(option.priceDelta) === parsePriceInput(b[index].priceDelta),
    )
  );
}

function sameGroup(a: OptionGroupDraft, b: OptionGroupDraft): boolean {
  return (
    a.title.trim() === b.title.trim() &&
    a.selection === b.selection &&
    a.required === b.required &&
    (a.selection === "multiple" ? a.max : undefined) === (b.selection === "multiple" ? b.max : undefined) &&
    resolveDefaultOption(a) === resolveDefaultOption(b) &&
    sameOptions(a.options, b.options)
  );
}

/**
 * Change labels of the groups: the saved title of each edited group, or "Personalizaciones" when
 * groups were added, removed or reordered.
 */
function getOptionGroupChanges(saved: readonly OptionGroupDraft[], draft: readonly OptionGroupDraft[]): string[] {
  const sameStructure = saved.length === draft.length && saved.every((group, index) => group.id === draft[index].id);
  if (!sameStructure) return ["Personalizaciones"];
  const labels = saved.flatMap((group, index) =>
    sameGroup(group, draft[index]) ? [] : [group.title.trim() || draft[index].title.trim() || "Personalizaciones"],
  );
  return [...new Set(labels)];
}

/** Same amount, or the same text when neither is a valid amount. */
function samePrice(a: string, b: string): boolean {
  const left = parsePriceInput(a);
  const right = parsePriceInput(b);
  return left === null && right === null ? a.trim() === b.trim() : left === right;
}

function sameMoments(a: readonly ConsumptionMomentId[], b: readonly ConsumptionMomentId[]): boolean {
  return a.length === b.length && a.every((moment) => b.includes(moment));
}

/** Labels of the fields that differ from the saved product, in form order. */
export function getProductChanges(saved: ProductDraft, draft: ProductDraft): string[] {
  const checks: [string, boolean][] = [
    ["Nombre del producto", saved.name.trim() !== draft.name.trim()],
    ["Descripción", saved.description.trim() !== draft.description.trim()],
    ["Precio base", !samePrice(saved.price, draft.price)],
    ["Categoría", saved.categoryId !== draft.categoryId],
    ["Momentos de consumo", !sameMoments(saved.moments, draft.moments)],
    ["Imagen principal", saved.image !== draft.image],
  ];
  const tail: [string, boolean][] = [
    ["Observaciones del cliente", saved.allowCustomerNotes !== draft.allowCustomerNotes],
    ["Publicación", saved.published !== draft.published],
    ["Disponibilidad", saved.available !== draft.available],
  ];
  const changed = (list: [string, boolean][]) => list.filter(([, isChanged]) => isChanged).map(([label]) => label);
  return [...changed(checks), ...getOptionGroupChanges(saved.optionGroups, draft.optionGroups), ...changed(tail)];
}

/** "Desayunar · Merendar · Tomar", in the 07B chip order. */
export function getMomentsLabel(moments: readonly ConsumptionMomentId[]): string {
  const labels = CONSUMPTION_MOMENTS.filter((moment) => moments.includes(moment.id)).map((moment) => moment.label);
  return labels.length > 0 ? labels.join(" · ") : "Sin momentos";
}

/** One option as the customer sees it. */
export type PreviewOption = {
  id: string;
  name: string;
  /** Adjustment in whole pesos (0 when the typed one is invalid). */
  priceDelta: number;
  /** "Incluido", "Sin cargo", "+$800". */
  priceLabel: string;
  /** 07B phone chip: "Mediano +$800", or just the name for a free option. */
  chipLabel: string;
  selected: boolean;
};

/** One customization group as the customer sees it. */
export type PreviewGroup = {
  id: string;
  title: string;
  selection: OptionSelection;
  required: boolean;
  /** Limit of a multiple group, if any. */
  max?: number;
  /** "Obligatorio · Elegí 1" / "Opcional · Hasta 2". */
  meta: string;
  options: PreviewOption[];
};

export type PreviewModel = {
  name: string;
  description: string;
  image?: string;
  price: string;
  /** Base price in whole pesos, for the configured total. */
  basePrice: number;
  /** Groups with at least one named option, in display order. */
  groups: PreviewGroup[];
  /** 07C "2 grupos · 6 opciones" of the shown groups. */
  optionsSummary: string;
  /** "Agregar · $5.400": base price plus the preselected options. */
  addLabel: string;
  categoryLabel: string;
  momentsLabel: string;
  availabilityLabel: string;
};

function toPreviewGroup(group: OptionGroupDraft): PreviewGroup {
  const defaultOptionId = resolveDefaultOption(group);
  return {
    id: group.id,
    title: group.title.trim(),
    selection: group.selection,
    required: group.required,
    max: group.selection === "multiple" ? group.max : undefined,
    meta: getCustomerGroupMeta(group),
    options: group.options.map((option) => {
      const name = option.name.trim();
      const priceDelta = parsePriceInput(option.priceDelta) ?? 0;
      return {
        id: option.id,
        name,
        priceDelta,
        priceLabel: getOptionPriceLabel(priceDelta, group.required),
        chipLabel: priceDelta > 0 ? `${name} ${formatOptionDelta(priceDelta)}` : name,
        selected: option.id === defaultOptionId,
      };
    }),
  };
}

/** What the customer would see for this draft (07B "Live Product Preview", 07C). */
export function getPreviewModel(draft: ProductDraft, categories?: readonly ProductCategoryOption[]): PreviewModel {
  const price = parsePriceInput(draft.price) ?? 0;
  const groups = draft.optionGroups
    .map((group) => ({ ...group, options: group.options.filter((option) => option.name.trim()) }))
    .filter((group) => group.options.length > 0);
  const preselected = groups.reduce((total, group) => {
    const option = group.options.find((candidate) => candidate.id === resolveDefaultOption(group));
    return total + (option ? (parsePriceInput(option.priceDelta) ?? 0) : 0);
  }, 0);
  return {
    name: draft.name.trim() || "Nuevo producto",
    description: draft.description.trim(),
    image: draft.image,
    price: formatPrice(price),
    basePrice: price,
    groups: groups.map(toPreviewGroup),
    optionsSummary: getOptionGroupsSummary(groups),
    addLabel: `Agregar · ${formatPrice(price + preselected)}`,
    categoryLabel: getCategoryLabel(draft.categoryId, categories) ?? "Sin categoría",
    momentsLabel: getMomentsLabel(draft.moments),
    availabilityLabel: draft.available ? "Disponible" : "No disponible",
  };
}

const IMAGE_FORMATS: Record<string, string> = { jpg: "JPG", jpeg: "JPG", png: "PNG", webp: "WEBP", avif: "AVIF", gif: "GIF" };

/**
 * 07B "Image Metadata": the format of the photo ("WEBP"), or the accepted formats without one. The
 * export also shows the pixel size, which the optimized `next/image` cannot report.
 */
export function getImageFormatLabel(src: string | undefined): string {
  if (!src) return "JPG, PNG o WEBP";
  const extension = src.split(/[?#]/)[0].split(".").pop()?.toLowerCase() ?? "";
  return src.startsWith("blob:") ? "Imagen local" : (IMAGE_FORMATS[extension] ?? "Imagen");
}
