import type http from "node:http";
import type { AddressInfo } from "node:net";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import WebSocket from "ws";
import { loadRootEnv, resetTestDatabase, testDatabases } from "./setup-db.js";

const env = loadRootEnv();
const databaseUrl = process.env.DATABASE_URL ?? env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set — put it in the root .env");
}
const { adminUrl, testDb, url: testUrl } = testDatabases(databaseUrl);

process.env.DATABASE_URL = testUrl;
process.env.BETTER_AUTH_SECRET =
  process.env.BETTER_AUTH_SECRET ?? env.BETTER_AUTH_SECRET ?? "test-only";

await resetTestDatabase(adminUrl, testDb);

const { db, sql } = await import("../src/db/index.js");
const { migrate } = await import("drizzle-orm/postgres-js/migrator");
const { AVATARS, World } = await import("@the-crew/world-core");
const { CrewHub } = await import("../src/hub.js");
const { setupApp } = await import("../src/app.js");
const { createAdaptorServer } = await import("@hono/node-server");
const { createNodeWebSocket } = await import("@hono/node-ws");
const { Hono } = await import("hono");

const world = new World();
const hub = new CrewHub();
let server: http.Server;
let base = "";
let wsBase = "";

beforeAll(async () => {
  const app = new Hono();
  const nodeWs = createNodeWebSocket({ app });
  setupApp(app, { world, hub, nodeWs });
  server = createAdaptorServer({ fetch: app.fetch });
  nodeWs.injectWebSocket(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  base = `http://127.0.0.1:${port}`;
  wsBase = `ws://127.0.0.1:${port}`;
  await migrate(db, {
    migrationsFolder: fileURLToPath(new URL("../drizzle", import.meta.url)),
  });
});

afterAll(async () => {
  for (const socket of openSockets) {
    socket.terminate();
  }
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await sql.end();
});

function cookieOf(res: Response): string {
  return res.headers.getSetCookie().join("; ");
}

async function call(
  path: string,
  init: RequestInit = {},
  cookie?: string,
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined) {
    headers.set("content-type", "application/json");
  }
  if (cookie) {
    headers.set("cookie", cookie);
  }
  return fetch(base + path, { ...init, headers });
}

async function signUp(
  name: string,
  email: string,
  avatarId: string,
): Promise<string> {
  const res = await call("/api/auth/sign-up/email", {
    method: "POST",
    body: JSON.stringify({ name, email, password: "supersecret1", avatarId }),
  });
  expect(res.status).toBe(200);
  return cookieOf(res);
}

async function createCrew(cookie: string, name: string): Promise<string> {
  const res = await call(
    "/api/crews",
    { method: "POST", body: JSON.stringify({ name, mapType: "office" }) },
    cookie,
  );
  expect(res.status).toBe(201);
  const body = (await res.json()) as { crew: { id: string } };
  return body.crew.id;
}

interface WsMessage {
  type: string;
  crew?: { inhabitants: { id: string }[] };
  myInhabitantId?: string | null;
  event?: {
    type: string;
    inhabitantId?: string;
    inhabitant?: { id: string };
    position?: { x: number; y: number };
  };
  error?: string;
}

interface WsClient {
  next(
    predicate: (message: WsMessage) => boolean,
    what: string,
  ): Promise<WsMessage>;
  send(data: unknown): void;
}

function openCrewSocket(cookie: string, crewId: string): Promise<WsClient> {
  const ws = new WebSocket(`${wsBase}/ws?crew=${encodeURIComponent(crewId)}`, {
    headers: { cookie },
  });
  const messages: WsMessage[] = [];
  const next = (
    predicate: (message: WsMessage) => boolean,
    what: string,
    timeoutMs = 5000,
  ): Promise<WsMessage> =>
    new Promise((resolve, reject) => {
      const startedAt = Date.now();
      const tick = () => {
        const index = messages.findIndex(predicate);
        if (index !== -1) {
          const [message] = messages.splice(index, 1);
          if (message) {
            resolve(message);
          }
          return;
        }
        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error(`timed out waiting for ${what}`));
          return;
        }
        setTimeout(tick, 10);
      };
      tick();
    });
  ws.on("message", (data) => {
    messages.push(JSON.parse(String(data)) as WsMessage);
  });
  return new Promise((resolve, reject) => {
    ws.on("open", () => {
      openSockets.push(ws);
      resolve({
        next,
        send: (data) => ws.send(JSON.stringify(data)),
      });
    });
    ws.on("error", reject);
  });
}

