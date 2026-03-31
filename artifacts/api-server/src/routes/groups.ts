import { Router, type IRouter } from "express";
import { eq, and, count, sql } from "drizzle-orm";
import { db, groupsTable, groupMembersTable, usersTable, swipesTable } from "@workspace/db";
import { computeGroupScores } from "../lib/matching";
import { customAlphabet } from "nanoid";

const generateCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 8);

const router: IRouter = Router();

router.get("/groups", async (req, res): Promise<void> => {
  const userId = parseInt(req.headers["x-user-id"] as string, 10);
  if (!userId || isNaN(userId)) {
    res.json([]);
    return;
  }

  const members = await db
    .select({ groupId: groupMembersTable.groupId })
    .from(groupMembersTable)
    .where(eq(groupMembersTable.userId, userId));

  const groupIds = members.map((m) => m.groupId);

  if (groupIds.length === 0) {
    res.json([]);
    return;
  }

  const groups = await db.select().from(groupsTable);
  const userGroups = groups.filter((g) => groupIds.includes(g.id));

  const result = await Promise.all(
    userGroups.map(async (g) => {
      const [cnt] = await db
        .select({ count: count() })
        .from(groupMembersTable)
        .where(eq(groupMembersTable.groupId, g.id));
      return formatGroup(g, cnt?.count ?? 0);
    })
  );

  res.json(result);
});

router.post("/groups", async (req, res): Promise<void> => {
  const { name, description, userId } = req.body;
  if (!name || !userId) {
    res.status(400).json({ error: "name and userId are required" });
    return;
  }

  const inviteCode = generateCode();

  const [group] = await db
    .insert(groupsTable)
    .values({
      name,
      description: description ?? null,
      inviteCode,
      status: "pending",
      createdByUserId: userId,
    })
    .returning();

  await db.insert(groupMembersTable).values({
    groupId: group.id,
    userId,
    role: "creator",
    hasCompletedPreferences: "false",
  });

  const [cnt] = await db
    .select({ count: count() })
    .from(groupMembersTable)
    .where(eq(groupMembersTable.groupId, group.id));

  res.status(201).json(formatGroup(group, cnt?.count ?? 1));
});

router.get("/groups/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [group] = await db.select().from(groupsTable).where(eq(groupsTable.id, id));
  if (!group) {
    res.status(404).json({ error: "Group not found" });
    return;
  }

  const members = await db
    .select({
      member: groupMembersTable,
      user: usersTable,
    })
    .from(groupMembersTable)
    .leftJoin(usersTable, eq(groupMembersTable.userId, usersTable.id))
    .where(eq(groupMembersTable.groupId, id));

  const swipeCounts = await db
    .select({
      userId: swipesTable.userId,
      cnt: count(),
    })
    .from(swipesTable)
    .where(eq(swipesTable.groupId, id))
    .groupBy(swipesTable.userId);

  const swipeMap = new Map(swipeCounts.map((s) => [s.userId, s.cnt]));

  const formattedMembers = members.map(({ member, user }) => ({
    id: member.id,
    userId: member.userId,
    groupId: member.groupId,
    role: member.role,
    hasCompletedPreferences: member.hasCompletedPreferences === "true",
    swipeCount: swipeMap.get(member.userId) ?? 0,
    displayName: user?.displayName ?? "Unknown",
    avatarUrl: user?.avatarUrl ?? null,
    joinedAt: member.joinedAt,
  }));

  const topDestinations = await computeGroupScores(id);

  res.json({
    id: group.id,
    name: group.name,
    description: group.description ?? null,
    inviteCode: group.inviteCode,
    status: group.status,
    memberCount: members.length,
    createdAt: group.createdAt,
    createdByUserId: group.createdByUserId,
    members: formattedMembers,
    topDestinations: topDestinations.slice(0, 3),
  });
});

