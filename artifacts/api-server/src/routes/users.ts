import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, groupsTable, groupMembersTable } from "@workspace/db";
const router: IRouter = Router();

router.post("/users", async (req, res): Promise<void> => {
  const { username, displayName, avatarUrl } = req.body;
  if (!username || !displayName) {
    res.status(400).json({ error: "username and displayName are required" });
    return;
  }

  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, username));

  if (existing.length > 0) {
    res.status(201).json(formatUser(existing[0]));
    return;
  }

  const [user] = await db
    .insert(usersTable)
    .values({ username, displayName, avatarUrl: avatarUrl ?? null })
    .returning();

  res.status(201).json(formatUser(user));
});

router.get("/users/me", async (req, res): Promise<void> => {
  const userId = parseInt(req.headers["x-user-id"] as string, 10);
  if (!userId || isNaN(userId)) {
    res.status(404).json({ error: "No user found" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(formatUser(user));
});

router.put("/users/me", async (req, res): Promise<void> => {
  const userId = parseInt(req.headers["x-user-id"] as string, 10);
  if (!userId || isNaN(userId)) {
    res.status(400).json({ error: "User ID required" });
    return;
  }

  const { displayName, avatarUrl, preferences } = req.body;

  const updates: Record<string, unknown> = {};
  if (displayName != null) updates.displayName = displayName;
  if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
  if (preferences != null) updates.preferences = preferences;

  const [user] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, userId))
    .returning();

  res.json(formatUser(user));
});

router.get("/dashboard", async (req, res): Promise<void> => {
  const userId = parseInt(req.headers["x-user-id"] as string, 10);
  if (!userId || isNaN(userId)) {
    res.json({
      userId: 0,
      activeGroups: 0,
      totalSwipes: 0,
      recentGroups: [],
      pendingInvites: 0,
    });
    return;
  }

  const members = await db
    .select({ groupId: groupMembersTable.groupId })
    .from(groupMembersTable)
    .where(eq(groupMembersTable.userId, userId));

  const groupIds = members.map((m) => m.groupId);

  let recentGroups: typeof groupsTable.$inferSelect[] = [];
  let activeGroups = 0;

  if (groupIds.length > 0) {
    const allGroups = await db.select().from(groupsTable);
    recentGroups = allGroups
      .filter((g) => groupIds.includes(g.id))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5);

    activeGroups = recentGroups.filter(
      (g) => g.status === "swiping" || g.status === "pending"
    ).length;
  }

  res.json({
    userId,
    activeGroups,
    totalSwipes: 0,
    recentGroups: await Promise.all(
      recentGroups.map(async (g) => {
        const memberRows = await db
          .select()
          .from(groupMembersTable)
          .where(eq(groupMembersTable.groupId, g.id));
        return formatGroup(g, memberRows.length);
      })
    ),
    pendingInvites: 0,
  });
});

function formatUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl ?? null,
    preferences: user.preferences ?? {},
    createdAt: user.createdAt,
  };
}

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
