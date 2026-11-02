import { Body, Controller, Get, HttpCode, Param, Post, Query, UseFilters, UseGuards } from '@nestjs/common';
import { ZodValidationPipe } from '../../../shared/http/zod-validation.pipe.js';
import type { StaffProfile } from '../../auth/domain/staff-user.js';
import { CurrentStaff, SessionGuard } from '../../auth/http/session.guard.js';
import { AdvanceOrder, CancelOrder, CreateOrder, GetOrder, ListOrders } from '../application/orders.use-cases.js';
import type { Order, OrderItem } from '../domain/order.js';
import { OrdersErrorFilter } from './orders-error.filter.js';
import {
  cancelOrderSchema,
  newOrderSchema,
  orderListQuerySchema,
  type CancelOrderBody,
  type NewOrderBody,
  type OrderListQuery,
} from './orders.schemas.js';

export type OrderResponse = Omit<Order, 'items'> & { items: (OrderItem & { subtotal: number })[] };

/** The order with each item's subtotal (unit price × quantity) next to the order total. */
function toResponse(order: Order): OrderResponse {
  return { ...order, items: order.items.map((item) => ({ ...item, subtotal: item.unitPrice * item.quantity })) };
}

/** Admin orders board. Every route answers the order(s) with items, options and status history. */
@Controller('orders')
@UseGuards(SessionGuard)
@UseFilters(OrdersErrorFilter)
export class OrdersController {
  constructor(
    private readonly createOrder: CreateOrder,
    private readonly listOrders: ListOrders,
    private readonly getOrder: GetOrder,
    private readonly advanceOrder: AdvanceOrder,
    private readonly cancelOrder: CancelOrder,
  ) {}

  @Post()
  async add(@Body(new ZodValidationPipe(newOrderSchema)) body: NewOrderBody, @CurrentStaff() staff: StaffProfile): Promise<OrderResponse> {
    return toResponse(await this.createOrder.execute(body, staff));
  }

  @Get()
  async list(@Query(new ZodValidationPipe(orderListQuerySchema)) query: OrderListQuery): Promise<OrderResponse[]> {
    return (await this.listOrders.execute(query)).map(toResponse);
  }

  @Get(':orderId')
  async get(@Param('orderId') id: string): Promise<OrderResponse> {
    return toResponse(await this.getOrder.execute(id));
  }

  @Post(':orderId/advance')
  @HttpCode(200)
  async advance(@Param('orderId') id: string, @CurrentStaff() staff: StaffProfile): Promise<OrderResponse> {
    return toResponse(await this.advanceOrder.execute(id, staff));
  }

  @Post(':orderId/cancel')
  @HttpCode(200)
  async cancel(
    @Param('orderId') id: string,
    @Body(new ZodValidationPipe(cancelOrderSchema)) body: CancelOrderBody,
    @CurrentStaff() staff: StaffProfile,
  ): Promise<OrderResponse> {
    return toResponse(await this.cancelOrder.execute(id, body.reason, staff));
  }
}
