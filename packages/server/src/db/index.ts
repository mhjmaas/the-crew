import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema.js";

const url = process.env.DATABASE_URL ?? "postgres://thecrew:thecrew@localhost:5432/thecrew";

export const sql = postgres(url, { max: 10, onnotice: () => {} });
export const db = drizzle(sql, { schema });
