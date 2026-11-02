import type { PrismaClient } from '../src/generated/prisma/client.js';
import { categoryDraftIssues, type Category } from '../src/modules/catalog/domain/category.js';
import {
  productDraftIssues,
  skuPrefixFor,
  toProductDraft,
  type OptionSelection,
  type Product,
  type ProductOptionGroup,
  type ProductPublication,
} from '../src/modules/catalog/domain/product.js';

/**
 * Sample menu from the admin mock (`admin/src/mocks/service-day/catalog.ts`): its nine categories
 * in the 08C display order and its thirteen products with their skus, prices and option groups.
 * Moments and images are left out (the API does not model them). Ids are deterministic
 * (`prd_cappuccino`, `opg_cappuccino_tamano`, `opt_cappuccino_tamano_mediano`) so the seed
 * always describes the same rows.
 */
type CategorySeed = Pick<Category, 'id' | 'name' | 'description' | 'visible'>;

/** In display order: position is the index. */
const CATEGORY_SEEDS: CategorySeed[] = [
  { id: 'cafes', name: 'Cafés', description: 'Espresso y filtrados de la casa.', visible: true },
  { id: 'tostadas', name: 'Tostadas', description: 'Panes de masa madre con toppings.', visible: true },
  { id: 'panaderia', name: 'Panadería', description: 'Medialunas y facturas recién horneadas.', visible: true },
  { id: 'postres', name: 'Postres', description: 'Tortas y postres del día.', visible: true },
  { id: 'tostados', name: 'Tostados', description: 'Tostados en pan de miga o de campo.', visible: true },
  { id: 'sandwiches', name: 'Sándwiches', description: 'Sándwiches calientes y fríos.', visible: true },
  { id: 'hamburguesas', name: 'Hamburguesas', description: 'Hamburguesas de la casa con papas.', visible: true },
  { id: 'bebidas', name: 'Bebidas', description: 'Jugos exprimidos y bebidas frías.', visible: true },
  { id: 'licuados', name: 'Licuados', description: 'Licuados de fruta con agua o leche.', visible: true },
];

type OptionSeed = { slug: string; name: string; priceDelta: number };
type GroupSeed = { slug: string; title: string; selection: OptionSelection; required: boolean; max: number | null; defaultOption: string | null; options: OptionSeed[] };

/** 07B "Tamaño" of the Cappuccino. */
const COFFEE_SIZES: OptionSeed[] = [
  { slug: 'chico', name: 'Chico', priceDelta: 0 },
  { slug: 'mediano', name: 'Mediano', priceDelta: 800 },
  { slug: 'grande', name: 'Grande', priceDelta: 1500 },
];

/** 07B/07C "Extras" of the coffees. */
const SHOT_EXTRA: OptionSeed = { slug: 'shot-extra', name: 'Shot extra', priceDelta: 900 };
const PLANT_MILK: OptionSeed = { slug: 'leche-vegetal', name: 'Leche vegetal', priceDelta: 700 };
/** Free ("Sin cargo") extra of the Cappuccino. */
const CINNAMON: OptionSeed = { slug: 'canela', name: 'Canela', priceDelta: 0 };

/** "Tamaño": single choice, required, with a preselected size. */
const sizeGroup = (options: OptionSeed[], defaultOption: string): GroupSeed => ({
  slug: 'tamano',
  title: 'Tamaño',
  selection: 'single',
  required: true,
  max: 1,
  defaultOption,
  options,
});

/** "Extras": multiple choice, optional, "Máximo 2" as 07B. */
const extrasGroup = (options: OptionSeed[]): GroupSeed => ({
  slug: 'extras',
  title: 'Extras',
  selection: 'multiple',
  required: false,
  max: 2,
  defaultOption: null,
  options,
});

type ProductSeed = {
  slug: string;
  sku: string;
  /** The mock's `commercialRank`; the position is the rank order within the category. */
  rank: number;
  name: string;
  price: number;
  categoryId: string;
  description: string;
  publication?: ProductPublication;
  available?: boolean;
  optionGroups?: GroupSeed[];
};

