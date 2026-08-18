import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import type { createNodeWebSocket } from "@hono/node-ws";
import {
  type Command,
  type CrewState,
  type World,
  WorldError,
  type WorldEvent,
} from "@the-crew/world-core";
import { and, eq } from "drizzle-orm";
import type { Context, Hono } from "hono";
import { cors } from "hono/cors";
import { type AccountUser, auth } from "./auth.js";
import { db } from "./db/index.js";
import { crewMembers, inhabitants } from "./db/schema.js";
import type { CrewHub } from "./hub.js";
import {
  createInvite,
  findInviteByToken,
  type Invite,
  listInvites,
  revokeInvite,
} from "./invites.js";
import {
  persistCrewCreation,
  persistInhabitantJoin,
  persistInhabitantMove,
} from "./world-store.js";

declare module "hono" {
  interface ContextVariableMap {
    user: AccountUser;
  }
}

type NodeWebSocket = ReturnType<typeof createNodeWebSocket>;

export interface AppDeps {
  world: World;
  hub: CrewHub;
  nodeWs: NodeWebSocket;
}

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".map": "application/json",
};

const extraWsOrigins = (process.env.WS_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

function wsOriginAllowed(
  origin: string | undefined,
  host: string | undefined,
): boolean {
  if (!origin || origin === "null") {
    return true;
  }
  if (extraWsOrigins.includes(origin)) {
    return true;
  }
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return true;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return true;
  }
  return url.host === host;
}

