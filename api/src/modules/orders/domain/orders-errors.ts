import type { OrderIssue } from './order-pricing.js';
import type { OrderStatus } from './order.js';

export abstract class OrdersError extends Error {
  abstract readonly code: string;
}

export class OrderNotFoundError extends OrdersError {
  readonly code = 'order_not_found';
  constructor() {
    super('Order not found');
  }
}

export class InvalidOrderError extends OrdersError {
  readonly code = 'invalid_order';
  constructor(readonly issues: OrderIssue[]) {
    super('Order does not meet the rules');
  }
}

/** The table exists but is disabled, so it takes no orders. */
export class TableDisabledError extends OrdersError {
  readonly code = 'table_disabled';
  constructor(readonly tableNumber: number) {
    super('The table is disabled');
  }
}

/** A product of the order is archived, a draft or unavailable. */
export class ProductNotOrderableError extends OrdersError {
  readonly code = 'product_not_orderable';
  constructor(
    readonly productId: string,
    readonly reason: string,
  ) {
    super('A product of the order cannot be ordered now');
  }
}

/** The order's current status does not allow the requested step. */
export class InvalidTransitionError extends OrdersError {
  readonly code = 'invalid_transition';
  constructor(
    readonly status: OrderStatus,
    readonly action: 'advance' | 'cancel',
  ) {
    super(`A ${status} order cannot ${action}`);
  }
}
