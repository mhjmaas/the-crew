import { WorldError } from "./errors.js";
import type { MapState, Room, RoomType } from "./types.js";

interface RoomSpec {
  id: string;
  name: string;
  type: RoomType;
  rect: { x: number; y: number; w: number; h: number };
}

const OFFICE_ROOMS: readonly RoomSpec[] = [
  {
    id: "meeting-room",
    name: "Meeting Room",
    type: "meeting",
    rect: { x: 0, y: 0, w: 320, h: 260 },
  },
  {
    id: "office-a",
    name: "Office A",
    type: "office",
    rect: { x: 320, y: 0, w: 220, h: 260 },
  },
  {
    id: "office-b",
    name: "Office B",
    type: "office",
    rect: { x: 540, y: 0, w: 220, h: 260 },
  },
  {
    id: "kitchen",
    name: "Kitchen",
    type: "kitchen",
    rect: { x: 760, y: 0, w: 240, h: 260 },
  },
  {
    id: "hallway",
    name: "Hallway",
    type: "hallway",
    rect: { x: 0, y: 260, w: 1000, h: 80 },
  },
  {
    id: "lounge",
    name: "Lounge",
    type: "lounge",
    rect: { x: 0, y: 340, w: 340, h: 260 },
  },
  {
    id: "open-office",
    name: "Open Office",
    type: "office",
    rect: { x: 340, y: 340, w: 360, h: 260 },
  },
  {
    id: "storage",
    name: "Storage",
    type: "storage",
    rect: { x: 700, y: 340, w: 300, h: 260 },
  },
];

const TEMPLATES: Partial<Record<string, () => MapState>> = {
  office: () => ({
    type: "office",
    width: 1000,
    height: 600,
    rooms: OFFICE_ROOMS.map((r) => ({ ...r, rect: { ...r.rect } })) as Room[],
  }),
};

export function getMapTemplate(mapType: string): MapState {
  const build = TEMPLATES[mapType];
  if (!build) {
    throw new WorldError(
      "map-type/unavailable",
      `map type not available yet: ${mapType}`,
    );
  }
  return build();
}

export function roomAt(map: MapState, x: number, y: number): Room | undefined {
  return map.rooms.find((room) => {
    const { rect } = room;
    return (
      x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h
    );
  });
}

export function roomById(map: MapState, roomId: string): Room | undefined {
  return map.rooms.find((room) => room.id === roomId);
}

export function spawnPoint(map: MapState): { x: number; y: number } {
  const hallway = map.rooms.find((room) => room.type === "hallway");
  const origin = hallway
    ? {
        x: hallway.rect.x,
        y: hallway.rect.y,
        w: hallway.rect.w,
        h: hallway.rect.h,
      }
    : { x: 0, y: 0, w: map.width, h: map.height };
  return { x: origin.x + origin.w / 2, y: origin.y + origin.h / 2 };
}

export function clampToMap(
  map: MapState,
  x: number,
  y: number,
): { x: number; y: number } {
  return {
    x: Math.min(Math.max(x, 0), map.width),
    y: Math.min(Math.max(y, 0), map.height),
  };
}
