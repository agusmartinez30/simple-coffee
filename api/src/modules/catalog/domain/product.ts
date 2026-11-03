import { normalizeName } from './slug.js';

/**
 * A menu product with its customization groups (admin 07B editor). Rules ported from
 * `admin/src/features/products/{product-form,product-catalog}.ts`. Money is integer ARS pesos.
 */

export const PRODUCT_NAME_MAX_LENGTH = 60;
export const PRODUCT_DESCRIPTION_MAX_LENGTH = 140;
export const PRICE_MAX = 1_000_000;
export const OPTION_GROUP_TITLE_MAX_LENGTH = 40;
export const OPTION_NAME_MAX_LENGTH = 40;
export const PRODUCT_PLURAL_MAX_LENGTH = PRODUCT_NAME_MAX_LENGTH;
/** Public path or URL of the main photo (no upload: the image is stored as text). */
export const PRODUCT_IMAGE_MAX_LENGTH = 500;

/** Consumption moments of the admin 07B chips and 08A collections. */
export const PRODUCT_MOMENTS = ['desayunar', 'merendar', 'cenar', 'tomar'] as const;
export type ProductMoment = (typeof PRODUCT_MOMENTS)[number];

export const isProductMoment = (value: string): value is ProductMoment => (PRODUCT_MOMENTS as readonly string[]).includes(value);

export const PRODUCT_PUBLICATIONS = ['published', 'draft'] as const;
export type ProductPublication = (typeof PRODUCT_PUBLICATIONS)[number];

export const OPTION_SELECTIONS = ['single', 'multiple'] as const;
export type OptionSelection = (typeof OPTION_SELECTIONS)[number];

export interface ProductOption {
  id: string;
  name: string;
  /** Added to the product price when chosen; 0 for free options. */
  priceDelta: number;
}

export interface ProductOptionGroup {
  id: string;
  title: string;
  selection: OptionSelection;
  required: boolean;
  /** Most options a customer may choose: always 1 for single groups, null when a multiple group has no limit. */
  max: number | null;
  /** Preselected option of a single group; null when none. */
  defaultOptionId: string | null;
  options: ProductOption[];
}

export interface Product {
  id: string;
  /** "CAF-014": category prefix and sequence unless given; unique, archived products included. */
  sku: string;
  name: string;
  /** Display name for quantities above one ("Medialunas"); null when it is the name itself. */
  plural: string | null;
  description: string;
  price: number;
  categoryId: string;
  /** Public path or URL of the main photo; null shows a placeholder. */
  image: string | null;
  /** Moments the product is offered for, without repeats. */
  moments: ProductMoment[];
  publication: ProductPublication;
  available: boolean;
  /** Never hard-deleted: archived products leave the menu and the admin list but keep their sku. */
  archived: boolean;
  allowCustomerNotes: boolean;
  /** Commercial rank within the category, from 1. */
  position: number;
  /** Bumped by every change (display and audit only). */
  version: number;
  optionGroups: ProductOptionGroup[];
  createdAt: Date;
  updatedAt: Date;
}

/** Ids are those of the product being edited; omitted for new groups and options. */
export interface OptionDraft {
  id?: string;
  name: string;
  priceDelta: number;
}

export interface OptionGroupDraft {
  id?: string;
  title: string;
  selection: OptionSelection;
  required: boolean;
  max?: number | null;
  /** Name of the preselected option (names are unique within a group). */
  defaultOption?: string | null;
  options: OptionDraft[];
}

/** Editable fields of a product (admin 07B form). Without `sku` the next one of the category is generated. */
export interface ProductDraft {
  sku?: string;
  name: string;
  /** Blank means none. */
  plural: string | null;
  description: string;
  price: number;
  categoryId: string;
  /** Blank means none. */
  image: string | null;
  /** Moment ids as sent; checked against `PRODUCT_MOMENTS`. */
  moments: string[];
  publication: ProductPublication;
  available: boolean;
  allowCustomerNotes: boolean;
  optionGroups: OptionGroupDraft[];
}

type GroupPath = `optionGroups.${number}`;
type OptionPath = `${GroupPath}.options.${number}`;

export type ProductIssue =
  | { path: 'sku'; code: 'invalid_format' | 'duplicate' }
  | { path: 'name'; code: 'required' | 'too_long' | 'duplicate' }
  | { path: 'plural'; code: 'too_long' }
  | { path: 'description'; code: 'too_long' }
  | { path: 'price'; code: 'out_of_range' }
  | { path: 'categoryId'; code: 'unknown_category' }
  | { path: 'image'; code: 'too_long' }
  | { path: `moments.${number}`; code: 'unknown_moment' | 'duplicate' }
  | { path: `${GroupPath}.id`; code: 'unknown_group' }
  | { path: `${GroupPath}.title`; code: 'required' | 'too_long' | 'duplicate' }
  | { path: `${GroupPath}.max`; code: 'out_of_range' }
  | { path: `${GroupPath}.defaultOption`; code: 'unknown_option' | 'not_allowed' }
  | { path: `${GroupPath}.options`; code: 'required' }
  | { path: `${OptionPath}.id`; code: 'unknown_option' }
  | { path: `${OptionPath}.name`; code: 'required' | 'too_long' | 'duplicate' }
  | { path: `${OptionPath}.priceDelta`; code: 'out_of_range' };