router.patch("/groups/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const { name, description, status } = req.body;
  const updates: Record<string, unknown> = {};
  if (name != null) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (status != null) updates.status = status;

  const [group] = await db
    .update(groupsTable)
    .set(updates)
    .where(eq(groupsTable.id, id))
    .returning();

  if (!group) {
    res.status(404).json({ error: "Group not found" });
    return;
  }

  const [cnt] = await db
    .select({ count: count() })
    .from(groupMembersTable)
    .where(eq(groupMembersTable.groupId, id));

  res.json(formatGroup(group, cnt?.count ?? 0));
});

router.post("/groups/:id/join", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { inviteCode, userId } = req.body;

  const [group] = await db.select().from(groupsTable).where(eq(groupsTable.id, id));
  if (!group) {
    res.status(404).json({ error: "Group not found" });
    return;
  }

  if (group.inviteCode !== inviteCode) {
    res.status(400).json({ error: "Invalid invite code" });
    return;
  }

  const existing = await db
    .select()
    .from(groupMembersTable)
    .where(
      and(eq(groupMembersTable.groupId, id), eq(groupMembersTable.userId, userId))
    );

  if (existing.length === 0) {
    await db.insert(groupMembersTable).values({
      groupId: id,
      userId,
      role: "member",
      hasCompletedPreferences: "false",
    });
  }

  const [cnt] = await db
    .select({ count: count() })
    .from(groupMembersTable)
    .where(eq(groupMembersTable.groupId, id));

  res.json(formatGroup(group, cnt?.count ?? 0));
});

router.get("/groups/:id/members", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const members = await db
    .select({
      member: groupMembersTable,
      user: usersTable,
    })
    .from(groupMembersTable)
    .leftJoin(usersTable, eq(groupMembersTable.userId, usersTable.id))
    .where(eq(groupMembersTable.groupId, id));

  const swipeCounts = await db
    .select({ userId: swipesTable.userId, cnt: count() })
    .from(swipesTable)
    .where(eq(swipesTable.groupId, id))
    .groupBy(swipesTable.userId);

  const swipeMap = new Map(swipeCounts.map((s) => [s.userId, s.cnt]));

  res.json(
    members.map(({ member, user }) => ({
      id: member.id,
      userId: member.userId,
      groupId: member.groupId,
      role: member.role,
      hasCompletedPreferences: member.hasCompletedPreferences === "true",
      swipeCount: swipeMap.get(member.userId) ?? 0,
      displayName: user?.displayName ?? "Unknown",
      avatarUrl: user?.avatarUrl ?? null,
      joinedAt: member.joinedAt,
    }))
  );
});

router.post("/groups/:id/preferences", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { userId, budgetMin, budgetMax, travelTypes, climate, activityLevel, availableDates } = req.body;

  if (!userId) {
    res.status(400).json({ error: "userId is required" });
    return;
  }

  const [member] = await db
    .update(groupMembersTable)
    .set({
      hasCompletedPreferences: "true",
      budgetMin: String(budgetMin ?? ""),
      budgetMax: String(budgetMax ?? ""),
      travelTypes: travelTypes ?? [],
      climate: climate ?? null,
      activityLevel: activityLevel ?? null,
      availableDates: availableDates ?? null,
    })
    .where(
      and(eq(groupMembersTable.groupId, id), eq(groupMembersTable.userId, userId))
    )
    .returning();

  if (!member) {
    res.status(404).json({ error: "Member not found in group" });
    return;
  }

  const swipeCounts = await db
    .select({ cnt: count() })
    .from(swipesTable)
    .where(and(eq(swipesTable.groupId, id), eq(swipesTable.userId, userId)));

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));

  res.json({
    id: member.id,
    userId: member.userId,
    groupId: member.groupId,
    role: member.role,
    hasCompletedPreferences: true,
    swipeCount: swipeCounts[0]?.cnt ?? 0,
    displayName: user?.displayName ?? "Unknown",
    avatarUrl: user?.avatarUrl ?? null,
    joinedAt: member.joinedAt,
  });
});

