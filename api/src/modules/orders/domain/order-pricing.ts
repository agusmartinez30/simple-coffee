import type { NewOrder, OrderItemOption } from './order.js';
import { InvalidOrderError, ProductNotOrderableError, TableDisabledError } from './orders-errors.js';

/** Creating an order: what the client sends is checked and priced against the catalog and the table. */

export const ORDER_LINES_MAX = 50;
export const QUANTITY_MIN = 1;
export const QUANTITY_MAX = 99;
export const CUSTOMER_NAME_MAX_LENGTH = 40;
/** Same limit as the web product note ("Nota para cocina"). */
export const ORDER_NOTE_MAX_LENGTH = 140;
export const ITEM_NOTE_MAX_LENGTH = 140;

/** Client input: ids, quantities and notes only; prices always come from the catalog. */
export interface OrderLineDraft {
  productId: string;
  quantity: number;
  optionIds?: readonly string[];
  note?: string | null;
}

export interface OrderDraft {
  tableNumber: number;
  /** Defaults to the table name ("Mesa 07") when blank or omitted. */
  customerName?: string | null;
  note?: string | null;
  lines: readonly OrderLineDraft[];
}

/** The catalog product fields pricing needs (structurally the catalog's `Product`). */
export interface PricingProduct {
  id: string;
  sku: string;
  name: string;
  price: number;
  allowCustomerNotes: boolean;
  optionGroups: readonly {
    id: string;
    title: string;
    selection: 'single' | 'multiple';
    required: boolean;
    /** Most choices allowed; null when a multiple group has no limit. */
    max: number | null;
    defaultOptionId: string | null;
    options: readonly { id: string; name: string; priceDelta: number }[];
  }[];
}

/** A requested product as the catalog resolved it: `block` says why it cannot be ordered, null when it can. */
export interface ProductLookup {
  id: string;
  product: PricingProduct | null;
  block: string | null;
}

/** The table the order is for; null when no table has the number. */
export interface OrderTable {
  number: number;
  label: string;
  spaceName: string;
  enabled: boolean;
}

type LinePath = `lines.${number}`;

export type OrderIssue =
  | { path: 'tableNumber'; code: 'unknown_table' }
  | { path: 'customerName'; code: 'too_long' }
  | { path: 'note'; code: 'too_long' }
  | { path: 'lines'; code: 'required' | 'too_many' }
  | { path: `${LinePath}.quantity`; code: 'out_of_range' }
  | { path: `${LinePath}.productId`; code: 'unknown_product' }
  | { path: `${LinePath}.optionIds.${number}`; code: 'unknown_option' | 'duplicate_option' }
  | { path: `${LinePath}.optionIds`; code: 'missing_required_group' | 'too_many_options'; groupId: string }
  | { path: `${LinePath}.note`; code: 'not_allowed' | 'too_long' };

/** Fields of a new order that come from the request, the table and the catalog. */
export type PreparedOrder = Pick<NewOrder, 'tableNumber' | 'tableLabel' | 'spaceName' | 'customerName' | 'note' | 'total' | 'items'>;

/** "Mesa 07", as the web names orders placed from the table. */
export function defaultCustomerName(tableNumber: number): string {
  return `Mesa ${String(tableNumber).padStart(2, '0')}`;
}

/** Trimmed text; null when blank. */
function optionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
}

interface PricedLine {
  issues: OrderIssue[];
  options: OrderItemOption[];
}

