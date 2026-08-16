export type CrewId = string;
export type InhabitantId = string;
export type RoomId = string;

export type MapType = "office" | "house";

export type RoomType =
  | "meeting"
  | "office"
  | "kitchen"
  | "lounge"
  | "hallway"
  | "storage";

export interface Vec2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Room {
  id: RoomId;
  name: string;
  type: RoomType;
  rect: Rect;
}

export interface MapState {
  type: MapType;
  width: number;
  height: number;
  rooms: Room[];
}

export type InhabitantKind = "human" | "agent";

export interface InhabitantState {
  id: InhabitantId;
  name: string;
  kind: InhabitantKind;
  avatarId: string;
  position: Vec2;
  room: RoomId | null;
}

export interface CrewState {
  id: CrewId;
  name: string;
  map: MapState;
  hostId: InhabitantId;
  inhabitants: InhabitantState[];
}

export interface WorldState {
  crews: CrewState[];
}
