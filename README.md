# Market Platform

پلتفرم مارکت‌پلیس مقیاس‌بزرگ (وب + اپ + بات تلگرام)

## وضعیت فعلی

- طراحی کامل فاز ۱ انجام شده و در پوشه `docs/` موجود است.
- اسکلت فنی اولیه (Cloudflare Workers + D1) راه‌اندازی شده.

## ساختار پروژه

```
market-platform/
├── docs/                  # تمام مستندات طراحی
├── src/
│   ├── index.ts           # نقطه ورود Worker
│   ├── routes/            # مسیرهای API
│   ├── services/          # منطق کسب‌وکار
│   ├── utils/             # توابع کمکی
│   └── types/             # تایپ‌ها
├── migrations/            # مایگریشن‌های دیتابیس
├── wrangler.toml
├── package.json
└── tsconfig.json
```

## تکنولوژی‌ها

- **Runtime:** Cloudflare Workers
- **Database:** Cloudflare D1 (SQLite)
- **Language:** TypeScript
- **Auth:** Mobile + OTP

## راه‌اندازی محلی (بعد از نصب وابستگی‌ها)

```bash
npm install
npx wrangler d1 migrations apply market-db --local
npx wrangler dev
```

## اولویت پیاده‌سازی فعلی

1. احراز هویت با موبایل + OTP
2. ثبت کالا و صف بررسی
3. ثبت درخواست و پیشنهاد قیمت
4. سیستم سهمیه مشاهده اطلاعات تماس
5. کیف پول و شارژ