const SKU_PATTERN = /^[A-Z0-9]{1,8}(-[A-Z0-9]{1,8}){0,2}$/;

/** Trimmed text, null when blank. */
function optionalText(value: string | null): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
}

export function normalizeProductDraft(draft: ProductDraft): ProductDraft {
  return {
    ...draft,
    ...(draft.sku === undefined ? {} : { sku: draft.sku.trim().toUpperCase() }),
    name: draft.name.trim(),
    plural: optionalText(draft.plural),
    description: draft.description.trim(),
    image: optionalText(draft.image),
    moments: draft.moments.map((moment) => moment.trim()),
    optionGroups: draft.optionGroups.map((group) => ({
      ...group,
      title: group.title.trim(),
      options: group.options.map((option) => ({ ...option, name: option.name.trim() })),
    })),
  };
}

export interface ProductRulesContext {
  categoryIds: readonly string[];
  /** Every other product, archived ones included. */
  others: readonly Product[];
  /** The product being edited; null when creating. */
  current: Product | null;
}

const isAmount = (value: number, min: number) => Number.isInteger(value) && value >= min && value <= PRICE_MAX;

function nameIssue(name: string, maxLength: number, taken: readonly string[]): 'required' | 'too_long' | 'duplicate' | null {
  const normalized = normalizeName(name);
  if (normalized === '') return 'required';
  if (name.trim().length > maxLength) return 'too_long';
  return taken.some((other) => normalizeName(other) === normalized) ? 'duplicate' : null;
}

function groupIssues(group: OptionGroupDraft, index: number, titles: readonly string[], current: Product | null): ProductIssue[] {
  const path: GroupPath = `optionGroups.${index}`;
  const issues: ProductIssue[] = [];
  const saved = group.id === undefined ? undefined : current?.optionGroups.find((candidate) => candidate.id === group.id);
  if (group.id !== undefined && !saved) issues.push({ path: `${path}.id`, code: 'unknown_group' });
  const title = nameIssue(group.title, OPTION_GROUP_TITLE_MAX_LENGTH, titles);
  if (title) issues.push({ path: `${path}.title`, code: title });
  // Single groups take exactly one option; a multiple group's limit, when set, is at least 1.
  const max = group.max ?? null;
  if (group.selection === 'single' ? max !== null && max !== 1 : max !== null && !(Number.isInteger(max) && max >= 1)) {
    issues.push({ path: `${path}.max`, code: 'out_of_range' });
  }
  const defaultOption = group.defaultOption ?? null;
  if (defaultOption !== null) {
    if (group.selection !== 'single') issues.push({ path: `${path}.defaultOption`, code: 'not_allowed' });
    else if (!group.options.some((option) => normalizeName(option.name) === normalizeName(defaultOption))) {
      issues.push({ path: `${path}.defaultOption`, code: 'unknown_option' });
    }
  }
  if (group.options.length === 0) issues.push({ path: `${path}.options`, code: 'required' });
  group.options.forEach((option, optionIndex) => {
    const optionPath: OptionPath = `${path}.options.${optionIndex}`;
    if (option.id !== undefined && !saved?.options.some((candidate) => candidate.id === option.id)) {
      issues.push({ path: `${optionPath}.id`, code: 'unknown_option' });
    }
    const name = nameIssue(
      option.name,
      OPTION_NAME_MAX_LENGTH,
      group.options.slice(0, optionIndex).map((previous) => previous.name),
    );
    if (name) issues.push({ path: `${optionPath}.name`, code: name });
    if (!isAmount(option.priceDelta, 0)) issues.push({ path: `${optionPath}.priceDelta`, code: 'out_of_range' });
  });
  return issues;
}

/**
 * Unique name (among products not archived) up to 60 characters, plural up to 60, description up
 * to 140, an integer price from 1 to 1,000,000, an existing category, an image path up to 500,
 * known moments without repeats, a unique sku when given and valid option groups.
 */
