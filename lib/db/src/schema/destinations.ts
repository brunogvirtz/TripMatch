import { pgTable, text, serial, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const destinationsTable = pgTable("destinations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  country: text("country").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url").notNull(),
  tags: text("tags").array().default([]),
  costLevel: integer("cost_level").notNull().default(2),
  climateType: text("climate_type").notNull(),
  activityLevel: text("activity_level").notNull(),
  travelTypes: text("travel_types").array().default([]),
  avgRating: real("avg_rating").notNull().default(4.0),
});

export const insertDestinationSchema = createInsertSchema(destinationsTable).omit({ id: true });
export type InsertDestination = z.infer<typeof insertDestinationSchema>;
export type Destination = typeof destinationsTable.$inferSelect;