const PRODUCT_SEEDS: ProductSeed[] = [
  {
    slug: 'cappuccino',
    sku: 'CAF-014',
    rank: 1,
    name: 'Cappuccino',
    price: 4600,
    categoryId: 'cafes',
    description: 'Espresso intenso con leche vaporizada y espuma cremosa.',
    optionGroups: [sizeGroup(COFFEE_SIZES, 'Mediano'), extrasGroup([SHOT_EXTRA, PLANT_MILK, CINNAMON])],
  },
  {
    slug: 'cappuccino-grande',
    sku: 'CAF-015',
    rank: 2,
    name: 'Cappuccino grande',
    price: 5200,
    categoryId: 'cafes',
    description: 'Doble espresso con leche vaporizada y espuma, en taza grande.',
    optionGroups: [extrasGroup([SHOT_EXTRA, PLANT_MILK])],
  },
  {
    slug: 'cafe-latte',
    sku: 'CAF-016',
    rank: 3,
    name: 'Café latte',
    price: 4200,
    categoryId: 'cafes',
    description: 'Espresso suave con mucha leche y una capa fina de espuma.',
    optionGroups: [extrasGroup([PLANT_MILK])],
  },
  {
    slug: 'cafe-con-leche',
    sku: 'CAF-017',
    rank: 4,
    name: 'Café con leche',
    price: 3800,
    categoryId: 'cafes',
    description: 'Espresso con leche caliente, servido en taza.',
  },
  {
    slug: 'jugo-naranja',
    sku: 'BEB-019',
    rank: 10,
    name: 'Jugo de naranja',
    price: 5100,
    categoryId: 'bebidas',
    description: 'Naranjas exprimidas en el momento.',
  },
  {
    slug: 'medialuna',
    sku: 'PAN-002',
    rank: 6,
    name: 'Medialuna',
    price: 3900,
    categoryId: 'panaderia',
    description: 'Medialunas de manteca recién horneadas.',
  },
  {
    slug: 'tostado-clasico',
    sku: 'TOS-011',
    rank: 7,
    name: 'Tostado clásico',
    price: 7200,
    categoryId: 'tostados',
    description: 'Pan de miga tostado con jamón cocido y queso.',
  },
  {
    slug: 'tostado-jamon-queso',
    sku: 'TOS-012',
    rank: 8,
    name: 'Tostado de jamón y queso',
    price: 6900,
    categoryId: 'tostados',
    description: 'Pan de campo con jamón cocido y queso fundido.',
  },
  {
    slug: 'toston-palta',
    sku: 'TOS-006',
    rank: 5,
    name: 'Tostón de palta',
    price: 7500,
    categoryId: 'tostadas',
    description: 'Pan de masa madre con palta, tomate y semillas.',
  },
  {
    slug: 'sandwich-pollo',
    sku: 'SAN-004',
    rank: 9,
    name: 'Sándwich de pollo',
    price: 8900,
    categoryId: 'sandwiches',
    description: 'Pollo grillado, lechuga, tomate y mayonesa de la casa.',
  },
  {
    slug: 'limonada',
    sku: 'BEB-018',
    rank: 11,
    name: 'Limonada',
    price: 3600,
    categoryId: 'bebidas',
    description: 'Limonada con menta y jengibre.',
  },
  {
    slug: 'hamburguesa-clasica',
    sku: 'HAM-003',
    rank: 12,
    name: 'Hamburguesa clásica',
    price: 12500,
    categoryId: 'hamburguesas',
    description: 'Medallón de carne, cheddar, lechuga y tomate, con papas fritas.',
    available: false,
  },
  {
    slug: 'cheesecake',
    sku: 'POS-009',
    rank: 13,
    name: 'Cheesecake',
    price: 6800,
    categoryId: 'postres',
    description: 'Cheesecake de frutos rojos sobre base de galletitas.',
    publication: 'draft',
  },
];

/** Fixed timestamp of the sample rows; the database stamps the real ones on insert. */
const SEEDED_AT = new Date('2026-11-01T12:00:00-03:00');

export function seedCategories(): Category[] {
  return CATEGORY_SEEDS.map((seed, position) => ({ ...seed, position, createdAt: SEEDED_AT, updatedAt: SEEDED_AT }));
}

function seedOptionGroup(productSlug: string, seed: GroupSeed): ProductOptionGroup {
  const groupId = `opg_${productSlug}_${seed.slug}`;
  const options = seed.options.map((option) => ({ id: `opt_${productSlug}_${seed.slug}_${option.slug}`, name: option.name, priceDelta: option.priceDelta }));
  return {
    id: groupId,
    title: seed.title,
    selection: seed.selection,
    required: seed.required,
    max: seed.max,
    defaultOptionId: seed.defaultOption === null ? null : (options.find((option) => option.name === seed.defaultOption)?.id ?? null),
    options,
  };
}

