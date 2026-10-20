import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await isAdmin()) redirect("/admin");
  const { error } = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center bg-ink px-4">
      <form action="/api/admin/login" method="post" className="w-full max-w-sm rounded-2xl bg-white p-8">
        <h1 className="font-display text-3xl font-semibold uppercase">Admin panel</h1>
        <p className="mt-1 text-sm text-ink-soft">Yozilishlarni boshqarish uchun kiring.</p>
        <label className="mt-6 grid gap-1.5 text-sm font-semibold">
          Login
          <input name="login" required autoComplete="username" className="rounded-xl border border-line px-4 py-3 text-base font-normal" />
        </label>
        <label className="mt-4 grid gap-1.5 text-sm font-semibold">
          Parol
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="rounded-xl border border-line px-4 py-3 text-base font-normal"
          />
        </label>
        {error ? (
          <p className="mt-4 font-semibold text-red" role="alert">
            Login yoki parol noto&apos;g&apos;ri.
          </p>
        ) : null}
        <button type="submit" className="mt-6 w-full rounded-full bg-red py-3.5 font-semibold text-white hover:bg-red-deep">
          Kirish
        </button>
        <a href="/" className="mt-4 block text-center text-sm text-ink-soft hover:text-ink">
          Saytga qaytish
        </a>
      </form>
    </main>
  );
}