router.get("/groups/:id/results", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const members = await db
    .select()
    .from(groupMembersTable)
    .where(eq(groupMembersTable.groupId, id));

  const totalMembers = members.length;
  const swipedMembers = await db
    .select({ userId: sql<number>`distinct ${swipesTable.userId}` })
    .from(swipesTable)
    .where(eq(swipesTable.groupId, id));

  const membersCompleted = swipedMembers.length;
  const completionPercent =
    totalMembers > 0 ? Math.round((membersCompleted / totalMembers) * 100) : 0;

  const topDestinations = await computeGroupScores(id);
  const hasEnoughData = membersCompleted > 0 && topDestinations.length > 0;

  const top = topDestinations[0];
  let consensusSummary = "Not enough data yet";
  if (hasEnoughData && top) {
    const pct = top.matchPercentage;
    if (pct >= 80) {
      consensusSummary = `${pct}% of your group agrees on ${top.destinationName}`;
    } else if (pct >= 60) {
      consensusSummary = `${pct}% of your group likes ${top.destinationName}`;
    } else {
      consensusSummary = `Your group has varied tastes — keep swiping for better results`;
    }
  }

  res.json({
    groupId: id,
    totalMembers,
    membersCompleted,
    completionPercent,
    topDestinations: topDestinations.slice(0, 5),
    consensusSummary,
    hasEnoughData,
  });
});

router.get("/groups/:id/stats", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [totalSwipesResult] = await db
    .select({ cnt: count() })
    .from(swipesTable)
    .where(eq(swipesTable.groupId, id));

  const swipedMembersResult = await db
    .select({ userId: sql<number>`distinct ${swipesTable.userId}` })
    .from(swipesTable)
    .where(eq(swipesTable.groupId, id));

  const prefMembers = await db
    .select()
    .from(groupMembersTable)
    .where(
      and(
        eq(groupMembersTable.groupId, id),
        eq(groupMembersTable.hasCompletedPreferences, "true")
      )
    );

  const topDestinations = await computeGroupScores(id);
  const topMatch = topDestinations[0] ?? null;

  const recentSwipes = await db
    .select({
      swipe: swipesTable,
      user: usersTable,
    })
    .from(swipesTable)
    .leftJoin(usersTable, eq(swipesTable.userId, usersTable.id))
    .where(eq(swipesTable.groupId, id))
    .orderBy(sql`${swipesTable.createdAt} desc`)
    .limit(5);

  const recentMembers = await db
    .select({
      member: groupMembersTable,
      user: usersTable,
    })
    .from(groupMembersTable)
    .leftJoin(usersTable, eq(groupMembersTable.userId, usersTable.id))
    .where(eq(groupMembersTable.groupId, id))
    .orderBy(sql`${groupMembersTable.joinedAt} desc`)
    .limit(3);

  const activityItems: {
    type: string;
    userId: number;
    displayName: string;
    destinationName: string | null;
    action: string;
    createdAt: Date;
  }[] = [];

  for (const { swipe, user } of recentSwipes) {
    const action =
      swipe.value === 2 ? "superliked" : swipe.value === 1 ? "liked" : "passed on";
    activityItems.push({
      type: "swipe",
      userId: swipe.userId,
      displayName: user?.displayName ?? "Someone",
      destinationName: null,
      action,
      createdAt: swipe.createdAt,
    });
  }

  for (const { member, user } of recentMembers) {
    activityItems.push({
      type: "join",
      userId: member.userId,
      displayName: user?.displayName ?? "Someone",
      destinationName: null,
      action: "joined the group",
      createdAt: member.joinedAt,
    });
  }

  activityItems.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  res.json({
    groupId: id,
    totalSwipes: totalSwipesResult?.cnt ?? 0,
    membersSwipedCount: swipedMembersResult.length,
    membersPreferencesCount: prefMembers.length,
    topMatch: topMatch ?? null,
    recentActivity: activityItems.slice(0, 8),
  });
});

function formatGroup(group: typeof groupsTable.$inferSelect, memberCount: number) {
  return {
    id: group.id,
    name: group.name,
    description: group.description ?? null,
    inviteCode: group.inviteCode,
    status: group.status,
    memberCount,
    createdAt: group.createdAt,
    createdByUserId: group.createdByUserId,
  };
}

export default router;
