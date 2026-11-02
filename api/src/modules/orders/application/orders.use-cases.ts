import { prepareOrder, type OrderDraft } from '../domain/order-pricing.js';
import { InvalidTransitionError } from '../domain/orders-errors.js';
import { advanceOrder, cancelOrder, type CancellationReason, type Order, type OrderActor, type OrderStatus } from '../domain/order.js';
import { serviceDateOf, serviceDayRange } from '../domain/service-day.js';
import { loadOrder, type OrdersDeps } from './orders-deps.js';

/** Staff loads an order for a table (admin 02C "Cargar pedido"): priced from the catalog, received now. */
export class CreateOrder {
  constructor(private readonly deps: OrdersDeps) {}

  async execute(draft: OrderDraft, staff: OrderActor): Promise<Order> {
    const [table, products] = await Promise.all([
      this.deps.tables.findByNumber(draft.tableNumber),
      this.deps.products.resolve(draft.lines.map((line) => line.productId)),
    ]);
    const prepared = prepareOrder(draft, { table, products });
    const now = this.deps.clock.now();
    const actor = { id: staff.id, name: staff.name };
    return this.deps.orders.create({
      ...prepared,
      status: 'received',
      cancellationReason: null,
      source: 'staff',
      createdBy: actor,
      events: [{ kind: 'received', at: now, actor }],
      createdAt: now,
    });
  }
}

export interface OrderListQuery {
  /** "YYYY-MM-DD" service day; today in the venue time zone when omitted. */
  date?: string;
  status?: OrderStatus;
}

/** The orders board: orders created during one service day, oldest first. */
export class ListOrders {
  constructor(private readonly deps: OrdersDeps) {}

  execute({ date, status }: OrderListQuery): Promise<Order[]> {
    const day = date ?? serviceDateOf(this.deps.clock.now(), this.deps.timeZone);
    return this.deps.orders.list({ ...serviceDayRange(day, this.deps.timeZone), ...(status === undefined ? {} : { status }) });
  }
}

export class GetOrder {
  constructor(private readonly deps: OrdersDeps) {}

  execute(id: string): Promise<Order> {
    return loadOrder(this.deps, id);
  }
}

/** Stores a transition only if no other request moved the order first. */
async function saveTransition(deps: OrdersDeps, before: Order, after: Order, action: 'advance' | 'cancel'): Promise<Order> {
  const event = after.events.at(-1);
  if (!event || !(await deps.orders.saveTransition(after, before.status, event))) {
    throw new InvalidTransitionError((await loadOrder(deps, before.id)).status, action);
  }
  return loadOrder(deps, before.id);
}

/** Moves the order one step forward on the board: received → preparing → delivered. */
export class AdvanceOrder {
  constructor(private readonly deps: OrdersDeps) {}

  async execute(id: string, staff: OrderActor): Promise<Order> {
    const order = await loadOrder(this.deps, id);
    const advanced = advanceOrder(order, { id: staff.id, name: staff.name }, this.deps.clock.now());
    return saveTransition(this.deps, order, advanced, 'advance');
  }
}

/** Cancels an order not yet delivered, with the reason chosen in the admin dialog. */
export class CancelOrder {
  constructor(private readonly deps: OrdersDeps) {}

  async execute(id: string, reason: CancellationReason, staff: OrderActor): Promise<Order> {
    const order = await loadOrder(this.deps, id);
    const cancelled = cancelOrder(order, reason, { id: staff.id, name: staff.name }, this.deps.clock.now());
    return saveTransition(this.deps, order, cancelled, 'cancel');
  }
}