export function setupApp(app: Hono, { world, hub, nodeWs }: AppDeps): void {
  app.use("/api/*", cors({ origin: (origin) => origin, credentials: true }));

  app.all("/api/auth/*", (c) => auth.handler(c.req.raw));

  const requireUser = async (c: Context): Promise<AccountUser | null> => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) {
      return null;
    }
    return session.user as unknown as AccountUser;
  };

  const isMember = async (
    crewId: string,
    accountId: string,
  ): Promise<boolean> => {
    const rows = await db
      .select()
      .from(crewMembers)
      .where(
        and(
          eq(crewMembers.crewId, crewId),
          eq(crewMembers.accountId, accountId),
        ),
      );
    return rows.length > 0;
  };

  const findMyInhabitantId = async (
    crewId: string,
    accountId: string,
  ): Promise<string | null> => {
    const rows = await db
      .select({ id: inhabitants.id })
      .from(inhabitants)
      .where(
        and(
          eq(inhabitants.crewId, crewId),
          eq(inhabitants.accountId, accountId),
        ),
      );
    return rows[0]?.id ?? null;
  };

  const isHost = async (
    crewId: string,
    accountId: string,
  ): Promise<boolean> => {
    const crew = world.crew(crewId);
    if (!crew) {
      return false;
    }
    const [host] = await db
      .select({ accountId: inhabitants.accountId })
      .from(inhabitants)
      .where(eq(inhabitants.id, crew.hostId));
    return host?.accountId === accountId;
  };

  const hostGate = async (
    c: Context,
    crewId: string,
  ): Promise<Response | null> => {
    const user = c.get("user");
    if (!(await isMember(crewId, user.id))) {
      return c.json({ error: "not found" }, 404);
    }
    if (!(await isHost(crewId, user.id))) {
      return c.json({ error: "only the host manages invites" }, 403);
    }
    return null;
  };

  const resolveInvite = async (
    token: string,
  ): Promise<{ invite: Invite; crew: CrewState } | null> => {
    const invite = await findInviteByToken(token);
    const crew = invite ? world.crew(invite.crewId) : undefined;
    if (!invite || !crew) {
      return null;
    }
    return { invite, crew };
  };

  const broadcastEvents = (crewId: string, events: WorldEvent[]): void => {
    for (const event of events) {
      hub.broadcast(crewId, JSON.stringify({ type: "event", event }));
    }
  };

  app.use("/api/crews/*", async (c, next) => {
    const user = await requireUser(c);
    if (!user) {
      return c.json({ error: "unauthorized" }, 401);
    }
    c.set("user", user);
    await next();
  });

  app.get("/api/crews", async (c) => {
    const user = c.get("user");
    const rows = await db
      .select()
      .from(crewMembers)
      .where(eq(crewMembers.accountId, user.id));
    const crews = [];
    for (const row of rows) {
      const crew = world.crew(row.crewId);
      if (crew) {
        crews.push({ id: crew.id, name: crew.name, mapType: crew.map.type });
      }
    }
    return c.json({ crews });
  });

  app.post("/api/crews", async (c) => {
    const user = c.get("user");
    const body = (await c.req.json().catch(() => null)) as {
      name?: unknown;
      mapType?: unknown;
    } | null;
    if (
      !body ||
      typeof body.name !== "string" ||
      typeof body.mapType !== "string"
    ) {
      return c.json({ error: "name and mapType are required" }, 400);
    }
    const crewId = crypto.randomUUID();
    const hostId = crypto.randomUUID();
    try {
      world.apply({
        type: "crew/create",
        crewId,
        name: body.name,
        mapType: body.mapType as "office" | "house",
        host: { id: hostId, name: user.name, avatarId: user.avatarId },
      });
    } catch (err) {
      if (err instanceof WorldError) {
        return c.json({ error: err.message }, 400);
      }
      throw err;
    }
    const crew = world.crew(crewId);
    if (!crew) {
      return c.json({ error: "internal error" }, 500);
    }
    await persistCrewCreation(crew, user.id);
    return c.json({ crew }, 201);
  });

  app.get("/api/crews/:id", async (c) => {
    const user = c.get("user");
    const crewId = c.req.param("id");
    const crew = world.crew(crewId);
    const member = await isMember(crewId, user.id);
    if (!crew || !member) {
      return c.json({ error: "not found" }, 404);
    }
    const myInhabitantId = await findMyInhabitantId(crewId, user.id);
    return c.json({ crew, myInhabitantId });
  });

  app.get("/api/crews/:id/invites", async (c) => {
    const crewId = c.req.param("id");
    const denied = await hostGate(c, crewId);
    if (denied) {
      return denied;
    }
    return c.json({ invites: await listInvites(crewId) });
  });

  app.post("/api/crews/:id/invites", async (c) => {
    const crewId = c.req.param("id");
    const denied = await hostGate(c, crewId);
    if (denied) {
      return denied;
    }
    const user = c.get("user");
    return c.json({ invite: await createInvite(crewId, user.id) }, 201);
  });

  app.delete("/api/crews/:id/invites/:inviteId", async (c) => {
    const crewId = c.req.param("id");
    const denied = await hostGate(c, crewId);
    if (denied) {
      return denied;
    }
    const invite = await revokeInvite(crewId, c.req.param("inviteId"));
    if (!invite) {
      return c.json({ error: "invite not found" }, 404);
    }
    return c.body(null, 204);
  });

  app.get("/api/invites/:token", async (c) => {
    const resolved = await resolveInvite(c.req.param("token"));
    if (!resolved) {
      return c.json({ error: "invite not found" }, 404);
    }
    return c.json({
      crewId: resolved.crew.id,
      crewName: resolved.crew.name,
      active: resolved.invite.revokedAt === null,
    });
  });

  app.post("/api/invites/:token/join", async (c) => {
    const user = await requireUser(c);
    if (!user) {
      return c.json({ error: "unauthorized" }, 401);
    }
    const resolved = await resolveInvite(c.req.param("token"));
    if (!resolved) {
      return c.json({ error: "invite not found" }, 404);
    }
    const { invite, crew } = resolved;
    if (invite.revokedAt) {
      return c.json({ error: "invite has been revoked" }, 400);
    }
    if (await isMember(crew.id, user.id)) {
      return c.json({ error: "you are already a member of this crew" }, 400);
    }
    const inhabitantId = crypto.randomUUID();
    let events: WorldEvent[];
    try {
      events = world.apply({
        type: "inhabitant/join",
        crewId: crew.id,
        inhabitant: {
          id: inhabitantId,
          name: user.name,
          kind: "human",
          avatarId: user.avatarId,
        },
      });
    } catch (err) {
      if (err instanceof WorldError) {
        return c.json({ error: err.message }, 400);
      }
      throw err;
    }
    const joinedCrew = world.crew(crew.id);
    const inhabitant = joinedCrew?.inhabitants.find(
      (i) => i.id === inhabitantId,
    );
    if (!joinedCrew || !inhabitant) {
      return c.json({ error: "internal error" }, 500);
    }
    try {
      await persistInhabitantJoin(crew.id, inhabitant, user.id);
    } catch (err) {
      console.error("failed to persist inhabitant join", err);
      world.apply({
        type: "inhabitant/leave",
        crewId: crew.id,
        inhabitantId,
      });
      return c.json({ error: "internal error" }, 500);
    }
    broadcastEvents(crew.id, events);
    return c.json({ crew: joinedCrew, myInhabitantId: inhabitantId });
  });

  app.get(
    "/ws",
    nodeWs.upgradeWebSocket(async (c) => {
      if (!wsOriginAllowed(c.req.header("origin"), c.req.header("host"))) {
        return { onOpen: (_evt, ws) => ws.close(1008, "forbidden origin") };
      }
      const crewId = c.req.query("crew");
      const user = await requireUser(c);
      if (!crewId || !user) {
        return { onOpen: (_evt, ws) => ws.close(1008, "unauthorized") };
      }
      const crew = world.crew(crewId);
      const member = await isMember(crewId, user.id);
      if (!crew || !member) {
        return { onOpen: (_evt, ws) => ws.close(1008, "forbidden") };
      }
      const myInhabitantId = await findMyInhabitantId(crewId, user.id);
      if (!myInhabitantId) {
        return { onOpen: (_evt, ws) => ws.close(1011, "no inhabitant") };
      }

      return {
        onOpen(_evt, ws) {
          hub.add(crewId, ws);
          const current = world.crew(crewId);
          if (current) {
            ws.send(
              JSON.stringify({
                type: "snapshot",
                crew: current,
                myInhabitantId,
              }),
            );
          }
        },
        onMessage: async (evt, ws) => {
          let msg: unknown;
          try {
            msg = JSON.parse(String(evt.data));
          } catch {
            return;
          }
          if (typeof msg !== "object" || msg === null) {
            return;
          }
          const { type, command } = msg as {
            type?: unknown;
            command?: unknown;
          };
          if (
            type !== "command" ||
            typeof command !== "object" ||
            command === null
          ) {
            return;
          }
          const cmd = command as Command;
          if (
            cmd.type !== "inhabitant/move" ||
            cmd.inhabitantId !== myInhabitantId
          ) {
            return;
          }
          const position = cmd.position;
          if (
            typeof position?.x !== "number" ||
            typeof position?.y !== "number" ||
            !Number.isFinite(position.x) ||
            !Number.isFinite(position.y)
          ) {
            return;
          }
          try {
            const events: WorldEvent[] = world.apply({
              type: "inhabitant/move",
              crewId,
              inhabitantId: myInhabitantId,
              position: { x: position.x, y: position.y },
            });
            const current = world.crew(crewId);
            const me = current?.inhabitants.find(
              (i) => i.id === myInhabitantId,
            );
            if (me) {
              await persistInhabitantMove(me);
            }
            broadcastEvents(crewId, events);
          } catch (err) {
            if (err instanceof WorldError) {
              ws.send(JSON.stringify({ type: "error", error: err.message }));
            } else {
              console.error("failed to apply move", err);
            }
          }
        },
        onClose(_evt, ws) {
          hub.remove(crewId, ws);
        },
      };
    }),
  );

  const clientDist = fileURLToPath(
    new URL("../../client/dist", import.meta.url),
  );
  app.get("*", async (c) => {
    const rel = normalize(c.req.path).replace(/^[/\\]+/, "");
    const file = join(clientDist, rel === "" ? "index.html" : rel);
    if (!file.startsWith(clientDist)) {
      return c.text("forbidden", 403);
    }
    try {
      const data = await readFile(file);
      return c.body(new Uint8Array(data), 200, {
        "content-type": MIME[extname(file)] ?? "application/octet-stream",
      });
    } catch {
      try {
        const index = await readFile(join(clientDist, "index.html"));
        return c.body(new Uint8Array(index), 200, {
          "content-type": MIME[".html"] ?? "text/html; charset=utf-8",
        });
      } catch {
        return c.text(
          "client not built — run `pnpm --filter @the-crew/client build`",
          503,
        );
      }
    }
  });
}
