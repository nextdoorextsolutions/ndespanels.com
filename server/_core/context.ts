import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { SafeUser } from "../../drizzle/schema";
import { nanoid } from "nanoid";
import { sdk } from "./sdk";
import { logger } from "../lib/logger";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: SafeUser | null;
  requestId: string;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  const requestId = nanoid(10);
  let user: SafeUser | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
    if (user) {
      console.log('[Context] Authenticated user:', user.email, 'Role:', user.role, 'ID:', user.id);
    }
  } catch (error: any) {
    // Authentication is optional for public procedures.
    console.warn('[Context] Authentication failed:', error.message);
    user = null;
  }

  // Log request
  logger.request(
    opts.req.method || 'UNKNOWN',
    opts.req.path || opts.req.url || '/',
    { requestId, userId: user?.id, userRole: user?.role }
  );

  return {
    req: opts.req,
    res: opts.res,
    user,
    requestId,
  };
}
