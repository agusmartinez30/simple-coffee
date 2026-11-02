import { describe, expect, it } from 'vitest';
import { advanceOrder, cancelOrder, nextStatus, type Order } from './order.js';
import { InvalidTransitionError } from './orders-errors.js';

const createdAt = new Date('2026-11-01T15:00:00Z');
const later = new Date('2026-11-01T15:05:00Z');
const staff = { id: 'staff-1', name: 'Sofía M.' };

function order(overrides: Partial<Order> = {}): Order {
  return {
    id: 'ord_1',
    number: 1001,
    tableNumber: 7,
    tableLabel: 'Mesa 07',
    spaceName: 'Salón',
    customerName: 'Mesa 07',
    note: null,
    status: 'received',
    cancellationReason: null,
    source: 'staff',
    createdBy: staff,
    total: 4200,
    items: [],
    events: [{ kind: 'received', at: createdAt, actor: staff }],
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
}

describe('order lifecycle', () => {
  it('moves forward one step at a time', () => {
    expect(nextStatus('received')).toBe('preparing');
    expect(nextStatus('preparing')).toBe('delivered');
    expect(nextStatus('delivered')).toBeNull();
    expect(nextStatus('cancelled')).toBeNull();
  });

  it('advances appending an event with the actor and time', () => {
    const preparing = advanceOrder(order(), staff, later);
    expect(preparing).toMatchObject({ status: 'preparing', updatedAt: later });
    expect(preparing.events).toEqual([
      { kind: 'received', at: createdAt, actor: staff },
      { kind: 'preparing', at: later, actor: staff },
    ]);
    expect(advanceOrder(preparing, staff, later).status).toBe('delivered');
  });

  it('refuses to advance a finished order', () => {
    expect(() => advanceOrder(order({ status: 'delivered' }), staff, later)).toThrow(new InvalidTransitionError('delivered', 'advance'));
    expect(() => advanceOrder(order({ status: 'cancelled' }), staff, later)).toThrow(InvalidTransitionError);
  });

  it('cancels received or preparing orders with a reason', () => {
    const cancelled = cancelOrder(order({ status: 'preparing' }), 'product_unavailable', staff, later);
    expect(cancelled).toMatchObject({ status: 'cancelled', cancellationReason: 'product_unavailable' });
    expect(cancelled.events.at(-1)).toEqual({ kind: 'cancelled', at: later, actor: staff });
    expect(cancelOrder(order(), 'customer_request', staff, later).status).toBe('cancelled');
    expect(() => cancelOrder(order({ status: 'delivered' }), 'order_error', staff, later)).toThrow(
      new InvalidTransitionError('delivered', 'cancel'),
    );
    expect(() => cancelOrder(cancelled, 'order_error', staff, later)).toThrow(InvalidTransitionError);
  });
});
