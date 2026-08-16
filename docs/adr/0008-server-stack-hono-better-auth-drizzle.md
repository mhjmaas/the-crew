# Server stack: Hono, Better Auth, Drizzle

The server's outer layer is Hono, with `@hono/node-ws` for WebSocket upgrades, Better Auth for Accounts and sessions, and Drizzle as the Postgres query layer.

**Considered options**: Fastify or Express for the framework; socket.io for WebSockets; Auth.js, Lucia, or Keycloak/Ory for auth; Prisma for the query layer.

**Why**: Hono is TypeScript-first, minimal, and has first-class WebSocket support — it fits the everything-TypeScript requirement and the thin-outer-layer architecture. Better Auth is exactly the right size for the scoped auth (local sign-up, email/username + password, sessions) with no extra service to run — Keycloak/Ory would be a second service to operate, and Lucia would mean building the flows ourselves. Drizzle is a thin SQL layer that keeps the server thin: all rules live in the world core. socket.io's rooms and reconnect features are overkill for small crews.

**Consequences**: Better Auth's user and session concepts map onto the domain term Account; sessions must work for cross-origin desktop clients (ADR-0007).
