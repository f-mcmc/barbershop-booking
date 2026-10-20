import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "salon_admin";
const MAX_AGE_SEC = 60 * 60 * 24 * 7;

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.VERCEL_ENV === "production") {
    throw new Error("SESSION_SECRET kamida 16 belgidan iborat bo'lishi kerak");
  }
  return "dev-only-secret-change-me";
}

export function adminCredentials(): { login: string; password: string } {
  return {
    login: process.env.ADMIN_LOGIN ?? "admin",
    password: process.env.ADMIN_PASSWORD ?? "admin123",
  };
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function checkCredentials(login: string, password: string): boolean {
  const creds = adminCredentials();
  return safeEqual(login, creds.login) && safeEqual(password, creds.password);
}

export async function createSession(): Promise<void> {
  const expires = Date.now() + MAX_AGE_SEC * 1000;
  const payload = `admin.${expires}`;
  const store = await cookies();
  store.set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  const value = store.get(COOKIE)?.value;
  if (!value) return false;
  const lastDot = value.lastIndexOf(".");
  if (lastDot < 0) return false;
  const payload = value.slice(0, lastDot);
  const signature = value.slice(lastDot + 1);
  if (!safeEqual(signature, sign(payload))) return false;
  const expires = Number(payload.split(".")[1]);
  return Number.isFinite(expires) && expires > Date.now();
}
