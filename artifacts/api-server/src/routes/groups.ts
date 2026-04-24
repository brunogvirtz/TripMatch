import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, count, sql } from "drizzle-orm";
import { db, groupsTable, groupMembersTable, usersTable, swipesTable } from "@workspace/db";
import { computeGroupScores } from "../lib/matching";
import { customAlphabet } from "nanoid";

const generateCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 8);

const router: IRouter = Router();

function buildDisplayName(user: { firstName: string | null; lastName: string | null; email: string | null } | null | undefined): string {
  if (!user) return "Viajero";
  const parts = [user.firstName, user.lastName].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  if (user.email) return user.email.split("@")[0];
  return "Viajero";
}

function requireAuth(req: Request, res: Response): string | null {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return null;
  }
  return req.user.id;
}

router.get("/groups", async (req: Request, res: Response): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

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

router.post("/groups", async (req: Request, res: Response): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { name, description } = req.body;
  if (!name) {
    res.status(400).json({ error: "name is required" });
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

router.get("/groups/:id", async (req: Request, res: Response): Promise<void> => {
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
    displayName: buildDisplayName(user),
    avatarUrl: user?.profileImageUrl ?? null,
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

router.patch("/groups/:id", async (req: Request, res: Response): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

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

router.post("/groups/:id/join", async (req: Request, res: Response): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { inviteCode } = req.body;

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

router.post("/groups/:id/leave", async (req: Request, res: Response): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  await db
    .delete(swipesTable)
    .where(and(eq(swipesTable.groupId, id), eq(swipesTable.userId, userId)));

  await db
    .delete(groupMembersTable)
    .where(
      and(eq(groupMembersTable.groupId, id), eq(groupMembersTable.userId, userId))
    );

  res.json({ success: true });
});

router.get("/groups/:id/members", async (req: Request, res: Response): Promise<void> => {
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
      displayName: buildDisplayName(user),
      avatarUrl: user?.profileImageUrl ?? null,
      joinedAt: member.joinedAt,
    }))
  );
});

router.post("/groups/:id/preferences", async (req: Request, res: Response): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { budgetMin, budgetMax, travelTypes, climate, activityLevel, availableDates } = req.body;

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
    displayName: buildDisplayName(user),
    avatarUrl: user?.profileImageUrl ?? null,
    joinedAt: member.joinedAt,
  });
});

router.get("/groups/:id/results", async (req: Request, res: Response): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const members = await db
    .select()
    .from(groupMembersTable)
    .where(eq(groupMembersTable.groupId, id));

  const totalMembers = members.length;
  const swipedMembers = await db
    .select({ userId: sql<string>`distinct ${swipesTable.userId}` })
    .from(swipesTable)
    .where(eq(swipesTable.groupId, id));

  const membersCompleted = swipedMembers.length;
  const completionPercent =
    totalMembers > 0 ? Math.round((membersCompleted / totalMembers) * 100) : 0;

  const topDestinations = await computeGroupScores(id);
  const hasEnoughData = membersCompleted > 0 && topDestinations.length > 0;

  const top = topDestinations[0];
  let consensusSummary = "Todavía no hay suficientes datos";
  if (hasEnoughData && top) {
    const pct = top.matchPercentage;
    if (pct >= 80) {
      consensusSummary = `${pct}% del grupo coincide en ${top.destinationName}`;
    } else if (pct >= 60) {
      consensusSummary = `${pct}% del grupo le gusta ${top.destinationName}`;
    } else {
      consensusSummary = `Tu grupo tiene gustos variados — seguí deslizando`;
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

router.get("/groups/:id/stats", async (req: Request, res: Response): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [totalSwipesResult] = await db
    .select({ cnt: count() })
    .from(swipesTable)
    .where(eq(swipesTable.groupId, id));

  const swipedMembersResult = await db
    .select({ userId: sql<string>`distinct ${swipesTable.userId}` })
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
    userId: string;
    displayName: string;
    destinationName: string | null;
    action: string;
    createdAt: Date;
  }[] = [];

  for (const { swipe, user } of recentSwipes) {
    const action =
      swipe.value === 2 ? "le encantó" : swipe.value === 1 ? "le gustó" : "descartó";
    activityItems.push({
      type: "swipe",
      userId: swipe.userId,
      displayName: buildDisplayName(user),
      destinationName: null,
      action,
      createdAt: swipe.createdAt,
    });
  }

  for (const { member, user } of recentMembers) {
    activityItems.push({
      type: "join",
      userId: member.userId,
      displayName: buildDisplayName(user),
      destinationName: null,
      action: "se unió al grupo",
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
