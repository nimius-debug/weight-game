import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Reuse a single client across hot-reloads / serverless invocations, and
// initialize lazily so importing this module (e.g. during `next build`)
// doesn't require DATABASE_URL until a query actually runs.
const globalForDb = globalThis as unknown as {
  client?: ReturnType<typeof postgres>;
  db?: PostgresJsDatabase<typeof schema>;
};

function getDb(): PostgresJsDatabase<typeof schema> {
  if (globalForDb.db) return globalForDb.db;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local.");
  }

  const client =
    globalForDb.client ?? postgres(connectionString, { prepare: false });
  const instance = drizzle(client, { schema });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.client = client;
    globalForDb.db = instance;
  }
  return instance;
}

// A proxy so callers can `import { db }` and use it directly, while the real
// connection is created on first use.
export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_target, prop) {
    const real = getDb();
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export { schema };