/** Checks the chosen options against the product's groups; a required group without choice takes its default. */
function priceOptions(product: PricingProduct, optionIds: readonly string[], path: LinePath): PricedLine {
  const issues: OrderIssue[] = [];
  const chosen = new Set<string>();
  optionIds.forEach((optionId, index) => {
    if (chosen.has(optionId)) issues.push({ path: `${path}.optionIds.${index}`, code: 'duplicate_option' });
    else if (!product.optionGroups.some((group) => group.options.some((option) => option.id === optionId))) {
      issues.push({ path: `${path}.optionIds.${index}`, code: 'unknown_option' });
    }
    chosen.add(optionId);
  });

  const options: OrderItemOption[] = [];
  for (const group of product.optionGroups) {
    let picked = group.options.filter((option) => chosen.has(option.id));
    if (picked.length === 0 && group.required) {
      picked = group.options.filter((option) => option.id === group.defaultOptionId);
      if (picked.length === 0) issues.push({ path: `${path}.optionIds`, code: 'missing_required_group', groupId: group.id });
    }
    const max = group.selection === 'single' ? 1 : group.max;
    if (max !== null && picked.length > max) issues.push({ path: `${path}.optionIds`, code: 'too_many_options', groupId: group.id });
    options.push(...picked.map((option) => ({ groupTitle: group.title, optionName: option.name, priceDelta: option.priceDelta })));
  }
  return { issues, options };
}

/**
 * Validates the draft and prices it: an existing table, 1 to 50 lines with integer quantities from 1
 * to 99, known products and options that satisfy their groups (required groups fall back to their
 * default option; single groups take one option; multiple groups up to their max), item notes only
 * on products that accept them, and names and notes within their limits. Unit price = product price
 * + chosen option deltas. A valid request is then refused when the table is disabled or a product
 * cannot be ordered now.
 */
export function prepareOrder(draft: OrderDraft, context: { table: OrderTable | null; products: readonly ProductLookup[] }): PreparedOrder {
  const issues: OrderIssue[] = [];
  const { table } = context;
  if (!table) issues.push({ path: 'tableNumber', code: 'unknown_table' });
  const customerName = optionalText(draft.customerName) ?? defaultCustomerName(draft.tableNumber);
  if (customerName.length > CUSTOMER_NAME_MAX_LENGTH) issues.push({ path: 'customerName', code: 'too_long' });
  const note = optionalText(draft.note);
  if (note !== null && note.length > ORDER_NOTE_MAX_LENGTH) issues.push({ path: 'note', code: 'too_long' });
  if (draft.lines.length === 0) issues.push({ path: 'lines', code: 'required' });
  if (draft.lines.length > ORDER_LINES_MAX) issues.push({ path: 'lines', code: 'too_many' });

  const products = new Map(context.products.map((lookup) => [lookup.id, lookup]));
  const items: PreparedOrder['items'] = [];
  draft.lines.forEach((line, index) => {
    const path: LinePath = `lines.${index}`;
    if (!Number.isInteger(line.quantity) || line.quantity < QUANTITY_MIN || line.quantity > QUANTITY_MAX) {
      issues.push({ path: `${path}.quantity`, code: 'out_of_range' });
    }
    const product = products.get(line.productId)?.product;
    if (!product) {
      issues.push({ path: `${path}.productId`, code: 'unknown_product' });
      return;
    }
    const priced = priceOptions(product, line.optionIds ?? [], path);
    issues.push(...priced.issues);
    const itemNote = optionalText(line.note);
    if (itemNote !== null) {
      if (!product.allowCustomerNotes) issues.push({ path: `${path}.note`, code: 'not_allowed' });
      else if (itemNote.length > ITEM_NOTE_MAX_LENGTH) issues.push({ path: `${path}.note`, code: 'too_long' });
    }
    items.push({
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      quantity: line.quantity,
      unitPrice: product.price + priced.options.reduce((sum, option) => sum + option.priceDelta, 0),
      note: itemNote,
      options: priced.options,
    });
  });
  if (issues.length > 0 || !table) throw new InvalidOrderError(issues);

  if (!table.enabled) throw new TableDisabledError(table.number);
  for (const line of draft.lines) {
    const block = products.get(line.productId)?.block ?? null;
    if (block !== null) throw new ProductNotOrderableError(line.productId, block);
  }

  return {
    tableNumber: table.number,
    tableLabel: table.label,
    spaceName: table.spaceName,
    customerName,
    note,
    total: items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    items,
  };
}
