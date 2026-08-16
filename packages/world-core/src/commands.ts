import type {
  CrewId,
  CrewState,
  InhabitantId,
  InhabitantKind,
  MapState,
  MapType,
  Room,
  Vec2,
} from "./types.js";

export type Command =
  | {
      type: "crew/create";
      crewId: CrewId;
      name: string;
      mapType: MapType;
      host: { id: InhabitantId; name: string; avatarId: string };
    }
  | {
      type: "inhabitant/join";
      crewId: CrewId;
      inhabitant: {
        id: InhabitantId;
        name: string;
        kind: InhabitantKind;
        avatarId: string;
        position?: Vec2;
      };
    }
  | {
      type: "inhabitant/move";
      crewId: CrewId;
      inhabitantId: InhabitantId;
      position: Vec2;
    }
  | {
      type: "inhabitant/leave";
      crewId: CrewId;
      inhabitantId: InhabitantId;
    };

export type WorldEvent =
  | {
      type: "crew/created";
      crewId: CrewId;
      name: string;
      map: MapState;
      hostId: InhabitantId;
    }
  | { type: "inhabitant/joined"; crewId: CrewId; inhabitant: InhabitantJoined }
  | { type: "inhabitant/left"; crewId: CrewId; inhabitantId: InhabitantId }
  | { type: "inhabitant/moved"; crewId: CrewId; inhabitantId: InhabitantId; position: Vec2 }
  | { type: "room/entered"; crewId: CrewId; inhabitantId: InhabitantId; room: Room }
  | { type: "room/left"; crewId: CrewId; inhabitantId: InhabitantId; room: Room };

export interface InhabitantJoined {
  id: InhabitantId;
  name: string;
  kind: InhabitantKind;
  avatarId: string;
  position: Vec2;
  room: string | null;
}

export type { CrewState };
