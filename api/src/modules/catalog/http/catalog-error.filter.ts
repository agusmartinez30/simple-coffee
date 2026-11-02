import { Catch, HttpStatus, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import {
  CatalogError,
  CategoryHasProductsError,
  CategoryNotFoundError,
  InvalidCategoryError,
  InvalidProductError,
  ProductNotFoundError,
} from '../domain/catalog-errors.js';

function statusOf(error: CatalogError): HttpStatus {
  if (error instanceof CategoryNotFoundError || error instanceof ProductNotFoundError) return HttpStatus.NOT_FOUND;
  if (error instanceof InvalidCategoryError || error instanceof InvalidProductError) return HttpStatus.BAD_REQUEST;
  // The request is valid but the current catalog forbids it (products left, archived product…).
  return HttpStatus.CONFLICT;
}

/**
 * Maps catalog domain errors to HTTP: `{ statusCode, error: <code>, message, ... }`. `400` carries
 * `issues: [{ path, code }]`; a category with products carries `productCount`.
 */
@Catch(CatalogError)
export class CatalogErrorFilter implements ExceptionFilter<CatalogError> {
  catch(error: CatalogError, host: ArgumentsHost): void {
    const status = statusOf(error);
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(status)
      .json({
        statusCode: status,
        error: error.code,
        message: error.message,
        ...(error instanceof InvalidCategoryError || error instanceof InvalidProductError ? { issues: error.issues } : {}),
        ...(error instanceof CategoryHasProductsError ? { productCount: error.productCount } : {}),
      });
  }
}
