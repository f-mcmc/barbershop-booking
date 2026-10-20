import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "salon_admin";
const MAX_AGE_SEC = 60 * 60 * 24 * 7;

const DEMO_LOGIN = "admin";
const DEMO_PASSWORD = "admin123";

/**
 * Cookie imzosi kaliti. SESSION_SECRET bo'lmasa, serverdagi maxfiy DATABASE_URL'dan
 * olinadi — shunda Neon ulangan loyiha qo'shimcha sozlamasiz ishlaydi.
 */
function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 16) return s;
  const db = process.env.DATABASE_URL;
  if (db) return createHash("sha256").update(`salon-session:${db}`).digest("hex");
  if (process.env.VERCEL_ENV === "production") {
    throw new Error("SESSION_SECRET yoki DATABASE_URL kerak");
  }
  return "dev-only-secret-change-me";
}

/** ADMIN_PASSWORD berilmagan bo'lsa, sayt demo rejimida: login ma'lumotlari ochiq ko'rsatiladi. */
export function isDemoMode(): boolean {
  return !process.env.ADMIN_PASSWORD;
}

export function demoCredentials(): { login: string; password: string } | null {
  return isDemoMode() ? { login: DEMO_LOGIN, password: DEMO_PASSWORD } : null;
}

export function adminCredentials(): { login: string; password: string } {
  return {
    login: process.env.ADMIN_LOGIN ?? DEMO_LOGIN,
    password: process.env.ADMIN_PASSWORD ?? DEMO_PASSWORD,
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
