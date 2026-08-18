# Movement input is integrated client-side; the core stays clock-free

Moving an avatar (keyboard or pointer) could have been modelled as movement *intents* — e.g. `inhabitant/move-start {direction}` / `inhabitant/move-stop` — that the world core integrates over time. Instead, input is mapped to the existing `inhabitant/move` absolute-position command entirely on the client: held keys are integrated locally at the walk speed and sent as a steady stream of position commands at a fixed cadence while motion continues. The core remains a clock-free, deterministic state machine and stays the sole authority on positions — it clamps to the map and echoes `inhabitant/moved` to all clients.

**Considered options**: intent commands integrated by the core — rejected, it forces time into the core, changes the command contract for Agents, and buys nothing for remote clients, who would still receive discrete position updates at the core's tick rate and face the same smoothing problem.

**Consequences** — this is a contract for future avatar animation (pixelated humans with walk cycles, tracked separately):

- Every client renders from the same position event stream; no client renders locally predicted positions. Movement is eventually consistent, never divergent.
- The renderer never places an avatar at a raw event position — it eases toward the latest authoritative position — so no avatar teleports on any client, including on connect, reconnect, or catching up after lag.
- Sustained motion arrives as a stream of small steps (send cadence ~20 Hz, default); a single large step means a jump (click-to-move). Renderers tell "walking" from "jumped" by step size.
- Moving / idle / direction are derivable from the position stream alone, so a walk cycle is a renderer projection, not a new core concept.
- Walk speed and send cadence are tunable client constants.