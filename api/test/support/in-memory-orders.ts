import { ResolveOrderableProducts } from '../../src/modules/catalog/application/resolve-orderable-products.js';
import type { Product } from '../../src/modules/catalog/domain/product.js';
import type { OrdersDeps } from '../../src/modules/orders/application/orders-deps.js';
import type { OrderFilter, OrdersRepository } from '../../src/modules/orders/domain/orders-repository.js';
import type { NewOrder, Order, OrderEvent, OrderStatus } from '../../src/modules/orders/domain/order.js';
import { FindTableByNumber } from '../../src/modules/tables/application/find-table-by-number.js';
import { FakeClock } from './in-memory-auth.js';
import { catalogFixture, createCatalogDeps, type CatalogFixture } from './in-memory-catalog.js';
import { createTablesDeps } from './in-memory-tables.js';

/** In-memory adapters for the orders ports, shared by unit specs and the HTTP e2e test. */

/** Numbers start where the migration starts the sequence. */
export const FIRST_ORDER_NUMBER = 1001;

export class InMemoryOrders implements OrdersRepository {
  orders: Order[] = [];
  private counter = 0;

  reset(): void {
    this.orders = [];
    this.counter = 0;
  }

  create(order: NewOrder): Promise<Order> {
    this.counter += 1;
    const id = `ord_${this.counter}`;
    const stored: Order = {
      ...structuredClone(order),
      id,
      number: FIRST_ORDER_NUMBER + this.counter - 1,
      items: order.items.map((item, index) => ({ ...structuredClone(item), id: `${id}_item_${index + 1}` })),
      updatedAt: order.createdAt,
    };
    this.orders.push(stored);
    return Promise.resolve(structuredClone(stored));
  }

  findById(id: string): Promise<Order | null> {
    const order = this.orders.find((candidate) => candidate.id === id);
    return Promise.resolve(order ? structuredClone(order) : null);
  }

  list({ from, to, status }: OrderFilter): Promise<Order[]> {
    const orders = this.orders
      .filter((order) => order.createdAt >= from && order.createdAt < to && (status === undefined || order.status === status))
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.number - b.number);
    return Promise.resolve(structuredClone(orders));
  }

  saveTransition(order: Order, from: OrderStatus, event: OrderEvent): Promise<boolean> {
    const index = this.orders.findIndex((candidate) => candidate.id === order.id);
    const current = this.orders[index];
    if (!current || current.status !== from) return Promise.resolve(false);
    this.orders[index] = {
      ...current,
      status: order.status,
      cancellationReason: order.cancellationReason,
      updatedAt: event.at,
      events: [...current.events, structuredClone(event)],
    };
    return Promise.resolve(true);
  }
}

/**
 * The catalog fixture plus a Tostado: "Pan" (single, required, no default) and "Extras" (multiple,
 * up to 2), without customer notes.
 */
export function ordersCatalogFixture(): CatalogFixture {
  const fixture = catalogFixture();
  const latte = fixture.products.find((product) => product.id === 'prod_latte') as Product;
  const toast: Product = {
    ...structuredClone(latte),
    id: 'prod_toast',
    sku: 'CAF-003',
    name: 'Tostado',
    price: 5000,
    allowCustomerNotes: false,
    position: 3,
    optionGroups: [
      {
        id: 'grp_bread',
        title: 'Pan',
        selection: 'single',
        required: true,
        max: 1,
        defaultOptionId: null,
        options: [
          { id: 'opt_white', name: 'Blanco', priceDelta: 0 },
          { id: 'opt_seeds', name: 'Semillas', priceDelta: 300 },
        ],
      },
      {
        id: 'grp_extras',
        title: 'Extras',
        selection: 'multiple',
        required: false,
        max: 2,
        defaultOptionId: null,
        options: [
          { id: 'opt_avocado', name: 'Palta', priceDelta: 1200 },
          { id: 'opt_egg', name: 'Huevo', priceDelta: 800 },
          { id: 'opt_cheese', name: 'Queso', priceDelta: 600 },
        ],
      },
    ],
  };
  return { ...fixture, products: [...fixture.products, toast] };
}

/** 12:00 in Buenos Aires on 2026-11-01. */
export const ORDERS_NOW = new Date('2026-11-01T15:00:00Z');

/** Orders wired to the real catalog and tables services over their in-memory adapters. */
export function createOrdersDeps() {
  const catalog = createCatalogDeps(ordersCatalogFixture());
  const tables = createTablesDeps();
  const resolveProducts = new ResolveOrderableProducts(catalog);
  const findTable = new FindTableByNumber(tables);
  const deps = {
    orders: new InMemoryOrders(),
    products: { resolve: (ids: readonly string[]) => resolveProducts.execute(ids) },
    tables: { findByNumber: (number: number) => findTable.execute(number) },
    clock: new FakeClock(new Date(ORDERS_NOW)),
    timeZone: 'America/Argentina/Buenos_Aires',
  } satisfies OrdersDeps;
  return { ...deps, catalog: catalog.catalog, venueTables: tables.tables };
}
