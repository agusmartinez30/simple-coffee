import { z } from 'zod';
import { OPTION_SELECTIONS, PRODUCT_PUBLICATIONS } from '../domain/product.js';

/** Request shapes only. Business rules (lengths, unique names, prices, group rules…) live in the domain. */

const categoryFields = {
  name: z.string().max(200),
  description: z.string().max(1000),
  visible: z.boolean(),
};

export const newCategorySchema = z.object({
  name: categoryFields.name,
  description: categoryFields.description.optional(),
  visible: categoryFields.visible.optional(),
});

export const categoryPatchSchema = z.object(categoryFields).partial();

export const categoryOrderSchema = z.object({ ids: z.array(z.string().max(100)).max(200) });

const id = z.string().min(1).max(64);

const optionSchema = z.object({
  id: id.optional(),
  name: z.string().max(200),
  priceDelta: z.number(),
});

const optionGroupSchema = z.object({
  id: id.optional(),
  title: z.string().max(200),
  selection: z.enum(OPTION_SELECTIONS),
  required: z.boolean(),
  max: z.number().nullable().optional(),
  /** Name of the preselected option of a single group. */
  defaultOption: z.string().max(200).nullable().optional(),
  options: z.array(optionSchema).max(50),
});

const productFields = {
  sku: z.string().max(40),
  name: z.string().max(200),
  plural: z.string().max(200).nullable(),
  description: z.string().max(1000),
  price: z.number(),
  categoryId: z.string().max(100),
  image: z.string().max(2000).nullable(),
  /** Moment ids; unknown ones are reported by the domain. */
  moments: z.array(z.string().max(40)).max(20),
  publication: z.enum(PRODUCT_PUBLICATIONS),
  available: z.boolean(),
  allowCustomerNotes: z.boolean(),
  optionGroups: z.array(optionGroupSchema).max(20),
};

export const newProductSchema = z.object(productFields).partial().required({ name: true, price: true, categoryId: true });

/** `optionGroups`, when given, replaces every group of the product. */
export const productPatchSchema = z.object(productFields).partial();

export const productListQuerySchema = z.object({
  categoryId: z.string().max(100).optional(),
  includeArchived: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
});

export type NewCategoryBody = z.output<typeof newCategorySchema>;
export type CategoryPatchBody = z.output<typeof categoryPatchSchema>;
export type CategoryOrderBody = z.output<typeof categoryOrderSchema>;
export type NewProductBody = z.output<typeof newProductSchema>;
export type ProductPatchBody = z.output<typeof productPatchSchema>;
export type ProductListQuery = z.output<typeof productListQuerySchema>;