let hostCookie = "";
let memberCookie = "";
let crewId = "";
let inviteToken = "";
let memberInhabitantId = "";
const openSockets: WebSocket[] = [];

describe("invite links", () => {
  it("the host can generate an invite link and sees it listed", async () => {
    hostCookie = await signUp("Marcel", "host@example.com", AVATARS[0]!.id);
    crewId = await createCrew(hostCookie, "Test Crew");

    const created = await call(
      `/api/crews/${crewId}/invites`,
      { method: "POST" },
      hostCookie,
    );
    expect(created.status).toBe(201);
    const { invite } = (await created.json()) as {
      invite: { token: string; revokedAt: null };
    };
    inviteToken = invite.token;
    expect(invite.token.length).toBeGreaterThan(0);
    expect(invite.revokedAt).toBeNull();

    const list = await call(`/api/crews/${crewId}/invites`, {}, hostCookie);
    expect(list.status).toBe(200);
    const { invites } = (await list.json()) as {
      invites: { token: string; revokedAt: null }[];
    };
    expect(invites).toHaveLength(1);
    expect(invites[0]!.token).toBe(inviteToken);
  });

  it("the invite link resolves to the crew for anyone, signed in or not", async () => {
    const info = await call(`/api/invites/${inviteToken}`);
    expect(info.status).toBe(200);
    expect(await info.json()).toEqual({
      crewId,
      crewName: "Test Crew",
      active: true,
    });
    expect((await call("/api/invites/no-such-token")).status).toBe(404);
  });

  it("a non-member cannot manage a crew's invites", async () => {
    const strangerCookie = await signUp(
      "Stranger",
      "stranger@example.com",
      AVATARS[2]!.id,
    );
    expect(
      (
        await call(
          `/api/crews/${crewId}/invites`,
          { method: "POST" },
          strangerCookie,
        )
      ).status,
    ).toBe(404);
    expect(
      (await call(`/api/crews/${crewId}/invites`, {}, strangerCookie)).status,
    ).toBe(404);
  });

  it("joining requires a session", async () => {
    expect(
      (await call(`/api/invites/${inviteToken}/join`, { method: "POST" }))
        .status,
    ).toBe(401);
  });

  it("a signed-in human joins the crew via the invite link", async () => {
    memberCookie = await signUp("Ada", "member@example.com", AVATARS[1]!.id);
    const res = await call(
      `/api/invites/${inviteToken}/join`,
      { method: "POST" },
      memberCookie,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      crew: { inhabitants: { id: string; name: string }[] };
      myInhabitantId: string;
    };
    memberInhabitantId = body.myInhabitantId;
    expect(body.crew.inhabitants).toHaveLength(2);
    expect(body.crew.inhabitants.some((i) => i.id === memberInhabitantId)).toBe(
      true,
    );

    const worldCrew = world.crew(crewId);
    expect(worldCrew?.inhabitants).toHaveLength(2);

    const memberView = await call(`/api/crews/${crewId}`, {}, memberCookie);
    expect(memberView.status).toBe(200);
    const memberBody = (await memberView.json()) as {
      crew: { inhabitants: { id: string }[] };
      myInhabitantId: string;
    };
    expect(memberBody.myInhabitantId).toBe(memberInhabitantId);
    expect(memberBody.crew.inhabitants).toHaveLength(2);
  });

  it("joining is not repeatable and unknown tokens are rejected", async () => {
    expect(
      (
        await call(
          `/api/invites/${inviteToken}/join`,
          { method: "POST" },
          memberCookie,
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await call(
          "/api/invites/no-such-token/join",
          { method: "POST" },
          memberCookie,
        )
      ).status,
    ).toBe(404);
  });

  it("a non-host member cannot manage invites", async () => {
    expect(
      (
        await call(
          `/api/crews/${crewId}/invites`,
          { method: "POST" },
          memberCookie,
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await call(
          `/api/crews/${crewId}/invites/${"00000000-0000-0000-0000-000000000000"}`,
          { method: "DELETE" },
          memberCookie,
        )
      ).status,
    ).toBe(403);
  });

  it("the host can revoke an invite link and a revoked link no longer works", async () => {
    const list = await call(`/api/crews/${crewId}/invites`, {}, hostCookie);
    const { invites } = (await list.json()) as {
      invites: { id: string }[];
    };
    const inviteId = invites[0]!.id;

    expect(
      (
        await call(
          `/api/crews/${crewId}/invites/${inviteId}`,
          { method: "DELETE" },
          hostCookie,
        )
      ).status,
    ).toBe(204);

    const info = await call(`/api/invites/${inviteToken}`);
    expect(info.status).toBe(200);
    expect(await info.json()).toEqual({
      crewId,
      crewName: "Test Crew",
      active: false,
    });

    const thirdCookie = await signUp(
      "Grace",
      "third@example.com",
      AVATARS[3]!.id,
    );
    expect(
      (
        await call(
          `/api/invites/${inviteToken}/join`,
          { method: "POST" },
          thirdCookie,
        )
      ).status,
    ).toBe(400);
    expect(world.crew(crewId)?.inhabitants).toHaveLength(2);

    expect(
      (
        await call(
          `/api/crews/${crewId}/invites/${inviteId}`,
          { method: "DELETE" },
          hostCookie,
        )
      ).status,
    ).toBe(204);
    expect(
      (
        await call(
          `/api/crews/${crewId}/invites/${"00000000-0000-0000-0000-000000000000"}`,
          { method: "DELETE" },
          hostCookie,
        )
      ).status,
    ).toBe(404);
  });

  it("both humans see each other's avatars and positions update in real time", async () => {
    const crew2 = await createCrew(hostCookie, "Realtime Crew");
    const hostView = (await (
      await call(`/api/crews/${crew2}`, {}, hostCookie)
    ).json()) as { myInhabitantId: string };
    const hostId = hostView.myInhabitantId;

    const hostWs = await openCrewSocket(hostCookie, crew2);
    const hostSnapshot = await hostWs.next(
      (m) => m.type === "snapshot",
      "the host snapshot",
    );
    expect(hostSnapshot.myInhabitantId).toBe(hostId);
    expect(hostSnapshot.crew?.inhabitants).toHaveLength(1);

    const created = await call(
      `/api/crews/${crew2}/invites`,
      { method: "POST" },
      hostCookie,
    );
    const { invite } = (await created.json()) as {
      invite: { token: string };
    };

    const ada2Cookie = await signUp(
      "Ada Two",
      "ada2@example.com",
      AVATARS[1]!.id,
    );
    const join = (await (
      await call(
        `/api/invites/${invite.token}/join`,
        { method: "POST" },
        ada2Cookie,
      )
    ).json()) as { myInhabitantId: string };

    const joined = await hostWs.next(
      (m) =>
        m.type === "event" &&
        m.event?.type === "inhabitant/joined" &&
        m.event.inhabitant?.id === join.myInhabitantId,
      "the host to see the join in real time",
    );
    expect(joined.event?.inhabitant?.id).toBe(join.myInhabitantId);

    const memberWs = await openCrewSocket(ada2Cookie, crew2);
    const memberSnapshot = await memberWs.next(
      (m) => m.type === "snapshot",
      "the member snapshot",
    );
    expect(memberSnapshot.crew?.inhabitants).toHaveLength(2);

    const hostMove = { x: 120, y: 300 };
    hostWs.send({
      type: "command",
      command: {
        type: "inhabitant/move",
        crewId: crew2,
        inhabitantId: hostId,
        position: hostMove,
      },
    });
    const hostMoved = await memberWs.next(
      (m) =>
        m.type === "event" &&
        m.event?.type === "inhabitant/moved" &&
        m.event.inhabitantId === hostId,
      "the member to see the host move",
    );
    expect(hostMoved.event?.position).toEqual(hostMove);

    const memberMove = { x: 880, y: 310 };
    memberWs.send({
      type: "command",
      command: {
        type: "inhabitant/move",
        crewId: crew2,
        inhabitantId: join.myInhabitantId,
        position: memberMove,
      },
    });
    const memberMoved = await hostWs.next(
      (m) =>
        m.type === "event" &&
        m.event?.type === "inhabitant/moved" &&
        m.event.inhabitantId === join.myInhabitantId,
      "the host to see the member move",
    );
    expect(memberMoved.event?.position).toEqual(memberMove);
  });
});
