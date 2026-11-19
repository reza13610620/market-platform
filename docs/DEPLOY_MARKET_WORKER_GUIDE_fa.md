# راهنمای کامل Deploy ورکر مارکت‌پلتفرم روی Cloudflare

**تاریخ:** ۲۰۲۶-۱۱-۱۹  
**برای:** رضا  
**هدف:** بالا آوردن Worker مارکت + دیتابیس اصلی + اتصال به shared-catalog

---

## پیش‌نیاز

- حساب Cloudflare (همان حساب ربات)
- لپ‌تاپ یا کامپیوتری که Node.js داشته باشد (برای دستورات)
- ریپوی `market-platform` روی سیستم یا GitHub

اگر Node نداری:
1. برو به [nodejs.org](https://nodejs.org)
2. نسخه LTS را نصب کن

---

## مرحله ۱ – ساخت دیتابیس اصلی مارکت

1. برو به [dash.cloudflare.com](https://dash.cloudflare.com)
2. **Storage & databases** → **D1**
3. **Create database**
4. نام: `market-db`
5. Create را بزن
6. **Database ID** را کپی کن و جایی نگه دار

---

## مرحله ۲ – اتصال به Cloudflare از سیستم خودت

در ترمینال (Command Prompt یا PowerShell):

```bash
npm install -g wrangler
wrangler login
```

مرورگر باز می‌شود؛ با همان حساب Cloudflare وارد شو و Allow را بزن.

---

## مرحله ۳ – کلون / باز کردن پروژه

اگر پروژه را نداری:

```bash
git clone https://github.com/reza13610620/market-platform.git
cd market-platform
npm install
```

اگر از قبل داری:

```bash
cd market-platform
git pull
npm install
```

---

## مرحله ۴ – تنظیم wrangler.toml

فایل `wrangler.toml` را باز کن و این بخش‌ها را درست کن:

```toml
name = "market-platform"
main = "src/index.ts"
compatibility_date = "2024-11-01"

# دیتابیس اصلی مارکت
[[d1_databases]]
binding = "DB"
database_name = "market-db"
database_id = "اینجا-Database-ID-مارکت-را-بگذار"

# دیتابیس مشترک (همان shared-catalog که ساختی)
[[d1_databases]]
binding = "SHARED_CATALOG"
database_name = "shared-catalog"
database_id = "اینجا-Database-ID-shared-catalog-را-بگذار"

[vars]
SMS_PROVIDER = "mock"
SMS_SENDER = ""
SMS_TEMPLATE_OTP = "otp"
PAYMENT_PROVIDER = "mock"
PAYMENT_CALLBACK_URL = ""
PAYMENT_SANDBOX = "true"
```

### چطور Database ID را پیدا کنی؟
- D1 → روی نام دیتابیس کلیک کن → در صفحه Settings یا بالای صفحه **Database ID** نوشته شده.

---

## مرحله ۵ – اجرای Migration (ساخت جدول‌های اصلی)

```bash
npx wrangler d1 migrations apply market-db --remote
```

اگر پوشه migrations خالی بود یا خطا داد، بگو تا SQL اولیه را جداگانه بدهم.

---

## مرحله ۶ – Secretها

حداقل این یکی را بگذار (حتماً یک متن طولانی تصادفی):

```bash
npx wrangler secret put JWT_SECRET
```

وقتی پرسید، یک رشته بلند وارد کن (مثلاً یک پسورد قوی ۳۰ کاراکتری) و Enter بزن.

بعداً برای SMS واقعی:

```bash
npx wrangler secret put SMS_API_KEY
```

---

## مرحله ۷ – Deploy

```bash
npx wrangler deploy
```

اگر موفق باشد، آدرسی شبیه این می‌گیری:

```
https://market-platform.pourrezaeireza.workers.dev
```

---

## مرحله ۸ – تست سریع

در مرورگر یا با curl:

```
https://market-platform.XXXX.workers.dev/health
```

باید چیزی شبیه این برگردد:

```json
{"status":"ok","service":"market-platform","version":"0.5.1"}
```

---

## مرحله ۹ – اتصال از داشبورد (روش جایگزین Binding)

اگر ترجیح می‌دهی از داشبورد وصل کنی:

1. Workers & Pages → `market-platform`
2. Settings → Bindings → Add
3. دو بار D1 اضافه کن:
   - Variable name: `DB` → دیتابیس `market-db`
   - Variable name: `SHARED_CATALOG` → دیتابیس `shared-catalog`
4. Save و دوباره Deploy

---

## خلاصه چک‌لیست

- [ ] دیتابیس `market-db` ساخته شد
- [ ] دیتابیس `shared-catalog` از قبل آماده است
- [ ] `wrangler login` انجام شد
- [ ] `database_id` هر دو دیتابیس در `wrangler.toml` گذاشته شد
- [ ] Migration اجرا شد
- [ ] `JWT_SECRET` ست شد
- [ ] `wrangler deploy` موفق شد
- [ ] آدرس `/health` جواب می‌دهد

---

## مشکلات رایج

**خطای database_id نامعتبر**  
→ ID را دوباره از داشبورد کپی کن؛ فاصله اضافه نداشته باشد.

**خطای authentication**  
→ دوباره `wrangler login`

**Migration پیدا نشد**  
→ بگو تا فایل migration را برایت بسازم.

**Worker ساخته شد ولی Binding ندارد**  
→ از Settings → Bindings دستی اضافه کن.

---

**بعد از deploy موفق، آدرس Worker را برایم بفرست تا مرحله بعد (تست ورود و همگام‌سازی) را چک کنیم.**
