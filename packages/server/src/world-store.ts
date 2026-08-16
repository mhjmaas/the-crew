import { World, type CrewState, type InhabitantState, type MapType } from "@the-crew/world-core";
import { eq } from "drizzle-orm";
import { db } from "./db/index.js";
import { crews, crewMembers, inhabitants } from "./db/schema.js";

export async function hydrateWorld(world: World): Promise<void> {
  const crewRows = await db.select().from(crews);
  const inhabitantRows = await db.select().from(inhabitants);

  const byCrew = new Map<string, typeof inhabitantRows>();
  for (const row of inhabitantRows) {
    const list = byCrew.get(row.crewId) ?? [];
    list.push(row);
    byCrew.set(row.crewId, list);
  }

  for (const crewRow of crewRows) {
    const rows = byCrew.get(crewRow.id) ?? [];
    const hostRow = rows.find((r) => r.id === crewRow.hostInhabitantId);
    if (!hostRow) {
      continue;
    }
    world.apply({
      type: "crew/create",
      crewId: crewRow.id,
      name: crewRow.name,
      mapType: crewRow.mapType as MapType,
      host: { id: hostRow.id, name: hostRow.name, avatarId: hostRow.avatarId },
    });
    for (const row of rows) {
      if (row.id === hostRow.id) {
        continue;
      }
      world.apply({
        type: "inhabitant/join",
        crewId: crewRow.id,
        inhabitant: {
          id: row.id,
          name: row.name,
          kind: row.kind,
          avatarId: row.avatarId,
          position: { x: Number(row.x), y: Number(row.y) },
        },
      });
    }
    for (const row of rows) {
      world.apply({
        type: "inhabitant/move",
        crewId: crewRow.id,
        inhabitantId: row.id,
        position: { x: Number(row.x), y: Number(row.y) },
      });
    }
  }
}

export async function persistCrewCreation(crew: CrewState, hostAccountId: string): Promise<void> {
  const host = crew.inhabitants.find((i) => i.id === crew.hostId);
  if (!host) {
    throw new Error(`crew has no host: ${crew.id}`);
  }
  await db.insert(crews).values({
    id: crew.id,
    name: crew.name,
    mapType: crew.map.type,
    hostInhabitantId: crew.hostId,
  });
  await db.insert(crewMembers).values({ crewId: crew.id, accountId: hostAccountId });
  await db.insert(inhabitants).values({
    id: host.id,
    crewId: crew.id,
    accountId: hostAccountId,
    name: host.name,
    kind: host.kind,
    avatarId: host.avatarId,
    x: host.position.x,
    y: host.position.y,
    roomId: host.room,
  });
}

export async function persistInhabitantMove(inhabitant: InhabitantState): Promise<void> {
  await db
    .update(inhabitants)
    .set({ x: inhabitant.position.x, y: inhabitant.position.y, roomId: inhabitant.room })
    .where(eq(inhabitants.id, inhabitant.id));
}
