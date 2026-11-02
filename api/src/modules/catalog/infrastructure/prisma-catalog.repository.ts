import { Injectable } from '@nestjs/common';
import type {
  CatalogOptionSelection as SelectionRow,
  CatalogPublication as PublicationRow,
  Prisma,
} from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../shared/prisma/prisma.service.js';
import type { CatalogRepository, ProductFilter } from '../domain/catalog-repository.js';
import type { Category } from '../domain/category.js';
import type { OptionSelection, Product, ProductPublication } from '../domain/product.js';

/** Prisma enum values are the uppercase form of the domain identifiers ("draft" ↔ "DRAFT"). */
const toRow = <Row extends string>(value: string) => value.toUpperCase() as Row;
const fromRow = <Value extends string>(row: string) => row.toLowerCase() as Value;

const WITH_OPTIONS = {
  optionGroups: { orderBy: { position: 'asc' }, include: { options: { orderBy: { position: 'asc' } } } },
} as const satisfies Prisma.CatalogProductInclude;

type ProductRow = Prisma.CatalogProductGetPayload<{ include: typeof WITH_OPTIONS }>;

function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    description: row.description,
    price: row.price,
    categoryId: row.categoryId,
    publication: fromRow<ProductPublication>(row.publication),
    available: row.available,
    archived: row.archived,
    allowCustomerNotes: row.allowCustomerNotes,
    position: row.position,
    version: row.version,
    optionGroups: row.optionGroups.map((group) => ({
      id: group.id,
      title: group.title,
      selection: fromRow<OptionSelection>(group.selection),
      required: group.required,
      max: group.max,
      defaultOptionId: group.defaultOptionId,
      options: group.options.map((option) => ({ id: option.id, name: option.name, priceDelta: option.priceDelta })),
    })),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

@Injectable()
export class PrismaCatalogRepository implements CatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  listCategories(): Promise<Category[]> {
    return this.prisma.catalogCategory.findMany({ orderBy: { position: 'asc' } });
  }

  async saveCategory(category: Category): Promise<void> {
    const { id, ...fields } = category;
    await this.prisma.catalogCategory.upsert({ where: { id }, create: category, update: fields });
  }

  async saveCategoryOrder(ids: readonly string[]): Promise<void> {
    await this.prisma.$transaction(ids.map((id, position) => this.prisma.catalogCategory.update({ where: { id }, data: { position } })));
  }

  async deleteCategory(id: string): Promise<void> {
    await this.prisma.catalogCategory.delete({ where: { id } });
  }

  countProducts(categoryId: string): Promise<number> {
    return this.prisma.catalogProduct.count({ where: { categoryId } });
  }

  async listProducts({ categoryId, includeArchived = false }: ProductFilter = {}): Promise<Product[]> {
    const rows = await this.prisma.catalogProduct.findMany({
      where: { ...(categoryId === undefined ? {} : { categoryId }), ...(includeArchived ? {} : { archived: false }) },
      orderBy: [{ category: { position: 'asc' } }, { position: 'asc' }],
      include: WITH_OPTIONS,
    });
    return rows.map(toProduct);
  }

  async findProducts(ids: readonly string[]): Promise<Product[]> {
    const rows = await this.prisma.catalogProduct.findMany({ where: { id: { in: [...ids] } }, include: WITH_OPTIONS });
    return rows.map(toProduct);
  }

  async saveProduct(product: Product): Promise<void> {
    const { id, optionGroups, publication, ...rest } = product;
    const fields = { ...rest, publication: toRow<PublicationRow>(publication) };
    const groupIds = optionGroups.map((group) => group.id);
    await this.prisma.$transaction([
      this.prisma.catalogProduct.upsert({ where: { id }, create: { id, ...fields }, update: fields }),
      // Groups and options left out of the product are removed (options cascade with their group).
      this.prisma.catalogOptionGroup.deleteMany({ where: { productId: id, id: { notIn: groupIds } } }),
      ...optionGroups.flatMap((group, position) => {
        const { id: groupId, options, selection, ...groupRest } = group;
        const groupFields = { ...groupRest, selection: toRow<SelectionRow>(selection), position };
        return [
          this.prisma.catalogOptionGroup.upsert({
            where: { id: groupId },
            create: { id: groupId, productId: id, ...groupFields },
            update: groupFields,
          }),
          this.prisma.catalogOption.deleteMany({ where: { groupId, id: { notIn: options.map((option) => option.id) } } }),
          ...options.map((option, optionPosition) => {
            const optionFields = { name: option.name, priceDelta: option.priceDelta, position: optionPosition };
            return this.prisma.catalogOption.upsert({
              where: { id: option.id },
              create: { id: option.id, groupId, ...optionFields },
              update: optionFields,
            });
          }),
        ];
      }),
    ]);
  }
}
