import { Injectable } from '@nestjs/common';
import type {
  OrderCancellationReason as ReasonRow,
  OrderSource as SourceRow,
  OrderStatus as StatusRow,
  Prisma,
} from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../shared/prisma/prisma.service.js';
import type { OrderFilter, OrdersRepository } from '../domain/orders-repository.js';
import type { CancellationReason, NewOrder, Order, OrderEvent, OrderSource, OrderStatus } from '../domain/order.js';

/** Prisma enum values are the uppercase form of the domain identifiers ("received" ↔ "RECEIVED"). */
const toRow = <Row extends string>(value: string) => value.toUpperCase() as Row;
const fromRow = <Value extends string>(row: string) => row.toLowerCase() as Value;

const ACTOR = { select: { id: true, name: true } } as const;

const WITH_DETAILS = {
  createdBy: ACTOR,
  items: { orderBy: { position: 'asc' }, include: { options: { orderBy: { position: 'asc' } } } },
  events: { orderBy: [{ at: 'asc' }, { id: 'asc' }], include: { actor: ACTOR } },
} as const satisfies Prisma.OrderInclude;

type OrderRow = Prisma.OrderGetPayload<{ include: typeof WITH_DETAILS }>;

function toOrder(row: OrderRow): Order {
  return {
    id: row.id,
    number: row.number,
    tableNumber: row.tableNumber,
    tableLabel: row.tableLabel,
    spaceName: row.spaceName,
    customerName: row.customerName,
    note: row.note,
    status: fromRow<OrderStatus>(row.status),
    cancellationReason: row.cancellationReason === null ? null : fromRow<CancellationReason>(row.cancellationReason),
    source: fromRow<OrderSource>(row.source),
    createdBy: row.createdBy,
    total: row.total,
    items: row.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      sku: item.sku,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      note: item.note,
      options: item.options.map(({ groupTitle, optionName, priceDelta }) => ({ groupTitle, optionName, priceDelta })),
    })),
    events: row.events.map((event) => ({ kind: fromRow<OrderStatus>(event.kind), at: event.at, actor: event.actor })),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const eventRow = (event: OrderEvent) => ({ kind: toRow<StatusRow>(event.kind), at: event.at, actorId: event.actor?.id ?? null });

@Injectable()
export class PrismaOrdersRepository implements OrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(order: NewOrder): Promise<Order> {
    const row = await this.prisma.order.create({
      data: {
        tableNumber: order.tableNumber,
        tableLabel: order.tableLabel,
        spaceName: order.spaceName,
        customerName: order.customerName,
        note: order.note,
        status: toRow<StatusRow>(order.status),
        cancellationReason: order.cancellationReason === null ? null : toRow<ReasonRow>(order.cancellationReason),
        source: toRow<SourceRow>(order.source),
        createdById: order.createdBy?.id ?? null,
        total: order.total,
        createdAt: order.createdAt,
        items: {
          create: order.items.map((item, position) => ({
            productId: item.productId,
            productName: item.productName,
            sku: item.sku,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            note: item.note,
            position,
            options: { create: item.options.map((option, optionPosition) => ({ ...option, position: optionPosition })) },
          })),
        },
        events: { create: order.events.map(eventRow) },
      },
      include: WITH_DETAILS,
    });
    return toOrder(row);
  }

  async findById(id: string): Promise<Order | null> {
    const row = await this.prisma.order.findUnique({ where: { id }, include: WITH_DETAILS });
    return row ? toOrder(row) : null;
  }

  async list({ from, to, status }: OrderFilter): Promise<Order[]> {
    const rows = await this.prisma.order.findMany({
      where: { createdAt: { gte: from, lt: to }, ...(status === undefined ? {} : { status: toRow<StatusRow>(status) }) },
      orderBy: [{ createdAt: 'asc' }, { number: 'asc' }],
      include: WITH_DETAILS,
    });
    return rows.map(toOrder);
  }

  async saveTransition(order: Order, from: OrderStatus, event: OrderEvent): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      // Conditional on the status read by the use case, so concurrent transitions cannot both win.
      const { count } = await tx.order.updateMany({
        where: { id: order.id, status: toRow<StatusRow>(from) },
        data: {
          status: toRow<StatusRow>(order.status),
          cancellationReason: order.cancellationReason === null ? null : toRow<ReasonRow>(order.cancellationReason),
          updatedAt: event.at,
        },
      });
      if (count === 0) return false;
      await tx.orderEvent.create({ data: { orderId: order.id, ...eventRow(event) } });
      return true;
    });
  }
}
