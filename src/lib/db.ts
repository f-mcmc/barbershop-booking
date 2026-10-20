import "server-only";
import { Pool } from "pg";
import type { PGlite } from "@electric-sql/pglite";

export interface Queryable {
  query<T extends object>(text: string, params?: readonly unknown[]): Promise<T[]>;
}

export interface Db extends Queryable {
  transaction<R>(fn: (tx: Queryable) => Promise<R>): Promise<R>;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS masters (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS services (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  duration_min INTEGER NOT NULL CHECK (duration_min > 0 AND duration_min % 30 = 0),
  price INTEGER NOT NULL CHECK (price >= 0),
  active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  master_id INTEGER NOT NULL REFERENCES masters(id),
  service_id INTEGER NOT NULL REFERENCES services(id),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS booking_slots (
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  master_id INTEGER NOT NULL,
  slot_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (master_id, slot_at)
);
CREATE INDEX IF NOT EXISTS bookings_starts_idx ON bookings (starts_at);
`;

const SEED = `
INSERT INTO masters (name, role) VALUES
  ('Jasur', 'Katta usta'), ('Sardor', 'Usta'), ('Bekzod', 'Usta, soqol bo''yicha');
INSERT INTO services (name, duration_min, price) VALUES
  ('Soch olish', 30, 60000),
  ('Soch + soqol', 60, 90000),
  ('Soqol olish', 30, 40000),
  ('Bolalar soch olishi', 30, 45000),
  ('Soch bo''yash', 90, 150000);
`;

function wrapPg(client: { query: Pool["query"] }): Queryable {
  return {
    async query<T extends object>(text: string, params: readonly unknown[] = []) {
      const res = await client.query(text, [...params]);
      return res.rows as T[];
    },
  };
}

function wrapLite(lite: Pick<PGlite, "query">): Queryable {
  return {
    async query<T extends object>(text: string, params: readonly unknown[] = []) {
      const res = await lite.query<T>(text, [...params]);
      return res.rows;
    },
  };
}

async function createDb(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  let db: Db;

  if (url) {
    const pool = new Pool({ connectionString: url, max: 3, ssl: url.includes("localhost") ? false : { rejectUnauthorized: false } });
    db = {
      ...wrapPg(pool),
      async transaction(fn) {
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          const result = await fn(wrapPg(client));
          await client.query("COMMIT");
          return result;
        } catch (err) {
          await client.query("ROLLBACK");
          throw err;
        } finally {
          client.release();
        }
      },
    };
    await pool.query(SCHEMA);
  } else {
    const { PGlite } = await import("@electric-sql/pglite");
    const lite = await PGlite.create(process.env.PGLITE_DIR ?? "memory://");
    db = {
      ...wrapLite(lite),
      transaction: (fn) => lite.transaction((tx) => fn(wrapLite(tx))),
    };
    await lite.exec(SCHEMA);
  }

  const [{ count }] = (await db.query<{ count: string }>("SELECT count(*)::text AS count FROM masters")) as [
    { count: string },
  ];
  if (count === "0") {
    for (const stmt of SEED.split(";").map((s) => s.trim()).filter(Boolean)) {
      await db.query(stmt);
    }
  }
  return db;
}

const globalForDb = globalThis as unknown as { __salonDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  if (!globalForDb.__salonDb) globalForDb.__salonDb = createDb();
  return globalForDb.__salonDb;
}

export function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code: unknown }).code === "23505";
}
