import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAvailableTimes } from "@/lib/booking";
import { isValidDate } from "@/lib/schedule";

const Query = z.object({
  master: z.coerce.number().int().positive(),
  service: z.coerce.number().int().positive(),
  date: z.string().refine(isValidDate),
});

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const parsed = Query.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });
  const { master, service, date } = parsed.data;
  const times = await getAvailableTimes(master, service, date);
  return NextResponse.json({ times });
}
