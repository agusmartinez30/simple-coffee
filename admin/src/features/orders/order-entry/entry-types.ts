/**
 * What "Nuevo pedido" needs from the catalog and the table configuration (`/catalog/*`,
 * `/tables/config`). Built by `entry-api.ts`; prices are integer ARS.
 */

export type EntryOption = {
  id: string;
  name: string;
  /** Added to the product price when chosen; 0 for free options. */
  priceDelta: number;
};

export type EntryOptionGroup = {
  id: string;
  title: string;
  selection: "single" | "multiple";
  required: boolean;
  /** Most options allowed: 1 for single groups, null when a multiple group has no limit. */
  max: number | null;
  /** Option a required single group falls back to; null when none. */
  defaultOptionId: string | null;
  options: EntryOption[];
};

/** An orderable product (published, available, not archived). */
export type EntryProduct = {
  id: string;
  name: string;
  price: number;
  categoryId: string;
  /** Whether the line accepts a note ("Nota para cocina"). */
  allowCustomerNotes: boolean;
  optionGroups: EntryOptionGroup[];
};

/** A visible category, used for the quick filter chips. */
export type EntryCategory = { id: string; name: string };

/** An enabled table. */
export type EntryTable = {
  number: number;
  label: string;
  capacity: number;
  spaceName: string;
};

export type EntryCatalog = {
  products: EntryProduct[];
  categories: EntryCategory[];
  tables: EntryTable[];
};
