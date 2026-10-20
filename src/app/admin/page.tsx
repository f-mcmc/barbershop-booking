import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { listBookings, listMasters, listServices, type BookingRow } from "@/lib/booking";
import { addDays, formatDateLocal, formatSum, formatTime, humanDate, isValidDate, todayLocal } from "@/lib/schedule";
import { addMasterAction, addServiceAction, cancelBookingAction, toggleActiveAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  if (!(await isAdmin())) redirect("/admin/login");
  const params = await searchParams;
  const today = todayLocal();
  const from = params.from && isValidDate(params.from) ? params.from : today;
  const to = addDays(from, 6);

  const [bookings, masters, services] = await Promise.all([
    listBookings(from, to),
    listMasters(true),
    listServices(true),
  ]);

  const byDay = new Map<string, BookingRow[]>();
  for (const b of bookings) {
    const key = formatDateLocal(new Date(b.starts_at));
    byDay.set(key, [...(byDay.get(key) ?? []), b]);
  }
  const active = bookings.filter((b) => b.status === "active");
  const revenue = active.reduce((s, b) => s + b.price, 0);

  return (
    <div className="min-h-screen">
      <header className="bg-ink text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <p className="font-display text-xl font-semibold uppercase tracking-wide">Admin panel</p>
          <div className="flex items-center gap-4 text-sm">
            <a href="/" className="text-white/80 hover:text-white">
              Sayt
            </a>
            <form action="/api/admin/logout" method="post">
              <button type="submit" className="rounded-full bg-white/10 px-4 py-1.5 hover:bg-white/20">
                Chiqish
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-14 px-4 py-10 sm:px-6">
        <section aria-labelledby="bookings-title">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 id="bookings-title" className="font-display text-4xl font-semibold uppercase">
                Yozilishlar
              </h1>
              <p className="mt-1 text-ink-soft">
                {from} — {to}: {active.length} ta yozilish, taxminiy tushum {formatSum(revenue)}
              </p>
            </div>
            <nav className="flex gap-2 text-sm font-semibold" aria-label="Hafta">
              <a href={`/admin?from=${addDays(from, -7)}`} className="rounded-full bg-white px-4 py-2 ring-1 ring-line hover:ring-ink">
                Oldingi hafta
              </a>
              <a href="/admin" className="rounded-full bg-white px-4 py-2 ring-1 ring-line hover:ring-ink">
                Bugun
              </a>
              <a href={`/admin?from=${addDays(from, 7)}`} className="rounded-full bg-white px-4 py-2 ring-1 ring-line hover:ring-ink">
                Keyingi hafta
              </a>
            </nav>
          </div>

          {bookings.length === 0 ? (
            <p className="mt-8 rounded-xl bg-white p-6 text-ink-soft ring-1 ring-line">
              Bu haftaga hali yozilish yo&apos;q. Mijozlar saytdan yozilganda shu yerda paydo bo&apos;ladi.
            </p>
          ) : (
            <div className="mt-8 space-y-8">
              {[...byDay.entries()].map(([day, rows]) => {
                const h = humanDate(day);
                return (
                  <div key={day}>
                    <h2 className="mb-2 font-semibold">
                      {h.weekday}, {h.day}
                    </h2>
                    <ul className="divide-y divide-line overflow-hidden rounded-xl bg-white ring-1 ring-line">
                      {rows.map((b) => (
                        <li key={b.id} className={`flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 ${b.status === "cancelled" ? "opacity-50" : ""}`}>
                          <span className="w-24 font-display text-lg font-semibold">
                            {formatTime(new Date(b.starts_at))}–{formatTime(new Date(b.ends_at))}
                          </span>
                          <span className="min-w-40 flex-1">
                            <span className="block font-semibold">{b.customer_name}</span>
                            <a href={`tel:${b.phone.replace(/[^\d+]/g, "")}`} className="text-sm text-ink-soft hover:text-ink">
                              {b.phone}
                            </a>
                          </span>
                          <span className="min-w-40 text-sm">
                            {b.service_name} · <span className="text-ink-soft">usta {b.master_name}</span>
                          </span>
                          {b.status === "active" ? (
                            <form action={cancelBookingAction}>
                              <input type="hidden" name="id" value={b.id} />
                              <button type="submit" className="rounded-full px-3 py-1.5 text-sm font-semibold text-red ring-1 ring-red hover:bg-red hover:text-white">
                                Bekor qilish
                              </button>
                            </form>
                          ) : (
                            <span className="text-sm font-semibold text-ink-soft">Bekor qilingan</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <div className="grid gap-10 md:grid-cols-2">
          <section aria-labelledby="masters-title">
            <h2 id="masters-title" className="font-display text-2xl font-semibold uppercase">
              Ustalar
            </h2>
            <ul className="mt-4 divide-y divide-line rounded-xl bg-white ring-1 ring-line">
              {masters.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className={m.active ? "" : "text-ink-soft line-through"}>
                    <span className="font-semibold">{m.name}</span> <span className="text-sm text-ink-soft">{m.role}</span>
                  </span>
                  <ToggleForm table="masters" id={m.id} active={m.active} />
                </li>
              ))}
            </ul>
            <form action={addMasterAction} className="mt-4 flex flex-wrap gap-2">
              <input name="name" required minLength={2} placeholder="Ism" aria-label="Usta ismi" className="min-w-0 flex-1 basis-36 rounded-xl border border-line bg-white px-3 py-2.5" />
              <input name="role" placeholder="Lavozimi" aria-label="Lavozimi" className="min-w-0 flex-1 basis-36 rounded-xl border border-line bg-white px-3 py-2.5" />
              <button type="submit" className="rounded-xl bg-ink px-4 py-2.5 font-semibold text-white">
                Qo&apos;shish
              </button>
            </form>
          </section>

          <section aria-labelledby="services-title">
            <h2 id="services-title" className="font-display text-2xl font-semibold uppercase">
              Xizmatlar
            </h2>
            <ul className="mt-4 divide-y divide-line rounded-xl bg-white ring-1 ring-line">
              {services.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className={s.active ? "" : "text-ink-soft line-through"}>
                    <span className="font-semibold">{s.name}</span>{" "}
                    <span className="text-sm text-ink-soft">
                      {s.duration_min} daq · {formatSum(s.price)}
                    </span>
                  </span>
                  <ToggleForm table="services" id={s.id} active={s.active} />
                </li>
              ))}
            </ul>
            <form action={addServiceAction} className="mt-4 flex flex-wrap gap-2">
              <input name="name" required minLength={2} placeholder="Xizmat nomi" aria-label="Xizmat nomi" className="min-w-0 flex-1 basis-36 rounded-xl border border-line bg-white px-3 py-2.5" />
              <select name="duration" aria-label="Davomiyligi" defaultValue="30" className="min-w-0 flex-1 basis-36 rounded-xl border border-line bg-white px-3 py-2.5">
                {[30, 60, 90, 120, 150, 180].map((d) => (
                  <option key={d} value={d}>
                    {d} daqiqa
                  </option>
                ))}
              </select>
              <input name="price" required type="number" min={0} step={1000} placeholder="Narx" aria-label="Narx (so'm)" className="min-w-0 flex-1 basis-36 rounded-xl border border-line bg-white px-3 py-2.5" />
              <button type="submit" className="rounded-xl bg-ink px-4 py-2.5 font-semibold text-white">
                Qo&apos;shish
              </button>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}

function ToggleForm({ table, id, active }: { table: "masters" | "services"; id: number; active: boolean }) {
  return (
    <form action={toggleActiveAction}>
      <input type="hidden" name="table" value={table} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="active" value={String(!active)} />
      <button type="submit" className="text-sm font-semibold text-ink-soft hover:text-ink">
        {active ? "Yashirish" : "Qaytarish"}
      </button>
    </form>
  );
}
