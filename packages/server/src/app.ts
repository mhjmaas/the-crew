import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { Hono } from "hono";
import type { Context } from "hono";
import { cors } from "hono/cors";
import type { createNodeWebSocket } from "@hono/node-ws";
import { and, eq } from "drizzle-orm";
import { World, WorldError, type Command, type WorldEvent } from "@the-crew/world-core";
import { auth, type AccountUser } from "./auth.js";
import { db } from "./db/index.js";
import { crewMembers, inhabitants } from "./db/schema.js";
import type { CrewHub, WsConnection } from "./hub.js";
import {
  persistCrewCreation,
  persistInhabitantMove,
} from "./world-store.js";

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

export function setupApp(app: Hono, { world, hub, nodeWs }: AppDeps): void {
  app.use("/api/*", cors({ origin: "*", credentials: true }));

  app.all("/api/auth/*", (c) => auth.handler(c.req.raw));

  const requireUser = async (c: Context): Promise<AccountUser | null> => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) {
      return null;
    }
    return session.user as unknown as AccountUser;
  };

  const isMember = async (crewId: string, accountId: string): Promise<boolean> => {
    const rows = await db
      .select()
      .from(crewMembers)
      .where(and(eq(crewMembers.crewId, crewId), eq(crewMembers.accountId, accountId)));
    return rows.length > 0;
  };

  app.get("/api/crews", async (c) => {
    const user = await requireUser(c);
    if (!user) {
      return c.json({ error: "unauthorized" }, 401);
    }
    const rows = await db.select().from(crewMembers).where(eq(crewMembers.accountId, user.id));
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
    const user = await requireUser(c);
    if (!user) {
      return c.json({ error: "unauthorized" }, 401);
    }
    const body = (await c.req.json().catch(() => null)) as {
      name?: unknown;
      mapType?: unknown;
    } | null;
    if (!body || typeof body.name !== "string" || typeof body.mapType !== "string") {
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
    const user = await requireUser(c);
    if (!user) {
      return c.json({ error: "unauthorized" }, 401);
    }
    const crewId = c.req.param("id");
    const crew = world.crew(crewId);
    const member = await isMember(crewId, user.id);
    if (!crew || !member) {
      return c.json({ error: "not found" }, 404);
    }
    const myRows = await db
      .select({ id: inhabitants.id })
      .from(inhabitants)
      .where(and(eq(inhabitants.crewId, crewId), eq(inhabitants.accountId, user.id)));
    return c.json({ crew, myInhabitantId: myRows[0]?.id ?? null });
  });

  app.get("/ws", nodeWs.upgradeWebSocket(async (c) => {
    const crewId = c.req.query("crew");
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!crewId || !session?.user) {
      return { onOpen: (_evt, ws) => ws.close(1008, "unauthorized") };
    }
    const user = session.user as unknown as AccountUser;
    const crew = world.crew(crewId);
    const member = await isMember(crewId, user.id);
    if (!crew || !member) {
      return { onOpen: (_evt, ws) => ws.close(1008, "forbidden") };
    }
    const myRows = await db
      .select()
      .from(inhabitants)
      .where(and(eq(inhabitants.crewId, crewId), eq(inhabitants.accountId, user.id)));
    const myInhabitantId = myRows[0]?.id;
    if (!myInhabitantId) {
      return { onOpen: (_evt, ws) => ws.close(1011, "no inhabitant") };
    }

    return {
      onOpen(_evt, ws) {
        hub.add(crewId, ws);
        const current = world.crew(crewId);
        if (current) {
          ws.send(JSON.stringify({ type: "snapshot", crew: current, myInhabitantId }));
        }
      },
      onMessage(evt, ws) {
        let msg: unknown;
        try {
          msg = JSON.parse(String(evt.data));
        } catch {
          return;
        }
        if (typeof msg !== "object" || msg === null) {
          return;
        }
        const { type, command } = msg as { type?: unknown; command?: unknown };
        if (type !== "command" || typeof command !== "object" || command === null) {
          return;
        }
        const cmd = command as Command;
        if (cmd.type !== "inhabitant/move" || cmd.inhabitantId !== myInhabitantId) {
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
          const me = current?.inhabitants.find((i) => i.id === myInhabitantId);
          if (me) {
            void persistInhabitantMove(me);
          }
          for (const event of events) {
            hub.broadcast(crewId, JSON.stringify({ type: "event", event }));
          }
        } catch (err) {
          if (err instanceof WorldError) {
            ws.send(JSON.stringify({ type: "error", error: err.message }));
          }
        }
      },
      onClose(_evt, ws) {
        hub.remove(crewId, ws);
      },
    };
  }));

  const clientDist = fileURLToPath(new URL("../../client/dist", import.meta.url));
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
        return c.text("client not built — run `pnpm --filter @the-crew/client build`", 503);
      }
    }
  });
}
