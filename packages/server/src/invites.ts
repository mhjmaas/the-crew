import { and, desc, eq } from "drizzle-orm";
import { db } from "./db/index.js";
import { crewInvites } from "./db/schema.js";

export type Invite = typeof crewInvites.$inferSelect;

export async function listInvites(crewId: string): Promise<Invite[]> {
  return db
    .select()
    .from(crewInvites)
    .where(eq(crewInvites.crewId, crewId))
    .orderBy(desc(crewInvites.createdAt));
}

export async function createInvite(
  crewId: string,
  createdByAccountId: string,
): Promise<Invite> {
  const invite: Invite = {
    id: crypto.randomUUID(),
    crewId,
    token: crypto.randomUUID(),
    createdByAccountId,
    createdAt: new Date(),
    revokedAt: null,
  };
  await db.insert(crewInvites).values(invite);
  return invite;
}

export async function findInviteByToken(token: string): Promise<Invite | null> {
  const [row] = await db
    .select()
    .from(crewInvites)
    .where(eq(crewInvites.token, token));
  return row ?? null;
}

export async function revokeInvite(
  crewId: string,
  inviteId: string,
): Promise<Invite | null> {
  const [row] = await db
    .update(crewInvites)
    .set({ revokedAt: new Date() })
    .where(and(eq(crewInvites.id, inviteId), eq(crewInvites.crewId, crewId)))
    .returning();
  return row ?? null;
}
