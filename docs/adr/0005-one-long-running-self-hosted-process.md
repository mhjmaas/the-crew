# One long-running self-hosted process

the-crew runs as a single long-running Node process in a single container, serving the static client, the HTTP API, WebSocket sync, and the agent runtime. One server hosts the backend; clients on other machines connect to it. No serverless.

**Considered options**: serverless functions (Vercel/Cloudflare) to avoid a dedicated backend; a separate worker process for the agent runtime.

**Why**: self-hosting is the core promise — users run the-crew on their own machines, and a serverless platform would mean hosting Crews on a cloud vendor's platform. WebSockets are long-lived connections, which run into serverless execution-time limits, and the agent runtime needs a persistent scheduler (awareness ticks, dormancy transitions), not request-driven invocations. A separate worker is unnecessary: LLM calls via the Vercel AI SDK are I/O-bound and do not block the event loop.

**Consequences**: the server binds to the network and serves concurrent clients from multiple machines; deployment is one app container plus a Postgres sidecar; the agent-runtime package is imported into the server process rather than running beside it.
