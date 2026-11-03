-- AlterTable
ALTER TABLE "catalog_products" ADD COLUMN     "image" TEXT,
ADD COLUMN     "moments" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "plural" TEXT;
