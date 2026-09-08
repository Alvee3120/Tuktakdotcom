-- Create missing inventory tables in remote D1

CREATE TABLE IF NOT EXISTS "inventory" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "name" TEXT NOT NULL,
  "location" TEXT,
  "description" TEXT,
  "is_active" INTEGER NOT NULL DEFAULT 1,
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "inventory_stock" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "inventory_id" TEXT NOT NULL REFERENCES "inventory"("id") ON DELETE CASCADE,
  "product_id" TEXT NOT NULL REFERENCES "product"("id") ON DELETE CASCADE,
  "quantity" INTEGER NOT NULL DEFAULT 0,
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "inv_stock_unique" ON "inventory_stock" ("inventory_id", "product_id");
CREATE INDEX IF NOT EXISTS "inv_stock_product_idx" ON "inventory_stock" ("product_id");
