import { describe, expect, it } from "vitest";
import { AVATARS, type MapType, World, WorldError } from "../src/index.js";

const host = { id: "hum-1", name: "Marcel", avatarId: AVATARS[0]!.id };

function createCrew(
  world: World,
  overrides: { name?: string; mapType?: MapType; host?: typeof host } = {},
) {
  return world.apply({
    type: "crew/create",
    crewId: "crew-1",
    name: "The Office",
    mapType: "office",
    host,
    ...overrides,
  });
}

describe("crew/create", () => {
  it("creates a crew whose host is an inhabitant in a room", () => {
    const world = new World();
    const events = createCrew(world);

    const crew = world.crew("crew-1");
    expect(crew).toBeDefined();
    expect(crew!.name).toBe("The Office");
    expect(crew!.hostId).toBe("hum-1");
    expect(crew!.inhabitants).toHaveLength(1);
    expect(crew!.inhabitants[0]).toMatchObject({
      id: "hum-1",
      name: "Marcel",
      kind: "human",
      avatarId: host.avatarId,
    });
    expect(crew!.inhabitants[0]!.room).not.toBeNull();

    expect(events.map((e) => e.type)).toEqual([
      "crew/created",
      "inhabitant/joined",
      "room/entered",
    ]);
  });

  it("builds an office map with named, typed rooms including a meeting room", () => {
    const world = new World();
    createCrew(world);

    const map = world.crew("crew-1")!.map;
    expect(map.type).toBe("office");
    expect(map.rooms.length).toBeGreaterThan(1);
    for (const room of map.rooms) {
      expect(room.name).toBeTruthy();
      expect(room.type).toBeTruthy();
    }
    expect(map.rooms.some((r) => r.type === "meeting")).toBe(true);
  });

  it("rejects a duplicate crew id", () => {
    const world = new World();
    createCrew(world);
    expect(() => createCrew(world)).toThrowError(WorldError);
  });

  it("rejects an empty crew name", () => {
    const world = new World();
    expect(() => createCrew(world, { name: "   " })).toThrowError(WorldError);
  });

  it("rejects an unavailable map type", () => {
    const world = new World();
    expect(() => createCrew(world, { mapType: "house" })).toThrowError(
      WorldError,
    );
  });

  it("rejects an unknown avatar", () => {
    const world = new World();
    expect(() =>
      createCrew(world, { host: { ...host, avatarId: "nope" } }),
    ).toThrowError(WorldError);
  });
});
