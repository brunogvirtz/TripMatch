import { clerkMiddleware, getAuth } from "@clerk/express";
import { type Request, type Response, type NextFunction } from "express";
import type { AuthUser } from "@workspace/api-zod";

declare global {
  namespace Express {
    interface User extends AuthUser {}
    interface Request {
      isAuthenticated(): this is AuthedRequest;
      user?: User | undefined;
    }
    export interface AuthedRequest {
      user: User;
    }
  }
}

export { clerkMiddleware };

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  req.isAuthenticated = function (this: Request) {
    return this.user != null;
  } as Request["isAuthenticated"];

  const auth = getAuth(req);

  if (!auth?.userId) {
    next();
    return;
  }

  req.user = {
    id: auth.userId,
    email: null,
    firstName: null,
    lastName: null,
    profileImageUrl: null,
  };

  next();
}
