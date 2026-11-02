import { beforeEach, describe, expect, it } from 'vitest';
import { createOrdersDeps, ORDERS_NOW } from '../../../../test/support/in-memory-orders.js';
import {
  InvalidOrderError,
  InvalidTransitionError,
  OrderNotFoundError,
  ProductNotOrderableError,
  TableDisabledError,
} from '../domain/orders-errors.js';
import { AdvanceOrder, CancelOrder, CreateOrder, GetOrder, ListOrders } from './orders.use-cases.js';

const STAFF = { id: 'staff-1', name: 'Sofía M.' };
const latte = { productId: 'prod_latte', quantity: 1 };

describe('orders use cases', () => {
  let deps: ReturnType<typeof createOrdersDeps>;

  beforeEach(() => {
    deps = createOrdersDeps();
  });

  const create = (draft: Partial<Parameters<CreateOrder['execute']>[0]> = {}) =>
    new CreateOrder(deps).execute({ tableNumber: 2, lines: [latte], ...draft }, STAFF);

  it('creates a staff order priced from the catalog with a received event', async () => {
    const order = await create({
      lines: [
        { productId: 'prod_latte', quantity: 2, optionIds: ['opt_oat'] },
        { productId: 'prod_toast', quantity: 1, optionIds: ['opt_white', 'opt_egg'] },
      ],
    });
    expect(order).toMatchObject({
      id: 'ord_1',
      number: 1001,
      tableNumber: 2,
      tableLabel: 'Mesa 02',
      spaceName: 'Salón',
      customerName: 'Mesa 02',
      status: 'received',
      cancellationReason: null,
      source: 'staff',
      createdBy: STAFF,
      total: 2 * 5100 + 5800,
      events: [{ kind: 'received', at: ORDERS_NOW, actor: STAFF }],
      createdAt: ORDERS_NOW,
    });
    expect(order.items.map(({ productName, unitPrice, quantity }) => ({ productName, unitPrice, quantity }))).toEqual([
      { productName: 'Latte', unitPrice: 5100, quantity: 2 },
      { productName: 'Tostado', unitPrice: 5800, quantity: 1 },
    ]);
    expect((await create()).number).toBe(1002);
  });

  it('refuses unknown or disabled tables and products that cannot be ordered', async () => {
    await expect(create({ tableNumber: 9 })).rejects.toBeInstanceOf(InvalidOrderError);
    const table = deps.venueTables.tables.find((candidate) => candidate.number === 2);
    if (table) table.enabled = false;
    await expect(create()).rejects.toBeInstanceOf(TableDisabledError);
    await expect(create({ tableNumber: 1, lines: [{ productId: 'prod_lemonade', quantity: 1 }] })).rejects.toEqual(
      new ProductNotOrderableError('prod_lemonade', 'unavailable'),
    );
    await expect(create({ tableNumber: 1, lines: [{ productId: 'prod_mocha', quantity: 1 }] })).rejects.toMatchObject({
      reason: 'archived',
    });
    await expect(create({ tableNumber: 1, lines: [{ productId: 'nope', quantity: 1 }] })).rejects.toMatchObject({
      issues: [{ path: 'lines.0.productId', code: 'unknown_product' }],
    });
    expect(deps.orders.orders).toEqual([]);
  });

  it('lists the orders of a service day in the venue time zone, oldest first', async () => {
    deps.clock.current = new Date('2026-11-01T02:59:00Z'); // 23:59 on Oct 31 in Buenos Aires
    const lastNight = await create();
    deps.clock.current = new Date('2026-11-01T03:00:00Z'); // 00:00 on Nov 1
    const midnight = await create();
    deps.clock.current = new Date(ORDERS_NOW);
    const noon = await create();
    await new AdvanceOrder(deps).execute(noon.id, STAFF);

    const list = new ListOrders(deps);
    expect((await list.execute({})).map((order) => order.id)).toEqual([midnight.id, noon.id]);
    expect((await list.execute({ date: '2026-10-31' })).map((order) => order.id)).toEqual([lastNight.id]);
    expect((await list.execute({ date: '2026-11-01', status: 'preparing' })).map((order) => order.id)).toEqual([noon.id]);
    expect(await list.execute({ date: '2026-11-02' })).toEqual([]);
  });

  it('gets an order by id', async () => {
    const order = await create();
    await expect(new GetOrder(deps).execute(order.id)).resolves.toEqual(order);
    await expect(new GetOrder(deps).execute('nope')).rejects.toBeInstanceOf(OrderNotFoundError);
  });

  it('advances through preparing to delivered, recording who and when', async () => {
    const order = await create();
    const advance = new AdvanceOrder(deps);
    deps.clock.advance(60_000);
    const preparing = await advance.execute(order.id, STAFF);
    expect(preparing).toMatchObject({ status: 'preparing', updatedAt: deps.clock.now() });
    expect(preparing.events.at(-1)).toEqual({ kind: 'preparing', at: deps.clock.now(), actor: STAFF });
    const delivered = await advance.execute(order.id, STAFF);
    expect(delivered.events.map((event) => event.kind)).toEqual(['received', 'preparing', 'delivered']);
    await expect(advance.execute(order.id, STAFF)).rejects.toBeInstanceOf(InvalidTransitionError);
    await expect(advance.execute('nope', STAFF)).rejects.toBeInstanceOf(OrderNotFoundError);
  });

  it('cancels with a reason until the order is delivered', async () => {
    const order = await create();
    const cancelled = await new CancelOrder(deps).execute(order.id, 'customer_request', STAFF);
    expect(cancelled).toMatchObject({ status: 'cancelled', cancellationReason: 'customer_request' });
    await expect(new AdvanceOrder(deps).execute(order.id, STAFF)).rejects.toBeInstanceOf(InvalidTransitionError);

    const other = await create();
    await new AdvanceOrder(deps).execute(other.id, STAFF);
    await new AdvanceOrder(deps).execute(other.id, STAFF);
    await expect(new CancelOrder(deps).execute(other.id, 'order_error', STAFF)).rejects.toEqual(
      new InvalidTransitionError('delivered', 'cancel'),
    );
  });

  it('refuses a transition when the order moved meanwhile', async () => {
    const order = await create();
    const stale = await new GetOrder(deps).execute(order.id);
    await new CancelOrder(deps).execute(order.id, 'order_error', STAFF);
    deps.orders.findById = () => Promise.resolve(stale);
    await expect(new AdvanceOrder(deps).execute(order.id, STAFF)).rejects.toBeInstanceOf(InvalidTransitionError);
  });
});
