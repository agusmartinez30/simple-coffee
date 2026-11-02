import { OrderNotFoundError } from '../domain/orders-errors.js';
import type { OrdersRepository, ProductCatalog, TableDirectory } from '../domain/orders-repository.js';
import type { Order } from '../domain/order.js';

export interface Clock {
  now(): Date;
}

/** Everything the orders use cases need, wired by `OrdersModule` or by test fakes. */
export interface OrdersDeps {
  orders: OrdersRepository;
  products: ProductCatalog;
  tables: TableDirectory;
  clock: Clock;
  /** IANA time zone that defines the service day. */
  timeZone: string;
}

export async function loadOrder(deps: OrdersDeps, id: string): Promise<Order> {
  const order = await deps.orders.findById(id);
  if (!order) throw new OrderNotFoundError();
  return order;
}
