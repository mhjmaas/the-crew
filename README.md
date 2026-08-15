# the-crew

A self-hosted shared space where humans and AI agents live, work, and hang out side by side — from a crew of five friends to a digital office.

## What is the-crew?

the-crew is a self-hosted application that creates a shared, persistent, spatial environment — a **Map** — where **Humans** and AI **Agents** inhabit the same space. It mimics real-life offices, homes, and other habitats: there are rooms to be in, conversations that form around you, and agents with personalities and jobs who live there alongside you.

The same product works for a crew of friends who want to hang out and for a digital office where agents do real work.

## The world

- A **Crew** is a group of Humans and Agents that meets in a Map. A Human creates (hosts) a Crew and picks its Map: an **office** or a **house** (built-in templates for the MVP).
- A **Map** is a literal spatial scene, rendered 2D top-down (Gather-style): rooms with positioned avatars.
- **Rooms** carry typed metadata (meeting room, kitchen, office…). A **Meeting room** runs one room-wide conversation, with its roster visible to the whole Crew.

## Inhabitants

- **Humans** sign up on the self-hosted server and join Crews via invite link. One **Account** can be linked to multiple Crews — a family Crew and a work Crew.
- **Agents** are created with an LLM (any OpenAI-compatible endpoint — local or cloud), an **Avatar**, a personality, and a **Job** (e.g. music curator, office assistant).
- Agents are **semi-ambient**: they respond when addressed, keep an eye on their room, and lean more ambient in home Maps and more restrained in work Maps. When all Humans leave, Agents finish what they're doing and go dormant; the Map's state persists.
- **Statuses**: Humans set available, busy, away, or do-not-disturb (DND blocks others from initiating a conversation with them). Agents show what they're doing — working, cooking, tidying — or available.

## Conversation

Chat is spatial. A **Conversation** forms automatically when inhabitants come within a fixed distance of each other:

- Outside range, you only see a signal that a conversation is happening.
- In range, you're joined automatically — without history, unless an existing member allows it.
- Walking out of proximity leaves the conversation.
- Dissolved conversations persist as **records** — the Crew's shared memory.

## What Agents can do

- **Actions** in the space: suggest music, toggle lights, tidy clutter.
- **Tasks** are chat-directed: ask an Agent for something in a conversation, it does it and reports back.
- Future tool use happens in a **Sandbox** — Agents never act on the host outside their sandbox.

## MVP scope

- Crew creation with a built-in office or house Map
- Accounts + invite links, one Account across multiple Crews
- 2D spatial Map with Rooms and Meeting rooms
- Proximity conversations with history gating
- Agent creation (LLM, Avatar, personality, Job)
- Semi-ambient Agents, statuses, and the MVP action set
- Persistent conversation records

## Deferred

Video calling · whiteboards · 3D rendering · multiple Maps per Crew · community Maps and a Map editor · fully ambient Agents · a task system · general (sandboxed) tool use · Agent-to-Agent life · browsing conversation records

## Status

Early design phase — the domain model and MVP scope are settled; implementation has not started.

## License

[Apache-2.0](LICENSE)
