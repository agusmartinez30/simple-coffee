import { Catch, HttpStatus, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import {
  InvalidOrderError,
  InvalidTransitionError,
  OrderNotFoundError,
  OrdersError,
  ProductNotOrderableError,
  TableDisabledError,
} from '../domain/orders-errors.js';

function statusOf(error: OrdersError): HttpStatus {
  if (error instanceof OrderNotFoundError) return HttpStatus.NOT_FOUND;
  if (error instanceof InvalidOrderError) return HttpStatus.BAD_REQUEST;
  // The request is valid but the current state forbids it (disabled table, product not orderable, finished order…).
  return HttpStatus.CONFLICT;
}

/**
 * Maps orders domain errors to HTTP: `{ statusCode, error: <code>, message, ... }`. `400` carries
 * `issues: [{ path, code, groupId? }]`; `409` carries `productId` + `reason` (product not orderable),
 * `tableNumber` (disabled table) or `status` + `action` (invalid transition).
 */
@Catch(OrdersError)
export class OrdersErrorFilter implements ExceptionFilter<OrdersError> {
  catch(error: OrdersError, host: ArgumentsHost): void {
    const status = statusOf(error);
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(status)
      .json({
        statusCode: status,
        error: error.code,
        message: error.message,
        ...(error instanceof InvalidOrderError ? { issues: error.issues } : {}),
        ...(error instanceof ProductNotOrderableError ? { productId: error.productId, reason: error.reason } : {}),
        ...(error instanceof TableDisabledError ? { tableNumber: error.tableNumber } : {}),
        ...(error instanceof InvalidTransitionError ? { status: error.status, action: error.action } : {}),
      });
  }
}
