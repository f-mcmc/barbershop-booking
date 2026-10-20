import { BookingFlow } from "@/components/BookingFlow";
import { listMasters, listServices } from "@/lib/booking";
import { SCHEDULE, addDays, humanDate, todayLocal } from "@/lib/schedule";

export const dynamic = "force-dynamic";

const SALON = {
  name: "Ustara",
  address: "Toshkent, Chilonzor tumani, Bunyodkor ko'chasi 12",
  phone: "+998 90 123 45 67",
};

export default async function HomePage() {
  const [masters, services] = await Promise.all([listMasters(), listServices()]);
  const today = todayLocal();
  const nowLocalHour = new Date(Date.now() + SCHEDULE.tzOffsetMinutes * 60_000).getUTCHours();
  // Ish kuni tugagan bo'lsa, ro'yxat ertangi kundan boshlanadi.
  const startOffset = nowLocalHour >= SCHEDULE.closeHour - 1 ? 1 : 0;
  const dates = Array.from({ length: SCHEDULE.daysAhead }, (_, i) => {
    const offset = i + startOffset;
    const value = addDays(today, offset);
    const h = humanDate(value);
    return { value, weekday: offset === 0 ? "Bugun" : offset === 1 ? "Ertaga" : h.weekday, day: h.day };
  });

  return (
    <div className="min-h-screen">
      <header className="bg-ink text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <p className="font-display text-2xl font-semibold uppercase tracking-wide">{SALON.name}</p>
          <a href={`tel:${SALON.phone.replace(/[^\d+]/g, "")}`} className="text-sm text-white/80 hover:text-white">
            {SALON.phone}
          </a>
        </div>
      </header>

      <section className="relative overflow-hidden bg-ink text-white">
        <div className="pole absolute inset-y-0 right-0 hidden w-24 opacity-90 md:block" aria-hidden="true" />
        <div className="mx-auto max-w-5xl px-4 pb-14 pt-8 sm:px-6 md:pb-20 md:pt-12">
          <h1 className="max-w-2xl font-display text-5xl font-semibold uppercase leading-[0.95] tracking-tight sm:text-7xl">
            Navbatsiz soch oldiring
          </h1>
          <p className="mt-5 max-w-xl text-lg text-white/75">
            Ustani, xizmatni va qulay vaqtni tanlang. Yozilish bir daqiqa oladi, telefon qilish shart emas.
          </p>
          <p className="mt-6 text-sm text-white/60">
            Har kuni {String(SCHEDULE.openHour).padStart(2, "0")}:00 – {SCHEDULE.closeHour}:00 · {SALON.address}
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 md:py-14">
        <BookingFlow masters={masters} services={services} dates={dates} />
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-5xl flex-wrap justify-between gap-2 px-4 py-6 text-sm text-ink-soft sm:px-6">
          <span>© {new Date().getFullYear()} {SALON.name} Barbershop</span>
          <a href="/admin" className="hover:text-ink">
            Admin panel
          </a>
        </div>
      </footer>
    </div>
  );
}
