import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { groupsTable } from "./groups";
import { destinationsTable } from "./destinations";

export const swipesTable = pgTable("swipes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  groupId: integer("group_id").notNull().references(() => groupsTable.id),
  destinationId: integer("destination_id").notNull().references(() => destinationsTable.id),
  value: integer("value").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSwipeSchema = createInsertSchema(swipesTable).omit({ id: true, createdAt: true });
export type InsertSwipe = z.infer<typeof insertSwipeSchema>;
export type Swipe = typeof swipesTable.$inferSelect;
