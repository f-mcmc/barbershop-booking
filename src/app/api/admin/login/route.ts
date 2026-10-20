import { NextResponse, type NextRequest } from "next/server";
import { checkCredentials, createSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const login = String(form.get("login") ?? "");
  const password = String(form.get("password") ?? "");
  if (!checkCredentials(login, password)) {
    return NextResponse.redirect(new URL("/admin/login?error=1", req.url), 303);
  }
  await createSession();
  return NextResponse.redirect(new URL("/admin", req.url), 303);
}
