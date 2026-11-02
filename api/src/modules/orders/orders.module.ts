import { Module, type Provider } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ResolveOrderableProducts } from '../catalog/application/resolve-orderable-products.js';
import { CatalogModule } from '../catalog/catalog.module.js';
import { FindTableByNumber } from '../tables/application/find-table-by-number.js';
import { TablesModule } from '../tables/tables.module.js';
import type { Clock, OrdersDeps } from './application/orders-deps.js';
import { AdvanceOrder, CancelOrder, CreateOrder, GetOrder, ListOrders } from './application/orders.use-cases.js';
import type { OrdersRepository } from './domain/orders-repository.js';
import { SERVICE_TIME_ZONE } from './domain/service-day.js';
import { OrdersController } from './http/orders.controller.js';
import { PrismaOrdersRepository } from './infrastructure/prisma-orders.repository.js';
import { ORDERS_CLOCK, ORDERS_DEPS, ORDERS_REPOSITORY } from './orders.tokens.js';

const useCaseProviders: Provider[] = [CreateOrder, ListOrders, GetOrder, AdvanceOrder, CancelOrder].map(
  (UseCase: new (deps: OrdersDeps) => unknown) => ({
    provide: UseCase,
    useFactory: (deps: OrdersDeps) => new UseCase(deps),
    inject: [ORDERS_DEPS],
  }),
);

@Module({
  // `SessionGuard` guards the routes; catalog and tables provide pricing and table lookup.
  imports: [AuthModule, CatalogModule, TablesModule],
  controllers: [OrdersController],
  providers: [
    { provide: ORDERS_REPOSITORY, useClass: PrismaOrdersRepository },
    { provide: ORDERS_CLOCK, useValue: { now: () => new Date() } satisfies Clock },
    {
      provide: ORDERS_DEPS,
      inject: [ORDERS_REPOSITORY, ORDERS_CLOCK, ResolveOrderableProducts, FindTableByNumber],
      useFactory: (orders: OrdersRepository, clock: Clock, products: ResolveOrderableProducts, tables: FindTableByNumber): OrdersDeps => ({
        orders,
        products: { resolve: (ids) => products.execute(ids) },
        tables: { findByNumber: (number) => tables.execute(number) },
        clock,
        timeZone: SERVICE_TIME_ZONE,
      }),
    },
    ...useCaseProviders,
  ],
})
export class OrdersModule {}
