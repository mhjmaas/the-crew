# Agents act only inside a sandbox

Any work an Agent performs beyond chat — future tool use triggered by a conversation — runs in a Sandbox. Agents never act on the host outside their sandbox.

**Why**: the-crew is self-hosted, often on a personal machine; an Agent with a personality and autonomy that can execute work needs a hard safety boundary. This is a deliberate constraint, not an oversight — do not "convenience" Agents onto the host.
