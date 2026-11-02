import type { OrderTable, ProductLookup } from './order-pricing.js';
import type { NewOrder, Order, OrderEvent, OrderStatus } from './order.js';

export interface OrderFilter {
  /** `[from, to)` range of `createdAt`. */
  from: Date;
  to: Date;
  status?: OrderStatus;
}

export interface OrdersRepository {
  /** Stores the order with its items and events, assigning the id, the visible number and item ids. */
  create(order: NewOrder): Promise<Order>;
  findById(id: string): Promise<Order | null>;
  /** Orders created in the range, oldest first. */
  list(filter: OrderFilter): Promise<Order[]>;
  /**
   * Stores the order's new status (and cancellation reason) and appends `event`, only while the
   * stored status is still `from`; false when another request moved the order first.
   */
  saveTransition(order: Order, from: OrderStatus, event: OrderEvent): Promise<boolean>;
}

/** Products as the catalog resolves them for ordering (catalog's exported service). */
export interface ProductCatalog {
  resolve(ids: readonly string[]): Promise<ProductLookup[]>;
}

/** Tables as the tables module describes them (its exported service). */
export interface TableDirectory {
  findByNumber(number: number): Promise<OrderTable | null>;
}
