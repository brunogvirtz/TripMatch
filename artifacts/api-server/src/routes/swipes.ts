import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and } from "drizzle-orm";
import { db, swipesTable, destinationsTable } from "@workspace/db";
import { getSingleDestinationScore } from "../lib/matching";

const router: IRouter = Router();

router.post("/swipes", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const userId = req.user.id;

  const { groupId, destinationId, value } = req.body;

  if (!groupId || !destinationId || value === undefined) {
    res.status(400).json({ error: "groupId, destinationId, value are required" });
    return;
  }

  if (![-1, 1, 2].includes(value)) {
    res.status(400).json({ error: "value must be -1, 1, or 2" });
    return;
  }

  const existing = await db
    .select()
    .from(swipesTable)
    .where(
      and(
        eq(swipesTable.userId, userId),
        eq(swipesTable.groupId, groupId),
        eq(swipesTable.destinationId, destinationId)
      )
    );

  let swipe;
  if (existing.length > 0) {
    const [updated] = await db
      .update(swipesTable)
      .set({ value })
      .where(eq(swipesTable.id, existing[0].id))
      .returning();
    swipe = updated;
  } else {
    const [created] = await db
      .insert(swipesTable)
      .values({ userId, groupId, destinationId, value })
      .returning();
    swipe = created;
  }

  const updatedScore = await getSingleDestinationScore(groupId, destinationId);

  const dest = await db
    .select()
    .from(destinationsTable)
    .where(eq(destinationsTable.id, destinationId))
    .then((rows) => rows[0]);

  res.status(201).json({
    swipe,
    updatedScore: updatedScore ?? {
      destinationId,
      destinationName: dest?.name ?? "Unknown",
      country: dest?.country ?? "",
      imageUrl: dest?.imageUrl ?? "",
      groupScore: value,
      matchPercentage: value > 0 ? 100 : 0,
      consensusLevel: "medium",
      likeCount: value === 1 ? 1 : 0,
      dislikeCount: value === -1 ? 1 : 0,
      superlikeCount: value === 2 ? 1 : 0,
      totalVotes: 1,
    },
  });
});

router.get("/swipes/group/:groupId", async (req: Request, res: Response): Promise<void> => {
  const raw = Array.isArray(req.params.groupId) ? req.params.groupId[0] : req.params.groupId;
  const groupId = parseInt(raw, 10);

  const swipes = await db
    .select()
    .from(swipesTable)
    .where(eq(swipesTable.groupId, groupId));

  res.json(swipes);
});

router.get("/swipes/user/:groupId", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.json([]);
    return;
  }
  const userId = req.user.id;

  const raw = Array.isArray(req.params.groupId) ? req.params.groupId[0] : req.params.groupId;
  const groupId = parseInt(raw, 10);

  const swipes = await db
    .select()
    .from(swipesTable)
    .where(and(eq(swipesTable.groupId, groupId), eq(swipesTable.userId, userId)));

  res.json(swipes);
});

export default router;
