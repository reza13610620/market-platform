# راهنمای کامل ساخت Shared D1 در Cloudflare

**تاریخ:** ۲۰۲۶-۱۱-۱۹  
**برای:** رضا  
**هدف:** دیتابیس مشترک کالا + امکان اشتراک کاربران با شماره موبایل

---

## بخش ۱ – ساخت دیتابیس مشترک (از داشبورد Cloudflare)

### مرحله ۱: ورود
1. برو به: [https://dash.cloudflare.com](https://dash.cloudflare.com)
2. وارد حساب خودت شو.

### مرحله ۲: ساخت D1
1. از منوی سمت چپ برو به **Workers & Pages**
2. روی تب **D1** کلیک کن (یا از منوی فرعی D1 را انتخاب کن)
3. دکمه **Create database** را بزن
4. این مقادیر را وارد کن:
   - **Database name:** `shared-catalog`
   - (Location را پیش‌فرض بگذار مگر ترجیح خاصی داشته باشی)
5. روی **Create** کلیک کن

### مرحله ۳: کپی کردن Database ID
بعد از ساخته شدن:
- روی دیتابیس `shared-catalog` کلیک کن
- در بالای صفحه یا در بخش Settings یک **Database ID** می‌بینی (یک رشته شبیه UUID)
- آن را کپی کن و جایی ذخیره کن (بعداً لازم است)

---

## بخش ۲ – اجرای جدول‌ها (SQL)

### روش پیشنهادی (از همان داشبورد):
1. داخل دیتابیس `shared-catalog` برو
2. تب **Console** را باز کن
3. کل کد SQL زیر را کپی کن و در Console بچسبان
4. دکمه **Run** را بزن

```sql
-- دسته‌بندی مشترک
CREATE TABLE IF NOT EXISTS shared_categories (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id     INTEGER REFERENCES shared_categories(id),
  name          TEXT NOT NULL,
  slug          TEXT,
  path          TEXT,
  sort_order    INTEGER DEFAULT 0,
  is_active     INTEGER DEFAULT 1,
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_shared_cat_parent ON shared_categories(parent_id);

-- کالاهای مشترک
CREATE TABLE IF NOT EXISTS shared_products (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  title               TEXT NOT NULL,
  brand               TEXT,
  model               TEXT,
  category_id         INTEGER REFERENCES shared_categories(id),
  description         TEXT,
  attributes_json     TEXT,
  barcodes_json       TEXT,
  image_urls_json     TEXT,
  status              TEXT DEFAULT 'active',
  source              TEXT NOT NULL,
  market_product_id   INTEGER,
  bot_node_id         INTEGER,
  created_by_system   TEXT,
  created_at          TEXT DEFAULT (datetime('now')),
  updated_at          TEXT DEFAULT (datetime('now')),
  UNIQUE(market_product_id),
  UNIQUE(bot_node_id)
);

CREATE INDEX IF NOT EXISTS idx_shared_prod_status ON shared_products(status);
CREATE INDEX IF NOT EXISTS idx_shared_prod_category ON shared_products(category_id);
CREATE INDEX IF NOT EXISTS idx_shared_prod_title ON shared_products(title);

-- کاربران مشترک (کلید اصلی: شماره موبایل)
CREATE TABLE IF NOT EXISTS shared_users (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  phone             TEXT NOT NULL UNIQUE,          -- کلید اصلی اتصال دو سیستم
  display_name      TEXT,
  market_user_id    INTEGER,                      -- id در مارکت (اگر وجود دارد)
  bot_telegram_id   INTEGER,                      -- telegram user id در ربات (اگر وجود دارد)
  bot_chat_id       INTEGER,
  reputation_score  INTEGER DEFAULT 80,
  is_active         INTEGER DEFAULT 1,
  last_seen_at      TEXT,
  created_at        TEXT DEFAULT (datetime('now')),
  updated_at        TEXT DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_shared_users_phone ON shared_users(phone);
CREATE INDEX IF NOT EXISTS idx_shared_users_market ON shared_users(market_user_id);
CREATE INDEX IF NOT EXISTS idx_shared_users_telegram ON shared_users(bot_telegram_id);

-- لاگ همگام‌سازی
CREATE TABLE IF NOT EXISTS shared_sync_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  action        TEXT NOT NULL,
  entity_type   TEXT,           -- product | user | category
  entity_id     INTEGER,
  source_system TEXT,           -- market | bot
  details_json  TEXT,
  created_at    TEXT DEFAULT (datetime('now'))
);
```

اگر خطایی ندید و «Success» آمد، جدول‌ها ساخته شده‌اند.

---

## بخش ۳ – وصل کردن دیتابیس به Worker مارکت‌پلتفرم

### از داشبورد Cloudflare:
1. برو به **Workers & Pages**
2. Worker مربوط به مارکت‌پلتفرم را پیدا کن و باز کن
3. برو به تب **Settings**
4. بخش **Bindings** را پیدا کن
5. روی **Add** → **D1 database binding** کلیک کن
6. این مقادیر را وارد کن:
   - **Variable name:** `SHARED_CATALOG`
   - **D1 database:** `shared-catalog` را از لیست انتخاب کن
7. **Save** را بزن

### اگر از wrangler.toml استفاده می‌کنی (روش حرفه‌ای):
در فایل `wrangler.toml` پروژه مارکت این بخش را اضافه کن:

```toml
[[d1_databases]]
binding = "SHARED_CATALOG"
database_name = "shared-catalog"
database_id = "اینجا-Database-ID-را-بگذار"
```

بعد:
```bash
wrangler deploy
```

---

## بخش ۴ – وصل کردن به Worker ربات Foo

دقیقاً همان کار بخش ۳ را برای Worker ربات انجام بده:
- Variable name دوباره: `SHARED_CATALOG`
- همان دیتابیس `shared-catalog`

هر دو Worker باید به **یک دیتابیس** وصل باشند.

---

## بخش ۵ – اشتراک کاربران با شماره موبایل

### ایده ساده و عملی:
- **شماره موبایل** کلید مشترک است.
- وقتی کاربر در مارکت با OTP وارد می‌شود → در `shared_users` با `phone` ثبت/به‌روز می‌شود و `market_user_id` پر می‌شود.
- وقتی همان شماره در ربات شناسایی شد (یا کاربر شماره داد) → `bot_telegram_id` پر می‌شود.
- بعداً می‌توان امتیاز اعتبار، نام نمایشی و وضعیت را بین دو سیستم هم‌خوان کرد.

### نکته مهم:
ربات الان بیشتر با Telegram ID کار می‌کند. برای اتصال کامل:
- یا از کاربر در ربات شماره موبایل بگیریم (با تأیید OTP یا دکمه تماس)
- یا فعلاً فقط کسانی که در هر دو جا شماره یکسان دارند به هم وصل شوند

این کار را می‌توان مرحله‌ای انجام داد:
1. اول فقط کالا مشترک شود
2. بعد کاربران با شماره موبایل

---

## بخش ۶ – بعد از انجام مراحل بالا چه کار کنیم؟

به من بگو:
1. دیتابیس `shared-catalog` ساخته شد؟
2. Database ID را داری؟ (اختیاری ولی مفید)
3. Binding با نام `SHARED_CATALOG` به Worker مارکت وصل شد؟

بعد از تأیید تو، کدهای لازم را در مارکت‌پلتفرم می‌نویسم تا:
- بعد از تأیید کالا → خودکار در shared ثبت شود
- هنگام ورود کاربر با موبایل → در shared_users هم ثبت/به‌روز شود

---

## خلاصه خیلی کوتاه کارهایی که الان باید بکنی

1. Cloudflare Dashboard → Workers & Pages → D1 → Create database → نام: `shared-catalog`
2. داخل همان دیتابیس → Console → SQL بالا را Run کن
3. Worker مارکت → Settings → Bindings → Add D1 → Variable name: `SHARED_CATALOG` → انتخاب `shared-catalog`
4. همین Binding را برای Worker ربات هم بگذار
5. به من خبر بده تا کد را بنویسم

---

**این راهنما در ریپو هم ثبت شد.**
