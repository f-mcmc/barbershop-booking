# Ustara — barbershop / salon uchun onlayn yozilish

Mijoz usta, xizmat, kun va bo'sh vaqtni tanlab yoziladi. Salon egasi admin panelda yozilishlarni ko'radi va boshqaradi, yangi yozilish haqida Telegram'ga xabar oladi.

Next.js 16 · TypeScript (strict) · PostgreSQL · Tailwind CSS v4

**Demo:** https://murodulloh-barbershop.vercel.app · admin panel: `/admin` (demo: `admin` / `admin123`)

## Imkoniyatlar

- 4 qadamli yozilish: usta → xizmat → kun va vaqt → ism va telefon
- Bir vaqtni ikki kishi band qila olmaydi (bazada unikal cheklov, parallel so'rovlarda ham)
- Xizmat davomiyligi hisobga olinadi (masalan, 60 daqiqalik xizmat 2 ta slotni egallaydi)
- Admin panel (login va parol bilan): haftalik yozilishlar, bekor qilish, ustalar va xizmatlarni qo'shish yoki yashirish
- Telegram bot orqali egaga avtomatik xabar
- Telefon va kompyuterga moslashgan

## Ishga tushirish

```bash
npm install
cp .env.example .env.local   # sozlamalarni to'ldiring
npm run dev                  # http://localhost:3000
```

`DATABASE_URL` bo'sh bo'lsa, ilova vaqtinchalik ichki bazada (PGlite) ishlaydi — sinab ko'rish uchun qulay, lekin qayta ishga tushganda ma'lumot o'chadi.

## Sozlamalar (.env)

| O'zgaruvchi | Vazifasi |
|---|---|
| `DATABASE_URL` | Postgres manzili (Neon, Supabase va h.k.) |
| `ADMIN_LOGIN`, `ADMIN_PASSWORD` | Admin panelga kirish. `ADMIN_PASSWORD` bo'lmasa — demo rejim (`admin` / `admin123`, login sahifasida ko'rsatiladi) |
| `SESSION_SECRET` | Kamida 16 belgili tasodifiy satr. Bo'lmasa `DATABASE_URL`dan hosil qilinadi |
| `TELEGRAM_BOT_TOKEN` | @BotFather bergan token |
| `TELEGRAM_CHAT_ID` | Xabar boradigan chat ID (botga /start yozib, @userinfobot orqali bilib olinadi) |

Ish vaqti va jadval: `src/lib/schedule.ts`. Salon nomi, manzil va telefon: `src/app/page.tsx`.

## Vercel'ga chiqarish

1. Repo'ni Vercel'ga import qiling.
2. Storage → Neon (Postgres) qo'shing — `DATABASE_URL` avtomatik qo'yiladi.
3. Qolgan o'zgaruvchilarni Settings → Environment Variables'ga yozing va qayta deploy qiling.

Jadvallar birinchi so'rovda avtomatik yaratiladi va namunaviy ustalar va xizmatlar qo'shiladi.

---
Muallif: Murodulloh — [murodulloh-portfolio.vercel.app](https://murodulloh-portfolio.vercel.app) · Telegram [@kadirjanovvm](https://t.me/kadirjanovvm)
