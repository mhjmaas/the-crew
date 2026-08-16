# Postgres for world state

World state (Accounts, Crews, membership, Maps, positions, Conversations, records, Statuses) is stored in Postgres.

**Considered options**: MongoDB (the original preference); SQLite for a zero-ops single-file deployment.

**Why**: the data is relational at its core — Account-to-Crew is many-to-many, and membership and invite links are classic joins, natural in Postgres and awkward in Mongo (references plus app-level joins). Mongo multi-document transactions require a replica set, an ops burden for a self-hosted single-container deployment, and the world core performs atomic transitions across multiple inhabitants (e.g. Conversation formation), so ACID matters.

**Consequences**: Postgres runs as a sidecar container next to the app. If a fully self-contained desktop mode (server bundled into the app) ever becomes a goal, this is the decision to revisit — SQLite would be far easier to bundle.
