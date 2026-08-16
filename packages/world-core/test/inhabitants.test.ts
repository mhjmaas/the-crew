import { describe, it, expect } from "vitest";
import { World, WorldError, AVATARS } from "../src/index.js";

function seededWorld() {
  const world = new World();
  world.apply({
    type: "crew/create",
    crewId: "crew-1",
    name: "The Office",
    mapType: "office",
    host: { id: "hum-1", name: "Marcel", avatarId: AVATARS[0]!.id },
  });
  return world;
}

describe("inhabitant/join", () => {
  it("adds an inhabitant at the spawn point, inside a room", () => {
    const world = seededWorld();
    const events = world.apply({
      type: "inhabitant/join",
      crewId: "crew-1",
      inhabitant: { id: "hum-2", name: "Ana", kind: "human", avatarId: AVATARS[1]!.id },
    });

    const crew = world.crew("crew-1")!;
    expect(crew.inhabitants).toHaveLength(2);
    const ana = crew.inhabitants.find((i) => i.id === "hum-2")!;
    expect(ana.room).not.toBeNull();

    expect(events.map((e) => e.type)).toEqual(["inhabitant/joined", "room/entered"]);
  });

  it("honours an explicit join position", () => {
    const world = seededWorld();
    const map = world.crew("crew-1")!.map;
    const meetingRoom = map.rooms.find((r) => r.type === "meeting")!;
    const pos = { x: meetingRoom.rect.x + 10, y: meetingRoom.rect.y + 10 };

    world.apply({
      type: "inhabitant/join",
      crewId: "crew-1",
      inhabitant: { id: "hum-2", name: "Ana", kind: "human", avatarId: AVATARS[1]!.id, position: pos },
    });

    const ana = world.crew("crew-1")!.inhabitants.find((i) => i.id === "hum-2")!;
    expect(ana.position).toEqual(pos);
    expect(ana.room).toBe(meetingRoom.id);
  });

  it("rejects joining an unknown crew", () => {
    const world = seededWorld();
    expect(() =>
      world.apply({
        type: "inhabitant/join",
        crewId: "nope",
        inhabitant: { id: "hum-2", name: "Ana", kind: "human", avatarId: AVATARS[1]!.id },
      }),
    ).toThrowError(WorldError);
  });

  it("rejects a duplicate inhabitant in the same crew", () => {
    const world = seededWorld();
    expect(() =>
      world.apply({
        type: "inhabitant/join",
        crewId: "crew-1",
        inhabitant: { id: "hum-1", name: "Impostor", kind: "human", avatarId: AVATARS[1]!.id },
      }),
    ).toThrowError(WorldError);
  });
});

describe("inhabitant/leave", () => {
  it("removes the inhabitant and emits room/left then inhabitant/left", () => {
    const world = seededWorld();
    const events = world.apply({ type: "inhabitant/leave", crewId: "crew-1", inhabitantId: "hum-1" });

    expect(world.crew("crew-1")!.inhabitants).toHaveLength(0);
    expect(events.map((e) => e.type)).toEqual(["room/left", "inhabitant/left"]);
  });

  it("rejects leaving an unknown crew or inhabitant", () => {
    const world = seededWorld();
    expect(() => world.apply({ type: "inhabitant/leave", crewId: "nope", inhabitantId: "hum-1" })).toThrowError(
      WorldError,
    );
    expect(() => world.apply({ type: "inhabitant/leave", crewId: "crew-1", inhabitantId: "nope" })).toThrowError(
      WorldError,
    );
  });
});
