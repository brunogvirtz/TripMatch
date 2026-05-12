import { Router, type IRouter, type Request, type Response } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import { GetCurrentAuthUserResponse } from "@workspace/api-zod";
import { db, usersTable } from "@workspace/db";

const router: IRouter = Router();

async function upsertUser(clerkUserId: string) {
  const clerkUser = await clerkClient().users.getUser(clerkUserId);

  const userData = {
    id: clerkUser.id,
    email: clerkUser.emailAddresses[0]?.emailAddress ?? null,
    firstName: clerkUser.firstName ?? null,
    lastName: clerkUser.lastName ?? null,
    profileImageUrl: clerkUser.imageUrl ?? null,
  };

  const [user] = await db
    .insert(usersTable)
    .values(userData)
    .onConflictDoUpdate({
      target: usersTable.id,
      set: {
        ...userData,
        updatedAt: new Date(),
      },
    })
    .returning();

  return user;
}

router.get("/auth/user", async (req: Request, res: Response) => {
  const auth = getAuth(req);

  if (!auth?.userId) {
    res.json(GetCurrentAuthUserResponse.parse({ user: null }));
    return;
  }

  try {
    const user = await upsertUser(auth.userId);
    res.json(
      GetCurrentAuthUserResponse.parse({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl,
        },
      }),
    );
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

export default router;