export function seedProducts(): Product[] {
  return PRODUCT_SEEDS.map((seed) => {
    const position = PRODUCT_SEEDS.filter((other) => other.categoryId === seed.categoryId && other.rank <= seed.rank).length;
    return {
      id: `prd_${seed.slug}`,
      sku: seed.sku,
      name: seed.name,
      description: seed.description,
      price: seed.price,
      categoryId: seed.categoryId,
      publication: seed.publication ?? 'published',
      available: seed.available ?? true,
      archived: false,
      allowCustomerNotes: true,
      position,
      version: 1,
      optionGroups: (seed.optionGroups ?? []).map((group) => seedOptionGroup(seed.slug, group)),
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT,
    };
  });
}

/** Problems of the sample menu against the domain rules; empty when it is valid. */
export function seedCatalogIssues(categories: Category[], products: Product[]): string[] {
  const issues: string[] = [];
  for (const category of categories) {
    const categoryIssues = categoryDraftIssues(category, categories, category.id);
    if (categoryIssues.length > 0) issues.push(`category ${category.id}: ${JSON.stringify(categoryIssues)}`);
  }
  const categoryIds = categories.map((category) => category.id);
  if (new Set(categoryIds).size !== categoryIds.length) issues.push('category ids are not unique');
  const ids = products.flatMap((product) => [
    product.id,
    ...product.optionGroups.flatMap((group) => [group.id, ...group.options.map((option) => option.id)]),
  ]);
  if (new Set(ids).size !== ids.length) issues.push('product, group or option ids are not unique');
  for (const product of products) {
    // The product itself is `current`, so its group and option ids count as saved ones.
    const others = products.filter((other) => other.id !== product.id);
    const productIssues = productDraftIssues(toProductDraft(product), { categoryIds, others, current: product });
    if (productIssues.length > 0) issues.push(`product ${product.id}: ${JSON.stringify(productIssues)}`);
    if (!product.sku.startsWith(`${skuPrefixFor(product.categoryId)}-`)) issues.push(`product ${product.id}: sku prefix`);
    for (const group of product.optionGroups) {
      const defaultKnown = group.defaultOptionId === null || group.options.some((option) => option.id === group.defaultOptionId);
      if (!defaultKnown) issues.push(`product ${product.id}: group ${group.id} default option`);
    }
  }
  return issues;
}

const toRow = <Row extends string>(value: string) => value.toUpperCase() as Row;

/**
 * Creates the sample categories and products only when the catalog is empty, so a re-seed never
 * brings back deleted categories or overwrites admin edits. Returns whether it seeded.
 */
export async function seedCatalog(prisma: PrismaClient): Promise<boolean> {
  const categories = seedCategories();
  const products = seedProducts();
  const issues = seedCatalogIssues(categories, products);
  if (issues.length > 0) throw new Error(`Seed catalog is invalid: ${issues.join('; ')}`);

  const existing = (await prisma.catalogCategory.count()) + (await prisma.catalogProduct.count());
  if (existing > 0) return false;

  await prisma.$transaction([
    prisma.catalogCategory.createMany({
      data: categories.map(({ id, name, description, visible, position }) => ({ id, name, description, visible, position })),
    }),
    ...products.map((product) =>
      prisma.catalogProduct.create({
        data: {
          id: product.id,
          sku: product.sku,
          name: product.name,
          description: product.description,
          price: product.price,
          categoryId: product.categoryId,
          publication: toRow(product.publication),
          available: product.available,
          archived: product.archived,
          allowCustomerNotes: product.allowCustomerNotes,
          position: product.position,
          version: product.version,
          optionGroups: {
            create: product.optionGroups.map((group, position) => ({
              id: group.id,
              title: group.title,
              selection: toRow(group.selection),
              required: group.required,
              max: group.max,
              defaultOptionId: group.defaultOptionId,
              position,
              options: {
                create: group.options.map((option, optionPosition) => ({ ...option, position: optionPosition })),
              },
            })),
          },
        },
      }),
    ),
  ]);
  return true;
}
