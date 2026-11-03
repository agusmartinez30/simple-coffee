import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query, UseFilters, UseGuards } from '@nestjs/common';
import { ZodValidationPipe } from '../../../shared/http/zod-validation.pipe.js';
import { SessionGuard } from '../../auth/http/session.guard.js';
import { CreateCategory, DeleteCategory, ListCategories, ReorderCategories, UpdateCategory } from '../application/categories.use-cases.js';
import { GetMenu, type Menu } from '../application/get-menu.js';
import { ArchiveProduct, CreateProduct, GetProduct, ListProducts, RestoreProduct, UpdateProduct } from '../application/products.use-cases.js';
import type { Category } from '../domain/category.js';
import type { Product } from '../domain/product.js';
import { CatalogErrorFilter } from './catalog-error.filter.js';
import {
  categoryOrderSchema,
  categoryPatchSchema,
  newCategorySchema,
  newProductSchema,
  productListQuerySchema,
  productPatchSchema,
  type CategoryOrderBody,
  type CategoryPatchBody,
  type NewCategoryBody,
  type NewProductBody,
  type ProductListQuery,
  type ProductPatchBody,
} from './catalog.schemas.js';

/** Public: the customer menu for the web app, no session needed. */
@Controller('catalog/menu')
export class CatalogMenuController {
  constructor(private readonly getMenu: GetMenu) {}

  @Get()
  get(): Promise<Menu> {
    return this.getMenu.execute();
  }
}

/** Admin categories. Every mutation answers the full list by position. */
@Controller('catalog/categories')
@UseGuards(SessionGuard)
@UseFilters(CatalogErrorFilter)
export class CatalogCategoriesController {
  constructor(
    private readonly listCategories: ListCategories,
    private readonly createCategory: CreateCategory,
    private readonly updateCategory: UpdateCategory,
    private readonly deleteCategory: DeleteCategory,
    private readonly reorderCategories: ReorderCategories,
  ) {}

  @Get()
  list(): Promise<Category[]> {
    return this.listCategories.execute();
  }

  @Post()
  add(@Body(new ZodValidationPipe(newCategorySchema)) body: NewCategoryBody): Promise<Category[]> {
    return this.createCategory.execute(body);
  }

  @Put('order')
  reorder(@Body(new ZodValidationPipe(categoryOrderSchema)) body: CategoryOrderBody): Promise<Category[]> {
    return this.reorderCategories.execute(body.ids);
  }

  @Patch(':categoryId')
  edit(@Param('categoryId') id: string, @Body(new ZodValidationPipe(categoryPatchSchema)) body: CategoryPatchBody): Promise<Category[]> {
    return this.updateCategory.execute(id, body);
  }

  @Delete(':categoryId')
  remove(@Param('categoryId') id: string): Promise<Category[]> {
    return this.deleteCategory.execute(id);
  }
}

/** Admin products. Mutations answer the saved product; products are archived, never deleted. */
@Controller('catalog/products')
@UseGuards(SessionGuard)
@UseFilters(CatalogErrorFilter)
export class CatalogProductsController {
  constructor(
    private readonly listProducts: ListProducts,
    private readonly getProduct: GetProduct,
    private readonly createProduct: CreateProduct,
    private readonly updateProduct: UpdateProduct,
    private readonly archiveProduct: ArchiveProduct,
    private readonly restoreProduct: RestoreProduct,
  ) {}

  @Get()
  list(@Query(new ZodValidationPipe(productListQuerySchema)) query: ProductListQuery): Promise<Product[]> {
    return this.listProducts.execute(query);
  }

  @Get(':productId')
  get(@Param('productId') id: string): Promise<Product> {
    return this.getProduct.execute(id);
  }

  @Post()
  add(@Body(new ZodValidationPipe(newProductSchema)) body: NewProductBody): Promise<Product> {
    return this.createProduct.execute(body);
  }

  @Patch(':productId')
  edit(@Param('productId') id: string, @Body(new ZodValidationPipe(productPatchSchema)) body: ProductPatchBody): Promise<Product> {
    return this.updateProduct.execute(id, body);
  }

  @Post(':productId/archive')
  @HttpCode(200)
  archive(@Param('productId') id: string): Promise<Product> {
    return this.archiveProduct.execute(id);
  }

  @Post(':productId/restore')
  @HttpCode(200)
  restore(@Param('productId') id: string): Promise<Product> {
    return this.restoreProduct.execute(id);
  }
}
