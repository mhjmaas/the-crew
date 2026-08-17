import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is not set — see .env.example");
}

export const sql = postgres(url, { max: 10, onnotice: () => {} });
export const db = drizzle(sql, { schema });
