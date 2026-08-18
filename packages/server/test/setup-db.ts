import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

export function loadRootEnv(): Record<string, string> {
  const path = fileURLToPath(new URL("../../../.env", import.meta.url));
  const values: Record<string, string> = {};
  try {
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }
      const eq = trimmed.indexOf("=");
      if (eq === -1) {
        continue;
      }
      values[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
    }
  } catch {
    // no root .env — fall back to the process environment
  }
  return values;
}

export interface TestDatabases {
  adminUrl: string;
  testDb: string;
  url: string;
}

export function testDatabases(databaseUrl: string): TestDatabases {
  const url = new URL(databaseUrl);
  const testDb = `${url.pathname.replace(/^\//, "")}_test`;
  url.pathname = `/${testDb}`;
  const admin = new URL(databaseUrl);
  admin.pathname = "/postgres";
  return { adminUrl: admin.toString(), testDb, url: url.toString() };
}

export async function resetTestDatabase(
  adminUrl: string,
  testDb: string,
): Promise<void> {
  const admin = postgres(adminUrl, { max: 1, onnotice: () => {} });
  try {
    await admin.unsafe(`DROP DATABASE IF EXISTS "${testDb}" WITH (FORCE)`);
    await admin.unsafe(`CREATE DATABASE "${testDb}"`);
  } finally {
    await admin.end();
  }
}
