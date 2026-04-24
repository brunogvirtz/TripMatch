import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, groupsTable, groupMembersTable } from "@workspace/db";

const router: IRouter = Router();

function buildDisplayName(user: { firstName: string | null; lastName: string | null; email: string | null; id: string }): string {
  const parts = [user.firstName, user.lastName].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  if (user.email) return user.email.split("@")[0];
  return "Viajero";
}

router.get("/users/me", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.user.id));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(formatUser(user));
});

router.put("/users/me", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const { firstName, lastName, preferences } = req.body;

  const updates: Record<string, unknown> = {};
  if (firstName !== undefined) updates.firstName = firstName;
  if (lastName !== undefined) updates.lastName = lastName;
  if (preferences != null) updates.preferences = preferences;

  const [user] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, req.user.id))
    .returning();

  res.json(formatUser(user));
});

router.get("/dashboard", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.json({
      userId: "",
      activeGroups: 0,
      totalSwipes: 0,
      recentGroups: [],
      pendingInvites: 0,
    });
    return;
  }

  const userId = req.user.id;

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
    email: user.email ?? null,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    displayName: buildDisplayName(user),
    profileImageUrl: user.profileImageUrl ?? null,
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
