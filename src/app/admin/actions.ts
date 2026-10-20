"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isAdmin } from "@/lib/auth";
import { addMaster, addService, cancelBooking, setActive } from "@/lib/booking";

async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/login");
}

const Id = z.coerce.number().int().positive();

export async function cancelBookingAction(form: FormData): Promise<void> {
  await requireAdmin();
  await cancelBooking(Id.parse(form.get("id")));
  revalidatePath("/admin");
}

export async function addMasterAction(form: FormData): Promise<void> {
  await requireAdmin();
  const data = z
    .object({ name: z.string().trim().min(2).max(40), role: z.string().trim().max(60) })
    .parse({ name: form.get("name"), role: form.get("role") ?? "" });
  await addMaster(data.name, data.role);
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function addServiceAction(form: FormData): Promise<void> {
  await requireAdmin();
  const data = z
    .object({
      name: z.string().trim().min(2).max(60),
      duration: z.coerce.number().int().refine((v) => [30, 60, 90, 120, 150, 180].includes(v)),
      price: z.coerce.number().int().min(0).max(100_000_000),
    })
    .parse({ name: form.get("name"), duration: form.get("duration"), price: form.get("price") });
  await addService(data.name, data.duration, data.price);
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function toggleActiveAction(form: FormData): Promise<void> {
  await requireAdmin();
  const table = z.enum(["masters", "services"]).parse(form.get("table"));
  const active = form.get("active") === "true";
  await setActive(table, Id.parse(form.get("id")), active);
  revalidatePath("/admin");
  revalidatePath("/");
}
