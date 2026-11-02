import { orderBlock, type OrderBlock, type Product } from '../domain/product.js';
import type { CatalogDeps } from './catalog-deps.js';

/** A requested product with its groups and options, and whether it can be ordered now. */
export type ProductResolution =
  | { id: string; product: Product; orderable: true; block: null }
  | { id: string; product: Product; orderable: false; block: OrderBlock }
  | { id: string; product: null; orderable: false; block: 'not_found' };

/**
 * Application service exported for the orders module: looks the products up for pricing and tells
 * whether each one is orderable (published, available, not archived). One entry per distinct id,
 * in the requested order.
 */
export class ResolveOrderableProducts {
  constructor(private readonly deps: CatalogDeps) {}

  async execute(ids: readonly string[]): Promise<ProductResolution[]> {
    const distinct = [...new Set(ids)];
    const products = new Map((await this.deps.catalog.findProducts(distinct)).map((product) => [product.id, product]));
    return distinct.map((id): ProductResolution => {
      const product = products.get(id);
      if (!product) return { id, product: null, orderable: false, block: 'not_found' };
      const block = orderBlock(product);
      return block === null ? { id, product, orderable: true, block } : { id, product, orderable: false, block };
    });
  }
}
