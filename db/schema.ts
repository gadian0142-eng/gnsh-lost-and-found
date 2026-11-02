import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const items = sqliteTable("items", {
  id: text("id").primaryKey(),
  owner: text("owner").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  foundAt: text("found_at").notNull(),
  foundOn: text("found_on").notNull(),
  keptAt: text("kept_at").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("keeping"),
  created: integer("created").notNull(),
}, table => [
  index("items_newest").on(table.created, table.id),
  index("items_owner").on(table.owner),
]);
