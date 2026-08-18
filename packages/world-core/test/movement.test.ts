import { describe, expect, it } from "vitest";
import { AVATARS, World, WorldError } from "../src/index.js";

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

describe("inhabitant/move", () => {
  it("updates the position and emits a movement event", () => {
    const world = seededWorld();
    const events = world.apply({
      type: "inhabitant/move",
      crewId: "crew-1",
      inhabitantId: "hum-1",
      position: { x: 100, y: 300 },
    });

    const me = world.crew("crew-1")!.inhabitants[0]!;
    expect(me.position).toEqual({ x: 100, y: 300 });
    expect(events).toEqual([
      {
        type: "inhabitant/moved",
        crewId: "crew-1",
        inhabitantId: "hum-1",
        position: { x: 100, y: 300 },
      },
    ]);
  });

  it("emits room/left and room/entered when crossing into another room", () => {
    const world = seededWorld();
    const map = world.crew("crew-1")!.map;
    const meetingRoom = map.rooms.find((r) => r.type === "meeting")!;
    const start = world.crew("crew-1")!.inhabitants[0]!;
    const startRoom = start.room!;

    const target = { x: meetingRoom.rect.x + 5, y: meetingRoom.rect.y + 5 };
    const events = world.apply({
      type: "inhabitant/move",
      crewId: "crew-1",
      inhabitantId: "hum-1",
      position: target,
    });

    const me = world.crew("crew-1")!.inhabitants[0]!;
    expect(me.room).toBe(meetingRoom.id);

    expect(events.map((e) => e.type)).toEqual([
      "room/left",
      "inhabitant/moved",
      "room/entered",
    ]);
    expect(events[0]).toMatchObject({
      type: "room/left",
      room: { id: startRoom },
    });
    expect(events[2]).toMatchObject({
      type: "room/entered",
      room: { id: meetingRoom.id },
    });
  });

  it("keeps the room when moving within it", () => {
    const world = seededWorld();
    const map = world.crew("crew-1")!.map;
    const meetingRoom = map.rooms.find((r) => r.type === "meeting")!;
    world.apply({
      type: "inhabitant/move",
      crewId: "crew-1",
      inhabitantId: "hum-1",
      position: { x: meetingRoom.rect.x + 5, y: meetingRoom.rect.y + 5 },
    });

    const events = world.apply({
      type: "inhabitant/move",
      crewId: "crew-1",
      inhabitantId: "hum-1",
      position: { x: meetingRoom.rect.x + 20, y: meetingRoom.rect.y + 20 },
    });

    expect(events.map((e) => e.type)).toEqual(["inhabitant/moved"]);
    expect(world.crew("crew-1")!.inhabitants[0]!.room).toBe(meetingRoom.id);
  });

  it("clamps positions to the map bounds", () => {
    const world = seededWorld();
    const map = world.crew("crew-1")!.map;
    const events = world.apply({
      type: "inhabitant/move",
      crewId: "crew-1",
      inhabitantId: "hum-1",
      position: { x: -50, y: map.height + 50 },
    });

    const me = world.crew("crew-1")!.inhabitants[0]!;
    expect(me.position).toEqual({ x: 0, y: map.height });
    const moved = events.find((e) => e.type === "inhabitant/moved");
    expect(moved).toMatchObject({
      type: "inhabitant/moved",
      position: { x: 0, y: map.height },
    });
  });

  it("rejects moving in an unknown crew or an unknown inhabitant", () => {
    const world = seededWorld();
    expect(() =>
      world.apply({
        type: "inhabitant/move",
        crewId: "nope",
        inhabitantId: "hum-1",
        position: { x: 1, y: 1 },
      }),
    ).toThrowError(WorldError);
    expect(() =>
      world.apply({
        type: "inhabitant/move",
        crewId: "crew-1",
        inhabitantId: "nope",
        position: { x: 1, y: 1 },
      }),
    ).toThrowError(WorldError);
  });
});
