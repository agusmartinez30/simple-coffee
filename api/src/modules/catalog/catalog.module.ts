import { Module, type Provider } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import type { CatalogDeps } from './application/catalog-deps.js';
import { CreateCategory, DeleteCategory, ListCategories, ReorderCategories, UpdateCategory } from './application/categories.use-cases.js';
import { GetMenu } from './application/get-menu.js';
import { ArchiveProduct, CreateProduct, GetProduct, ListProducts, RestoreProduct, UpdateProduct } from './application/products.use-cases.js';
import { ResolveOrderableProducts } from './application/resolve-orderable-products.js';
import { CATALOG_DEPS, CATALOG_ID_GENERATOR, CATALOG_REPOSITORY } from './catalog.tokens.js';
import type { CatalogRepository, IdGenerator } from './domain/catalog-repository.js';
import { CatalogCategoriesController, CatalogMenuController, CatalogProductsController } from './http/catalog.controller.js';
import { CuidIdGenerator } from './infrastructure/cuid-id-generator.js';
import { PrismaCatalogRepository } from './infrastructure/prisma-catalog.repository.js';

const useCaseProviders: Provider[] = [
  ListCategories,
  CreateCategory,
  UpdateCategory,
  DeleteCategory,
  ReorderCategories,
  ListProducts,
  GetProduct,
  CreateProduct,
  UpdateProduct,
  ArchiveProduct,
  RestoreProduct,
  ResolveOrderableProducts,
  GetMenu,
].map((UseCase: new (deps: CatalogDeps) => unknown) => ({
  provide: UseCase,
  useFactory: (deps: CatalogDeps) => new UseCase(deps),
  inject: [CATALOG_DEPS],
}));

@Module({
  // `SessionGuard` guards the admin routes; the menu route is public.
  imports: [AuthModule],
  controllers: [CatalogMenuController, CatalogCategoriesController, CatalogProductsController],
  providers: [
    { provide: CATALOG_REPOSITORY, useClass: PrismaCatalogRepository },
    { provide: CATALOG_ID_GENERATOR, useClass: CuidIdGenerator },
    {
      provide: CATALOG_DEPS,
      inject: [CATALOG_REPOSITORY, CATALOG_ID_GENERATOR],
      useFactory: (catalog: CatalogRepository, ids: IdGenerator): CatalogDeps => ({
        catalog,
        ids,
        clock: { now: () => new Date() },
      }),
    },
    ...useCaseProviders,
  ],
  // The orders module prices and checks products through this service.
  exports: [ResolveOrderableProducts],
})
export class CatalogModule {}
