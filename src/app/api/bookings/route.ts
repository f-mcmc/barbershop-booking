import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { BookingError, createBooking } from "@/lib/booking";
import { formatSum, isValidDate } from "@/lib/schedule";
import { notifyOwner } from "@/lib/telegram";

const Body = z.object({
  masterId: z.number().int().positive(),
  serviceId: z.number().int().positive(),
  date: z.string().refine(isValidDate),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  name: z.string().trim().min(2, "Ismingizni yozing").max(60),
  phone: z
    .string()
    .trim()
    .refine((v) => /^\+?[\d\s()-]{9,20}$/.test(v) && v.replace(/\D/g, "").length >= 9, "Telefon raqamini to'liq yozing"),
});

export async function POST(req: NextRequest) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });
  }
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Ma'lumotlarni tekshiring";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const booking = await createBooking(parsed.data);
    await notifyOwner(
      [
        "🆕 Yangi yozilish",
        `${parsed.data.date}, ${parsed.data.time}`,
        `Usta: ${booking.master.name}`,
        `Xizmat: ${booking.service.name} (${formatSum(booking.service.price)})`,
        `Mijoz: ${parsed.data.name}, ${parsed.data.phone}`,
      ].join("\n"),
    );
    return NextResponse.json({ id: booking.id }, { status: 201 });
  } catch (err) {
    if (err instanceof BookingError) {
      return NextResponse.json({ error: err.message }, { status: err.code === "slot_taken" ? 409 : 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Server xatosi. Birozdan keyin qayta urinib ko'ring." }, { status: 500 });
  }
}
