import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, destinationsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/destinations", async (_req, res): Promise<void> => {
  const destinations = await db.select().from(destinationsTable);
  res.json(destinations.map(formatDestination));
});

router.get("/destinations/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [dest] = await db
    .select()
    .from(destinationsTable)
    .where(eq(destinationsTable.id, id));

  if (!dest) {
    res.status(404).json({ error: "Destination not found" });
    return;
  }

  res.json(formatDestination(dest));
});

function formatDestination(dest: typeof destinationsTable.$inferSelect) {
  return {
    id: dest.id,
    name: dest.name,
    country: dest.country,
    description: dest.description,
    imageUrl: dest.imageUrl,
    tags: dest.tags ?? [],
    costLevel: dest.costLevel,
    climateType: dest.climateType,
    activityLevel: dest.activityLevel,
    travelTypes: dest.travelTypes ?? [],
    avgRating: dest.avgRating,
  };
}

export default router;
