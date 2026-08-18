import type {
  CrewState,
  InhabitantState,
  MapType,
  World,
} from "@the-crew/world-core";
import { eq } from "drizzle-orm";
import { db } from "./db/index.js";
import { crewMembers, crews, inhabitants } from "./db/schema.js";

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

const positionColumns = (inhabitant: InhabitantState) => ({
  x: inhabitant.position.x,
  y: inhabitant.position.y,
  roomId: inhabitant.room,
});

export async function persistInhabitantJoin(
  crewId: string,
  inhabitant: InhabitantState,
  accountId: string,
): Promise<void> {
  await db.insert(crewMembers).values({ crewId, accountId });
  await db.insert(inhabitants).values({
    id: inhabitant.id,
    crewId,
    accountId,
    name: inhabitant.name,
    kind: inhabitant.kind,
    avatarId: inhabitant.avatarId,
    ...positionColumns(inhabitant),
  });
}

export async function persistCrewCreation(
  crew: CrewState,
  hostAccountId: string,
): Promise<void> {
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
  await persistInhabitantJoin(crew.id, host, hostAccountId);
}

export async function persistInhabitantMove(
  inhabitant: InhabitantState,
): Promise<void> {
  await db
    .update(inhabitants)
    .set(positionColumns(inhabitant))
    .where(eq(inhabitants.id, inhabitant.id));
}
