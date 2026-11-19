# دیتابیس مشترک کاتالوگ (Shared D1) – نسخه ۱

**تاریخ:** ۲۰۲۶-۱۱-۱۹  
**تصمیم:** گزینه A تأیید شد توسط رضا  
**وضعیت:** طراحی نهایی – آماده پیاده‌سازی

---

## ۱. هدف

یک دیتابیس D1 مشترک فقط برای **کاتالوگ کالا** تا:
- هر کالایی که در مارکت‌پلتفرم تأیید شود → در ربات هم قابل استفاده باشد
- هر کالایی که در ربات تأیید شود → در مارکت هم دیده شود
- از تکراری بودن و ناهماهنگی جلوگیری شود

---

## ۲. معماری ساده

```
┌─────────────────────┐          ┌─────────────────────┐
│  مارکت‌پلتفرم        │          │  ربات Foo            │
│  (Worker + D1 اصلی) │          │  (Worker + D1 اصلی)  │
└──────────┬──────────┘          └──────────┬──────────┘
           │                                │
           │     binding مشترک              │
           └────────────┬───────────────────┘
                        │
                        ▼
              ┌───────────────────┐
              │  shared-catalog   │
              │  (D1 مشترک)       │
              └───────────────────┘
```

- هر پروژه D1 اصلی خودش را برای کاربران، سفارش، تیکت و ... نگه می‌دارد.
- فقط **کالا و دسته‌بندی** در `shared-catalog` مشترک است.

---

## ۳. جداول پیشنهادی Shared D1

### 3.1 `shared_categories`

```sql
CREATE TABLE IF NOT EXISTS shared_categories (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id     INTEGER REFERENCES shared_categories(id),
  name          TEXT NOT NULL,
  slug          TEXT,
  path          TEXT,              -- مثلاً: لوازم کافه / آسیاب
  sort_order    INTEGER DEFAULT 0,
  is_active     INTEGER DEFAULT 1,
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_shared_cat_parent ON shared_categories(parent_id);
```

### 3.2 `shared_products`

```sql
CREATE TABLE IF NOT EXISTS shared_products (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  title               TEXT NOT NULL,
  brand               TEXT,
  model               TEXT,
  category_id         INTEGER REFERENCES shared_categories(id),
  description         TEXT,
  attributes_json     TEXT,           -- مشخصات فنی استاندارد
  barcodes_json       TEXT,           -- ["6260...", "..."]
  image_urls_json     TEXT,
  status              TEXT DEFAULT 'active',  -- active | inactive | pending
  source              TEXT NOT NULL,  -- 'market' | 'bot' | 'both'
  market_product_id   INTEGER,        -- id در جدول products مارکت (اگر وجود دارد)
  bot_node_id         INTEGER,        -- id نود کاتالوگ ربات (اگر وجود دارد)
  created_by_system   TEXT,           -- 'market' | 'bot'
  created_at          TEXT DEFAULT (datetime('now')),
  updated_at          TEXT DEFAULT (datetime('now')),
  UNIQUE(market_product_id),
  UNIQUE(bot_node_id)
);

CREATE INDEX IF NOT EXISTS idx_shared_prod_status ON shared_products(status);
CREATE INDEX IF NOT EXISTS idx_shared_prod_category ON shared_products(category_id);
CREATE INDEX IF NOT EXISTS idx_shared_prod_title ON shared_products(title);
```

### 3.3 `shared_sync_log` (اختیاری ولی مفید)

```sql
CREATE TABLE IF NOT EXISTS shared_sync_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  action        TEXT NOT NULL,   -- create | update | deactivate
  product_id    INTEGER,
  source_system TEXT,            -- market | bot
  details_json  TEXT,
  created_at    TEXT DEFAULT (datetime('now'))
);
```

---

## ۴. جریان کار

### وقتی کالا در مارکت تأیید می‌شود:
1. کالا در جدول `products` مارکت ذخیره می‌شود (مثل الان).
2. همزمان (یا بلافاصله بعد) در `shared_products` هم upsert می‌شود.
3. `source = 'market'` یا اگر قبلاً از ربات آمده بود → `'both'`.
4. `market_product_id` پر می‌شود.

### وقتی کالا در ربات تأیید می‌شود:
1. در کاتالوگ ربات ثبت می‌شود.
2. همزمان در `shared_products` upsert می‌شود.
3. `bot_node_id` پر می‌شود.
4. مارکت می‌تواند بعداً از shared بخواند و در صورت نیاز `products` خودش را هم بسازد.

### خواندن:
- مارکت برای جستجو و ثبت درخواست می‌تواند از shared هم استفاده کند (یا کپی محلی).
- ربات همین‌طور.

---

## ۵. تنظیمات Cloudflare

### ساخت D1 مشترک:
```bash
wrangler d1 create shared-catalog
```

### در `wrangler.toml` هر دو پروژه:
```toml
[[d1_databases]]
binding = "SHARED_CATALOG"
database_name = "shared-catalog"
database_id = "<ID_از_خروجی_دستور_بالا>"
```

### در Env تایپ‌اسکریپت:
```ts
interface Env {
  DB: D1Database;              // دیتابیس اصلی پروژه
  SHARED_CATALOG: D1Database;  // دیتابیس مشترک کاتالوگ
}
```

---

## ۶. قوانین مهم

1. **منبع حقیقت برای تأیید نهایی:** فعلاً هر سیستم قوانین تأیید خودش را دارد. بعد از تأیید محلی، در shared ثبت می‌شود.
2. **جلوگیری از تکراری:** با `market_product_id` و `bot_node_id` و در صورت امکان بارکد.
3. **حذف فیزیکی نکنید:** فقط `status = 'inactive'`.
4. **دسته‌بندی:** در مرحله اول می‌توان دسته‌بندی‌ها را دستی یا نیمه‌خودکار مپ کرد. بعداً همگام کامل می‌شود.
5. **مهاجرت اولیه:** یک‌بار اسکریپت می‌نویسیم که کالاهای فعلی مارکت و ربات را به shared منتقل کند.

---

## ۷. مراحل پیاده‌سازی پیشنهادی

| مرحله | کار | پروژه |
|--------|-----|--------|
| 1 | ساخت D1 به نام `shared-catalog` + اجرای SQL بالا | Cloudflare Dashboard / Wrangler |
| 2 | اضافه کردن binding در `wrangler.toml` مارکت | market-platform |
| 3 | تابع `upsertSharedProduct` در مارکت | market-platform |
| 4 | صدا زدن آن بعد از approve کالا | market-platform |
| 5 | اضافه کردن binding در ربات | Foo bot |
| 6 | تابع مشابه در ربات + مهاجرت اولیه | Foo bot |
| 7 | تست دوطرفه | هر دو |

---

## ۸. مرحله بعدی فوری

بعد از تأیید این سند توسط شما:
1. SQL نهایی را در `docs/database/shared_catalog_schema_v1.sql` می‌گذارم.
2. کد `upsertSharedProduct` را در مارکت پیاده می‌کنم.
3. راهنمای دقیق اتصال binding را می‌دهم.

---

**وضعیت:** طراحی گزینه A نهایی و ثبت شد.
