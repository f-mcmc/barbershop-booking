"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Master, Service } from "@/lib/booking";

interface DateOption {
  value: string;
  weekday: string;
  day: string;
}

interface Props {
  masters: Master[];
  services: Service[];
  dates: DateOption[];
}

type SlotsState = { status: "idle" } | { status: "loading" } | { status: "ready"; times: string[] } | { status: "error" };

const sum = (n: number) => n.toLocaleString("ru-RU").replace(/ /g, " ") + " so'm";

export function BookingFlow({ masters, services, dates }: Props) {
  const [masterId, setMasterId] = useState<number | null>(null);
  const [serviceId, setServiceId] = useState<number | null>(null);
  const [date, setDate] = useState<string>(dates[0]?.value ?? "");
  const [time, setTime] = useState<string | null>(null);
  const [slots, setSlots] = useState<SlotsState>({ status: "idle" });
  const [reload, setReload] = useState(0);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+998 ");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const master = masters.find((m) => m.id === masterId);
  const service = services.find((s) => s.id === serviceId);

  useEffect(() => {
    if (masterId === null || serviceId === null || !date) return;
    const ctrl = new AbortController();
    setSlots({ status: "loading" });
    setTime(null);
    fetch(`/api/slots?master=${masterId}&service=${serviceId}&date=${date}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: { times: string[] }) => setSlots({ status: "ready", times: data.times }))
      .catch((e: unknown) => {
        if (!(e instanceof DOMException && e.name === "AbortError")) setSlots({ status: "error" });
      });
    return () => ctrl.abort();
  }, [masterId, serviceId, date, reload]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (masterId === null || serviceId === null || !time) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ masterId, serviceId, date, time, name, phone }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Xatolik yuz berdi");
        if (res.status === 409) setReload((n) => n + 1);
        return;
      }
      setDone(true);
    } catch {
      setError("Internet aloqasini tekshirib, qayta urinib ko'ring.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done && master && service && time) {
    const d = dates.find((x) => x.value === date);
    return (
      <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-line" role="status">
        <p className="font-display text-sm font-semibold uppercase tracking-wider text-red">Yozildingiz</p>
        <h2 className="mt-2 font-display text-4xl font-semibold uppercase">
          {d?.weekday}, {d?.day} — {time}
        </h2>
        <p className="mt-4 text-lg text-ink-soft">
          {service.name}, usta {master.name}. Narxi {sum(service.price)}. Kechiksangiz yoki kela olmasangiz, qo&apos;ng&apos;iroq
          qilib ogohlantiring.
        </p>
        <button
          type="button"
          onClick={() => {
            setDone(false);
            setTime(null);
            setName("");
            setPhone("+998 ");
            setReload((n) => n + 1);
          }}
          className="mt-6 rounded-full border-2 border-ink px-5 py-2.5 font-semibold hover:bg-ink hover:text-white"
        >
          Yana yozilish
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <Step n={1} title="Ustani tanlang">
        <div className="grid gap-3 sm:grid-cols-3">
          {masters.map((m) => (
            <Choice key={m.id} selected={m.id === masterId} onClick={() => setMasterId(m.id)}>
              <span className="font-display text-xl font-semibold uppercase">{m.name}</span>
              <span className="text-sm text-ink-soft">{m.role}</span>
            </Choice>
          ))}
        </div>
      </Step>

      <Step n={2} title="Xizmatni tanlang">
        <div className="grid gap-3 sm:grid-cols-2">
          {services.map((s) => (
            <Choice key={s.id} selected={s.id === serviceId} onClick={() => setServiceId(s.id)}>
              <span className="flex w-full items-baseline justify-between gap-3">
                <span className="font-semibold">{s.name}</span>
                <span className="whitespace-nowrap font-semibold text-red">{sum(s.price)}</span>
              </span>
              <span className="text-sm text-ink-soft">{s.duration_min} daqiqa</span>
            </Choice>
          ))}
        </div>
      </Step>

      <Step n={3} title="Kun va vaqt">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0" role="radiogroup" aria-label="Kun">
          {dates.map((d) => {
            const active = d.value === date;
            return (
              <button
                key={d.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setDate(d.value)}
                className={`flex w-20 flex-none flex-col items-center rounded-xl py-2.5 ring-1 transition-colors ${
                  active ? "bg-ink text-white ring-ink" : "bg-white ring-line hover:ring-ink"
                }`}
              >
                <span className={`text-xs ${active ? "text-white/70" : "text-ink-soft"}`}>{d.weekday}</span>
                <span className="font-semibold">{d.day}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-5" aria-live="polite">
          {masterId === null || serviceId === null ? (
            <p className="text-ink-soft">Bo&apos;sh vaqtlarni ko&apos;rish uchun avval usta va xizmatni tanlang.</p>
          ) : slots.status === "loading" ? (
            <p className="text-ink-soft">Bo&apos;sh vaqtlar yuklanmoqda…</p>
          ) : slots.status === "error" ? (
            <p className="text-red">Vaqtlarni yuklab bo&apos;lmadi. Sahifani yangilang.</p>
          ) : slots.status === "ready" && slots.times.length === 0 ? (
            <p className="text-ink-soft">Bu kunga bo&apos;sh vaqt qolmagan. Boshqa kunni tanlang.</p>
          ) : slots.status === "ready" ? (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-8" role="radiogroup" aria-label="Vaqt">
              {slots.times.map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={t === time}
                  onClick={() => setTime(t)}
                  className={`rounded-lg py-2.5 font-semibold ring-1 transition-colors ${
                    t === time ? "bg-red text-white ring-red" : "bg-white ring-line hover:ring-ink"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </Step>

      <Step n={4} title="Ma'lumotlaringiz">
        <form onSubmit={submit} className="grid gap-4 sm:max-w-md">
          <label className="grid gap-1.5 text-sm font-semibold">
            Ismingiz
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              autoComplete="name"
              className="rounded-xl border border-line bg-white px-4 py-3 text-base font-normal"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold">
            Telefon
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              type="tel"
              autoComplete="tel"
              className="rounded-xl border border-line bg-white px-4 py-3 text-base font-normal"
            />
          </label>
          {error ? (
            <p className="font-semibold text-red" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={!time || submitting}
            className="rounded-full bg-red px-6 py-4 font-display text-lg font-semibold uppercase tracking-wide text-white transition-colors hover:bg-red-deep disabled:bg-steel"
          >
            {submitting ? "Yuborilmoqda…" : time ? `${time} ga yozilish` : "Vaqtni tanlang"}
          </button>
        </form>
      </Step>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`step-${n}`}>
      <h2 id={`step-${n}`} className="mb-4 flex items-baseline gap-3 font-display text-2xl font-semibold uppercase">
        <span className="text-red">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Choice({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`flex flex-col items-start gap-1 rounded-xl bg-white px-5 py-4 text-left ring-2 transition-colors ${
        selected ? "ring-red" : "ring-transparent shadow-sm hover:ring-line"
      }`}
    >
      {children}
    </button>
  );
}