export function productDraftIssues(input: ProductDraft, { categoryIds, others, current }: ProductRulesContext): ProductIssue[] {
  const draft = normalizeProductDraft(input);
  const issues: ProductIssue[] = [];
  if (draft.sku !== undefined) {
    if (!SKU_PATTERN.test(draft.sku)) issues.push({ path: 'sku', code: 'invalid_format' });
    else if (others.some((product) => product.sku === draft.sku)) issues.push({ path: 'sku', code: 'duplicate' });
  }
  const name = nameIssue(
    draft.name,
    PRODUCT_NAME_MAX_LENGTH,
    others.filter((product) => !product.archived).map((product) => product.name),
  );
  if (name) issues.push({ path: 'name', code: name });
  if ((draft.plural?.length ?? 0) > PRODUCT_PLURAL_MAX_LENGTH) issues.push({ path: 'plural', code: 'too_long' });
  if (draft.description.length > PRODUCT_DESCRIPTION_MAX_LENGTH) issues.push({ path: 'description', code: 'too_long' });
  if (!isAmount(draft.price, 1)) issues.push({ path: 'price', code: 'out_of_range' });
  if (!categoryIds.includes(draft.categoryId)) issues.push({ path: 'categoryId', code: 'unknown_category' });
  if ((draft.image?.length ?? 0) > PRODUCT_IMAGE_MAX_LENGTH) issues.push({ path: 'image', code: 'too_long' });
  draft.moments.forEach((moment, index) => {
    if (!isProductMoment(moment)) issues.push({ path: `moments.${index}`, code: 'unknown_moment' });
    else if (draft.moments.indexOf(moment) < index) issues.push({ path: `moments.${index}`, code: 'duplicate' });
  });
  draft.optionGroups.forEach((group, index) => {
    issues.push(
      ...groupIssues(
        group,
        index,
        draft.optionGroups.slice(0, index).map((previous) => previous.title),
        current,
      ),
    );
  });
  return issues;
}

/** Fields of a product that do not come from the form. */
export type ProductIdentity = Pick<Product, 'id' | 'sku' | 'archived' | 'position' | 'version' | 'createdAt' | 'updatedAt'>;

/** The product of a valid, normalized draft; new groups and options get ids from `nextId`. */
export function assembleProduct(draft: ProductDraft, identity: ProductIdentity, nextId: () => string): Product {
  // The sku comes from the identity: given, generated or kept.
  const { name, plural, description, price, categoryId, image, moments, publication, available, allowCustomerNotes, optionGroups } = draft;
  return {
    ...identity,
    name,
    plural,
    description,
    price,
    categoryId,
    image,
    moments: moments.filter(isProductMoment),
    publication,
    available,
    allowCustomerNotes,
    optionGroups: optionGroups.map((group) => {
      const options = group.options.map((option) => ({ id: option.id ?? nextId(), name: option.name, priceDelta: option.priceDelta }));
      const defaultOption = group.selection === 'single' ? (group.defaultOption ?? null) : null;
      return {
        id: group.id ?? nextId(),
        title: group.title,
        selection: group.selection,
        required: group.required,
        max: group.selection === 'single' ? 1 : (group.max ?? null),
        defaultOptionId:
          defaultOption === null
            ? null
            : (options.find((option) => normalizeName(option.name) === normalizeName(defaultOption))?.id ?? null),
        options,
      };
    }),
  };
}

/** The form of a saved product, so a partial update can be validated as a whole. */
export function toProductDraft(product: Product): ProductDraft {
  return {
    sku: product.sku,
    name: product.name,
    plural: product.plural,
    description: product.description,
    price: product.price,
    categoryId: product.categoryId,
    image: product.image,
    moments: [...product.moments],
    publication: product.publication,
    available: product.available,
    allowCustomerNotes: product.allowCustomerNotes,
    optionGroups: product.optionGroups.map((group) => ({
      id: group.id,
      title: group.title,
      selection: group.selection,
      required: group.required,
      max: group.max,
      defaultOption: group.options.find((option) => option.id === group.defaultOptionId)?.name ?? null,
      options: group.options.map((option) => ({ ...option })),
    })),
  };
}

/** Sku prefix of a category: the first three letters of its slug, upper case ("cafes" → "CAF"), padded with X. */
export function skuPrefixFor(categoryId: string): string {
  return (categoryId.replace(/[^a-z]/gi, '').slice(0, 3).toUpperCase() + 'XXX').slice(0, 3);
}

/** Next sku of the category prefix: one above the highest taken number ("CAF-018"). */
export function createProductSku(categoryId: string, existingSkus: readonly string[]): string {
  const prefix = skuPrefixFor(categoryId);
  const taken = existingSkus
    .filter((sku) => sku.startsWith(`${prefix}-`))
    .map((sku) => Number(sku.slice(prefix.length + 1)))
    .filter(Number.isInteger);
  const next = Math.max(0, ...taken) + 1;
  return `${prefix}-${String(next).padStart(3, '0')}`;
}

export type OrderBlock = 'archived' | 'draft' | 'unavailable';

/** Only published, available products that are not archived can be ordered; otherwise the first reason. */
export function orderBlock(product: Pick<Product, 'archived' | 'publication' | 'available'>): OrderBlock | null {
  if (product.archived) return 'archived';
  if (product.publication !== 'published') return 'draft';
  return product.available ? null : 'unavailable';
}
