import type { CrewState, WorldEvent } from "@the-crew/world-core";
import { describe, expect, it } from "vitest";
import { createWorldStore } from "../src/store.js";

function makeCrew(overrides: Partial<CrewState> = {}): CrewState {
  return {
    id: "crew-1",
    name: "The Office",
    map: {
      type: "office",
      width: 1000,
      height: 600,
      rooms: [
        {
          id: "meeting-room",
          name: "Meeting Room",
          type: "meeting",
          rect: { x: 0, y: 0, w: 320, h: 260 },
        },
        {
          id: "hallway",
          name: "Hallway",
          type: "hallway",
          rect: { x: 0, y: 260, w: 1000, h: 80 },
        },
      ],
    },
    hostId: "hum-1",
    inhabitants: [
      {
        id: "hum-1",
        name: "Marcel",
        kind: "human",
        avatarId: "coral",
        position: { x: 500, y: 300 },
        room: "hallway",
      },
    ],
    ...overrides,
  };
}

const meetingRoom = makeCrew().map.rooms[0]!;
const hallway = makeCrew().map.rooms[1]!;

describe("world store", () => {
  it("starts empty", () => {
    const store = createWorldStore();
    const s = store.getState();
    expect(s.user).toBeUndefined();
    expect(s.crews).toEqual([]);
    expect(s.crew).toBeNull();
    expect(s.myInhabitantId).toBeNull();
    expect(s.connected).toBe(false);
  });

  it("applies a snapshot", () => {
    const store = createWorldStore();
    const crew = makeCrew();
    store.getState().applySnapshot(crew, "hum-1");
    const s = store.getState();
    expect(s.crew).toEqual(crew);
    expect(s.myInhabitantId).toBe("hum-1");
  });

  it("updates position on inhabitant/moved", () => {
    const store = createWorldStore();
    store.getState().applySnapshot(makeCrew(), "hum-1");
    store.getState().applyEvent({
      type: "inhabitant/moved",
      crewId: "crew-1",
      inhabitantId: "hum-1",
      position: { x: 100, y: 100 },
    });
    expect(store.getState().crew!.inhabitants[0]!.position).toEqual({
      x: 100,
      y: 100,
    });
  });

  it("sets the room on room/entered", () => {
    const store = createWorldStore();
    store.getState().applySnapshot(makeCrew(), "hum-1");
    store.getState().applyEvent({
      type: "room/entered",
      crewId: "crew-1",
      inhabitantId: "hum-1",
      room: meetingRoom,
    });
    expect(store.getState().crew!.inhabitants[0]!.room).toBe("meeting-room");
  });

  it("clears the room on room/left", () => {
    const store = createWorldStore();
    store.getState().applySnapshot(makeCrew(), "hum-1");
    store.getState().applyEvent({
      type: "room/left",
      crewId: "crew-1",
      inhabitantId: "hum-1",
      room: hallway,
    });
    expect(store.getState().crew!.inhabitants[0]!.room).toBeNull();
  });

  it("applies a full room crossing sequence", () => {
    const store = createWorldStore();
    store.getState().applySnapshot(makeCrew(), "hum-1");
    const events: WorldEvent[] = [
      {
        type: "room/left",
        crewId: "crew-1",
        inhabitantId: "hum-1",
        room: hallway,
      },
      {
        type: "inhabitant/moved",
        crewId: "crew-1",
        inhabitantId: "hum-1",
        position: { x: 100, y: 100 },
      },
      {
        type: "room/entered",
        crewId: "crew-1",
        inhabitantId: "hum-1",
        room: meetingRoom,
      },
    ];
    for (const event of events) {
      store.getState().applyEvent(event);
    }
    const me = store.getState().crew!.inhabitants[0]!;
    expect(me.position).toEqual({ x: 100, y: 100 });
    expect(me.room).toBe("meeting-room");
  });

  it("adds an inhabitant on inhabitant/joined", () => {
    const store = createWorldStore();
    store.getState().applySnapshot(makeCrew(), "hum-1");
    store.getState().applyEvent({
      type: "inhabitant/joined",
      crewId: "crew-1",
      inhabitant: {
        id: "hum-2",
        name: "Ada",
        kind: "human",
        avatarId: "mint",
        position: { x: 500, y: 300 },
        room: "hallway",
      },
    });
    const inhabitants = store.getState().crew!.inhabitants;
    expect(inhabitants).toHaveLength(2);
    expect(inhabitants[1]).toMatchObject({
      id: "hum-2",
      name: "Ada",
      room: "hallway",
    });
  });

  it("ignores a duplicate inhabitant/joined", () => {
    const store = createWorldStore();
    store.getState().applySnapshot(makeCrew(), "hum-1");
    store.getState().applyEvent({
      type: "inhabitant/joined",
      crewId: "crew-1",
      inhabitant: {
        id: "hum-1",
        name: "Marcel",
        kind: "human",
        avatarId: "coral",
        position: { x: 500, y: 300 },
        room: "hallway",
      },
    });
    expect(store.getState().crew!.inhabitants).toHaveLength(1);
  });

  it("removes an inhabitant on inhabitant/left", () => {
    const store = createWorldStore();
    store.getState().applySnapshot(makeCrew(), "hum-1");
    store.getState().applyEvent({
      type: "inhabitant/left",
      crewId: "crew-1",
      inhabitantId: "hum-1",
    });
    expect(store.getState().crew!.inhabitants).toHaveLength(0);
  });

  it("initializes the crew on crew/created", () => {
    const store = createWorldStore();
    const crew = makeCrew();
    store.getState().applyEvent({
      type: "crew/created",
      crewId: crew.id,
      name: crew.name,
      map: crew.map,
      hostId: crew.hostId,
    });
    const s = store.getState();
    expect(s.crew).toMatchObject({
      id: "crew-1",
      name: "The Office",
      hostId: "hum-1",
    });
    expect(s.crew!.map).toEqual(crew.map);
    expect(s.crew!.inhabitants).toEqual([]);
  });

  it("ignores events before a snapshot", () => {
    const store = createWorldStore();
    store.getState().applyEvent({
      type: "inhabitant/moved",
      crewId: "crew-1",
      inhabitantId: "hum-1",
      position: { x: 1, y: 2 },
    });
    expect(store.getState().crew).toBeNull();
  });

  it("ignores events for unknown inhabitants", () => {
    const store = createWorldStore();
    const before = makeCrew();
    store.getState().applySnapshot(before, "hum-1");
    store.getState().applyEvent({
      type: "inhabitant/moved",
      crewId: "crew-1",
      inhabitantId: "ghost",
      position: { x: 1, y: 2 },
    });
    expect(store.getState().crew!.inhabitants).toEqual(before.inhabitants);
  });

  it("leaveCrew clears the crew state", () => {
    const store = createWorldStore();
    store.getState().applySnapshot(makeCrew(), "hum-1");
    store.getState().setConnected(true);
    store.getState().leaveCrew();
    const s = store.getState();
    expect(s.crew).toBeNull();
    expect(s.myInhabitantId).toBeNull();
    expect(s.connected).toBe(false);
  });

  it("tracks user and crews", () => {
    const store = createWorldStore();
    store.getState().setUser({
      id: "u1",
      name: "Marcel",
      email: "m@example.com",
      avatarId: "coral",
    });
    store
      .getState()
      .setCrews([{ id: "crew-1", name: "The Office", mapType: "office" }]);
    const s = store.getState();
    expect(s.user).toMatchObject({ id: "u1", avatarId: "coral" });
    expect(s.crews).toHaveLength(1);
  });
});
