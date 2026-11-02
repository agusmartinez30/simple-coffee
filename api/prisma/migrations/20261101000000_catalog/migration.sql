-- CreateEnum
CREATE TYPE "CatalogPublication" AS ENUM ('PUBLISHED', 'DRAFT');

-- CreateEnum
CREATE TYPE "CatalogOptionSelection" AS ENUM ('SINGLE', 'MULTIPLE');

-- CreateTable
CREATE TABLE "catalog_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_products" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "price" INTEGER NOT NULL,
    "categoryId" TEXT NOT NULL,
    "publication" "CatalogPublication" NOT NULL DEFAULT 'DRAFT',
    "available" BOOLEAN NOT NULL DEFAULT true,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "allowCustomerNotes" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_option_groups" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "selection" "CatalogOptionSelection" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "max" INTEGER,
    "defaultOptionId" TEXT,
    "position" INTEGER NOT NULL,

    CONSTRAINT "catalog_option_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_options" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceDelta" INTEGER NOT NULL DEFAULT 0,
    "position" INTEGER NOT NULL,

    CONSTRAINT "catalog_options_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "catalog_products_sku_key" ON "catalog_products"("sku");

-- CreateIndex
CREATE INDEX "catalog_products_categoryId_idx" ON "catalog_products"("categoryId");

-- CreateIndex
CREATE INDEX "catalog_option_groups_productId_idx" ON "catalog_option_groups"("productId");

-- CreateIndex
CREATE INDEX "catalog_options_groupId_idx" ON "catalog_options"("groupId");

-- AddForeignKey
ALTER TABLE "catalog_products" ADD CONSTRAINT "catalog_products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "catalog_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_option_groups" ADD CONSTRAINT "catalog_option_groups_productId_fkey" FOREIGN KEY ("productId") REFERENCES "catalog_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_options" ADD CONSTRAINT "catalog_options_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "catalog_option_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
