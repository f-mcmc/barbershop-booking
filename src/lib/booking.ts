import "server-only";
import { getDb, isUniqueViolation } from "./db";
import { SCHEDULE, addDays, daySlotMinutes, localDateTime, todayLocal } from "./schedule";

export interface Master {
  id: number;
  name: string;
  role: string;
  active: boolean;
}

export interface Service {
  id: number;
  name: string;
  duration_min: number;
  price: number;
  active: boolean;
}

export interface BookingRow {
  id: number;
  starts_at: Date;
  ends_at: Date;
  customer_name: string;
  phone: string;
  status: "active" | "cancelled";
  master_name: string;
  service_name: string;
  price: number;
}

export class BookingError extends Error {
  constructor(
    message: string,
    readonly code: "slot_taken" | "invalid",
  ) {
    super(message);
  }
}

export async function listMasters(includeInactive = false): Promise<Master[]> {
  const db = await getDb();
  return db.query<Master>(
    `SELECT id, name, role, active FROM masters ${includeInactive ? "" : "WHERE active"} ORDER BY id`,
  );
}

export async function listServices(includeInactive = false): Promise<Service[]> {
  const db = await getDb();
  return db.query<Service>(
    `SELECT id, name, duration_min, price, active FROM services ${includeInactive ? "" : "WHERE active"} ORDER BY id`,
  );
}

async function getActive<T extends object>(table: "masters" | "services", id: number): Promise<T | undefined> {
  const db = await getDb();
  const rows = await db.query<T>(`SELECT * FROM ${table} WHERE id = $1 AND active`, [id]);
  return rows[0];
}

/** Bookable start times ("HH:MM") for a master, service and date. */
export async function getAvailableTimes(masterId: number, serviceId: number, date: string, now = new Date()) {
  const service = await getActive<Service>("services", serviceId);
  const master = await getActive<Master>("masters", masterId);
  if (!service || !master) return [];

  const today = todayLocal(now);
  if (date < today || date > addDays(today, SCHEDULE.daysAhead)) return [];

  const db = await getDb();
  const dayStart = localDateTime(date, 0);
  const dayEnd = localDateTime(date, 24 * 60);
  const taken = await db.query<{ slot_at: Date }>(
    "SELECT slot_at FROM booking_slots WHERE master_id = $1 AND slot_at >= $2 AND slot_at < $3",
    [masterId, dayStart, dayEnd],
  );
  const takenSet = new Set(taken.map((r) => new Date(r.slot_at).getTime()));
  const needed = service.duration_min / SCHEDULE.slotMinutes;
  const closeMin = SCHEDULE.closeHour * 60;

  const result: string[] = [];
  for (const start of daySlotMinutes()) {
    if (start + service.duration_min > closeMin) continue;
    const startDate = localDateTime(date, start);
    if (startDate.getTime() <= now.getTime() + 15 * 60_000) continue;
    let free = true;
    for (let i = 0; i < needed; i++) {
      if (takenSet.has(localDateTime(date, start + i * SCHEDULE.slotMinutes).getTime())) {
        free = false;
        break;
      }
    }
    if (free) {
      result.push(`${String(Math.floor(start / 60)).padStart(2, "0")}:${String(start % 60).padStart(2, "0")}`);
    }
  }
  return result;
}

export interface NewBooking {
  masterId: number;
  serviceId: number;
  date: string;
  time: string;
  name: string;
  phone: string;
}

export async function createBooking(input: NewBooking, now = new Date()) {
  const available = await getAvailableTimes(input.masterId, input.serviceId, input.date, now);
  if (!available.includes(input.time)) {
    throw new BookingError("Bu vaqt band yoki mavjud emas. Boshqa vaqtni tanlang.", "slot_taken");
  }
  const service = await getActive<Service>("services", input.serviceId);
  const master = await getActive<Master>("masters", input.masterId);
  if (!service || !master) throw new BookingError("Usta yoki xizmat topilmadi.", "invalid");

  const [hh, mm] = input.time.split(":").map(Number) as [number, number];
  const startMin = hh * 60 + mm;
  const startsAt = localDateTime(input.date, startMin);
  const endsAt = localDateTime(input.date, startMin + service.duration_min);

  const db = await getDb();
  try {
    return await db.transaction(async (tx) => {
      const [row] = await tx.query<{ id: number }>(
        `INSERT INTO bookings (master_id, service_id, starts_at, ends_at, customer_name, phone)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [master.id, service.id, startsAt, endsAt, input.name, input.phone],
      );
      if (!row) throw new Error("Insert failed");
      for (let m = 0; m < service.duration_min; m += SCHEDULE.slotMinutes) {
        await tx.query("INSERT INTO booking_slots (booking_id, master_id, slot_at) VALUES ($1, $2, $3)", [
          row.id,
          master.id,
          localDateTime(input.date, startMin + m),
        ]);
      }
      return { id: row.id, master, service, startsAt };
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new BookingError("Bu vaqtni hozirgina boshqa mijoz band qildi. Boshqa vaqtni tanlang.", "slot_taken");
    }
    throw err;
  }
}

export async function listBookings(fromDate: string, toDate: string): Promise<BookingRow[]> {
  const db = await getDb();
  return db.query<BookingRow>(
    `SELECT b.id, b.starts_at, b.ends_at, b.customer_name, b.phone, b.status,
            m.name AS master_name, s.name AS service_name, s.price
       FROM bookings b
       JOIN masters m ON m.id = b.master_id
       JOIN services s ON s.id = b.service_id
      WHERE b.starts_at >= $1 AND b.starts_at < $2
      ORDER BY b.starts_at, m.name`,
    [localDateTime(fromDate, 0), localDateTime(addDays(toDate, 1), 0)],
  );
}

export async function cancelBooking(id: number): Promise<void> {
  const db = await getDb();
  await db.transaction(async (tx) => {
    await tx.query("DELETE FROM booking_slots WHERE booking_id = $1", [id]);
    await tx.query("UPDATE bookings SET status = 'cancelled' WHERE id = $1", [id]);
  });
}

export async function addMaster(name: string, role: string): Promise<void> {
  const db = await getDb();
  await db.query("INSERT INTO masters (name, role) VALUES ($1, $2)", [name, role]);
}

export async function addService(name: string, durationMin: number, price: number): Promise<void> {
  const db = await getDb();
  await db.query("INSERT INTO services (name, duration_min, price) VALUES ($1, $2, $3)", [name, durationMin, price]);
}

export async function setActive(table: "masters" | "services", id: number, active: boolean): Promise<void> {
  const db = await getDb();
  await db.query(`UPDATE ${table} SET active = $1 WHERE id = $2`, [active, id]);
}
