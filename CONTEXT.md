# the-crew

A self-hosted shared environment where Humans and AI Agents inhabit the same space, communicate, and work together — from a crew of five friends hanging out to a digital office.

## The space

**Map**:
The shared environment a Crew inhabits, rendered as a literal spatial scene — rooms with positioned avatars, Gather-style. V1: one Map per Crew, type chosen at creation (office or house).
_Avoid_: location, world, space, room

**Room**:
A named area within a Map, classified by type in the Map's metadata (meeting room, kitchen, office…). An inhabitant can be in a Room.
_Avoid_: channel, area, zone

**Meeting room**:
A Room whose type in the Map's metadata marks it as dedicated to group conversation. It has one room-wide conversation, its roster is visible to the whole Crew, and entering joins the conversation immediately.
_Avoid_: channel, conference, huddle

**Conversation**:
A chat exchange formed automatically when inhabitants come within a fixed distance of each other; walking out of proximity leaves it. New joiners start without history unless an existing member allows it. Outside proximity, only a signal that a conversation is happening is visible.
_Avoid_: channel, thread, DM

**Conversation record**:
The retained history of a dissolved Conversation — the Crew's shared memory. No browsing UI in the MVP.
_Avoid_: log, transcript, archive

**Status**:
An inhabitant's presence indicator. Humans set available, busy, away, or do-not-disturb; do-not-disturb blocks others — Human or Agent — from initiating a conversation with them, but walking into a proximity still auto-joins. Agents show a derived activity (working, cooking, tidying…) or available.
_Avoid_: presence, mood

## Inhabitants

**Crew**:
A group of Humans and Agents that meets in a Map, created and hosted by one Human.
_Avoid_: team, group, workspace

**Human**:
A person who inhabits a Crew.
_Avoid_: user, member, player

**Account**:
A Human's identity on the self-hosted server; one Account can be linked to multiple Crews.
_Avoid_: user, profile, login

**Host**:
The Human who created a Crew.
_Avoid_: owner, admin

**Agent**:
An AI inhabitant of a Crew: an LLM (any provider, local or cloud) with an avatar, a personality, and a Job.
_Avoid_: bot, assistant, worker

**Job**:
The persistent role an Agent plays in a Crew (e.g. music curator, office assistant), expressed as part of its personality.
_Avoid_: role, task, position

**Aliveness**:
How proactively an Agent participates in its space, from on-demand (only when addressed) to fully ambient (freely joins conversations). MVP: semi-ambient — leaning ambient in home Maps, restrained in work Maps.
_Avoid_: autonomy, awareness

**Avatar**:
An inhabitant's visual representation in the Map, chosen from a built-in sprite set or a custom uploaded image.
_Avoid_: skin, character, sprite

**Action**:
An effect an Agent can produce in the space beyond chat. MVP set: suggest music, toggle lights, tidy clutter.
_Avoid_: tool, task, skill

**Sandbox**:
An isolated environment in which an Agent performs work (e.g. tool use triggered by a chat interaction). Agents never act on the host outside their Sandbox.
_Avoid_: container, jail, workspace
