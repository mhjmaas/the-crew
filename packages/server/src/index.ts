import { Hono } from "hono";
import { createAdaptorServer } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { World } from "@the-crew/world-core";
import { setupApp } from "./app.js";
import { db } from "./db/index.js";
import { CrewHub } from "./hub.js";
import { hydrateWorld } from "./world-store.js";

const port = Number(process.env.PORT ?? 3000);

const world = new World();
const hub = new CrewHub();

const app = new Hono();
const nodeWs = createNodeWebSocket({ app });
setupApp(app, { world, hub, nodeWs });

await migrate(db, {
  migrationsFolder: fileURLToPath(new URL("../drizzle", import.meta.url)),
});
await hydrateWorld(world);

const server = createAdaptorServer({ fetch: app.fetch });
nodeWs.injectWebSocket(server);
server.listen(port, () => {
  console.log(`the-crew server listening on http://localhost:${port}`);
});
