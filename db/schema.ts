import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const products = sqliteTable(
  "products",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    sku: text("sku").notNull().default(""),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    priceCents: integer("price_cents").notNull(),
    compareAtPriceCents: integer("compare_at_price_cents"),
    categoriesJson: text("categories_json").notNull().default("[]"),
    sizesJson: text("sizes_json").notNull().default("[]"),
    colorsJson: text("colors_json").notNull().default("[]"),
    imageUrl: text("image_url").notNull().default(""),
    badge: text("badge").notNull().default(""),
    vendor: text("vendor").notNull().default(""),
    status: text("status").notNull().default("active"),
    featured: integer("featured", { mode: "boolean" }).notNull().default(false),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("products_status_idx").on(table.status),
    index("products_updated_at_idx").on(table.updatedAt),
  ],
);
