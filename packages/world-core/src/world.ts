import { getAvatar } from "./avatars.js";
import type { Command, WorldEvent } from "./commands.js";
import { WorldError } from "./errors.js";
import {
  clampToMap,
  getMapTemplate,
  roomAt,
  roomById,
  spawnPoint,
} from "./map.js";
import type {
  CrewState,
  InhabitantId,
  InhabitantState,
  RoomId,
  WorldState,
} from "./types.js";

export class World {
  private readonly crews = new Map<string, CrewState>();

  apply(command: Command): WorldEvent[] {
    switch (command.type) {
      case "crew/create":
        return this.createCrew(command);
      case "inhabitant/join":
        return this.joinInhabitant(command);
      case "inhabitant/move":
        return this.moveInhabitant(command);
      case "inhabitant/leave":
        return this.leaveInhabitant(command);
    }
  }

  state(): WorldState {
    return { crews: [...this.crews.values()] };
  }

  crew(crewId: string): CrewState | undefined {
    return this.crews.get(crewId);
  }

  private createCrew(
    command: Extract<Command, { type: "crew/create" }>,
  ): WorldEvent[] {
    if (this.crews.has(command.crewId)) {
      throw new WorldError(
        "crew/exists",
        `crew already exists: ${command.crewId}`,
      );
    }
    const name = command.name.trim();
    if (!name) {
      throw new WorldError("name/empty", "crew name must not be empty");
    }
    getAvatar(command.host.avatarId);
    const map = getMapTemplate(command.mapType);

    const crew: CrewState = {
      id: command.crewId,
      name,
      map,
      hostId: command.host.id,
      inhabitants: [],
    };
    this.crews.set(crew.id, crew);

    const events: WorldEvent[] = [
      {
        type: "crew/created",
        crewId: crew.id,
        name: crew.name,
        map: crew.map,
        hostId: crew.hostId,
      },
    ];
    events.push(
      ...this.addInhabitant(crew, {
        id: command.host.id,
        name: command.host.name,
        kind: "human",
        avatarId: command.host.avatarId,
      }),
    );
    return events;
  }

  private joinInhabitant(
    command: Extract<Command, { type: "inhabitant/join" }>,
  ): WorldEvent[] {
    const crew = this.requireCrew(command.crewId);
    return this.addInhabitant(crew, command.inhabitant);
  }

  private addInhabitant(
    crew: CrewState,
    spec: {
      id: string;
      name: string;
      kind: "human" | "agent";
      avatarId: string;
      position?: { x: number; y: number };
    },
  ): WorldEvent[] {
    if (crew.inhabitants.some((i) => i.id === spec.id)) {
      throw new WorldError(
        "inhabitant/exists",
        `inhabitant already in crew: ${spec.id}`,
      );
    }
    getAvatar(spec.avatarId);

    const position = spec.position
      ? clampToMap(crew.map, spec.position.x, spec.position.y)
      : spawnPoint(crew.map);
    const room = roomAt(crew.map, position.x, position.y);
    const inhabitant: InhabitantState = {
      id: spec.id,
      name: spec.name,
      kind: spec.kind,
      avatarId: spec.avatarId,
      position,
      room: room ? room.id : null,
    };
    crew.inhabitants.push(inhabitant);

    const events: WorldEvent[] = [
      {
        type: "inhabitant/joined",
        crewId: crew.id,
        inhabitant: {
          id: inhabitant.id,
          name: inhabitant.name,
          kind: inhabitant.kind,
          avatarId: inhabitant.avatarId,
          position: inhabitant.position,
          room: inhabitant.room,
        },
      },
    ];
    if (room) {
      events.push({
        type: "room/entered",
        crewId: crew.id,
        inhabitantId: inhabitant.id,
        room,
      });
    }
    return events;
  }

  private moveInhabitant(
    command: Extract<Command, { type: "inhabitant/move" }>,
  ): WorldEvent[] {
    const crew = this.requireCrew(command.crewId);
    const inhabitant = this.requireInhabitant(crew, command.inhabitantId);

    const position = clampToMap(
      crew.map,
      command.position.x,
      command.position.y,
    );
    const newRoom = roomAt(crew.map, position.x, position.y);
    const oldRoomId = inhabitant.room;

    const events: WorldEvent[] = [];
    if (oldRoomId && newRoom?.id !== oldRoomId) {
      const left = this.roomLeftEvent(crew, inhabitant.id, oldRoomId);
      if (left) {
        events.push(left);
      }
    }
    inhabitant.position = position;
    inhabitant.room = newRoom ? newRoom.id : null;
    events.push({
      type: "inhabitant/moved",
      crewId: crew.id,
      inhabitantId: inhabitant.id,
      position,
    });
    if (newRoom && newRoom.id !== oldRoomId) {
      events.push({
        type: "room/entered",
        crewId: crew.id,
        inhabitantId: inhabitant.id,
        room: newRoom,
      });
    }
    return events;
  }

  private leaveInhabitant(
    command: Extract<Command, { type: "inhabitant/leave" }>,
  ): WorldEvent[] {
    const crew = this.requireCrew(command.crewId);
    const index = crew.inhabitants.findIndex(
      (i) => i.id === command.inhabitantId,
    );
    if (index === -1) {
      throw new WorldError(
        "inhabitant/not-found",
        `inhabitant not in crew: ${command.inhabitantId}`,
      );
    }
    const [inhabitant] = crew.inhabitants.splice(index, 1);
    if (!inhabitant) {
      throw new WorldError(
        "inhabitant/not-found",
        `inhabitant not in crew: ${command.inhabitantId}`,
      );
    }

    const events: WorldEvent[] = [];
    const left = this.roomLeftEvent(crew, inhabitant.id, inhabitant.room);
    if (left) {
      events.push(left);
    }
    events.push({
      type: "inhabitant/left",
      crewId: crew.id,
      inhabitantId: inhabitant.id,
    });
    return events;
  }

  private roomLeftEvent(
    crew: CrewState,
    inhabitantId: InhabitantId,
    roomId: RoomId | null,
  ): WorldEvent | null {
    if (!roomId) {
      return null;
    }
    const room = roomById(crew.map, roomId);
    if (!room) {
      return null;
    }
    return {
      type: "room/left",
      crewId: crew.id,
      inhabitantId,
      room,
    };
  }

  private requireCrew(crewId: string): CrewState {
    const crew = this.crews.get(crewId);
    if (!crew) {
      throw new WorldError("crew/not-found", `crew not found: ${crewId}`);
    }
    return crew;
  }

  private requireInhabitant(
    crew: CrewState,
    inhabitantId: string,
  ): InhabitantState {
    const inhabitant = crew.inhabitants.find((i) => i.id === inhabitantId);
    if (!inhabitant) {
      throw new WorldError(
        "inhabitant/not-found",
        `inhabitant not in crew: ${inhabitantId}`,
      );
    }
    return inhabitant;
  }
}
