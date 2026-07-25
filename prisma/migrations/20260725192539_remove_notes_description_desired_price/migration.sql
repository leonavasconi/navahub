-- AlterTable
ALTER TABLE "products" DROP COLUMN "description",
DROP COLUMN "desiredSalePrice",
DROP COLUMN "notes";

-- AlterTable
ALTER TABLE "purchase_sellers" DROP COLUMN "notes";

-- AlterTable
ALTER TABLE "purchases" DROP COLUMN "notes";

