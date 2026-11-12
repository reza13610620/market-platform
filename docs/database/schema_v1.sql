-- Market Platform - Core Database Schema v1
-- Compatible with SQLite / Cloudflare D1
-- Idempotent: safe to run multiple times
-- Last updated: 2026-11-12

PRAGMA foreign_keys = ON;

-- =====================================================
-- 1. USERS & ACCESS
-- =====================================================

CREATE TABLE IF NOT EXISTS users (
  id                INTEGER PRIMARY KEY,                  -- Telegram user_id or internal ID
  phone             TEXT UNIQUE,                          -- normalized mobile
  first_name        TEXT,
  last_name         TEXT,
  username          TEXT,
  is_buyer          INTEGER NOT NULL DEFAULT 1,
  is_seller         INTEGER NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'active',       -- active | suspended | banned
  referral_code     TEXT UNIQUE,
  referred_by       INTEGER REFERENCES users(id),
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id           INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  city_id           INTEGER,
  city_name         TEXT,
  notification_prefs TEXT DEFAULT '{"sms":true,"telegram":true,"in_app":true}', -- JSON
  bio               TEXT,
  avatar_url        TEXT,
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_wallets (
  user_id           INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance           INTEGER NOT NULL DEFAULT 0,           -- in Toman (smallest unit)
  locked_balance    INTEGER NOT NULL DEFAULT 0,           -- money in escrow or pending
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subscription_plans (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  code              TEXT NOT NULL UNIQUE,                 -- free | silver | gold | special
  title             TEXT NOT NULL,
  price_monthly     INTEGER NOT NULL DEFAULT 0,
  price_yearly      INTEGER NOT NULL DEFAULT 0,
  benefits_json     TEXT,                                 -- JSON of benefits
  is_active         INTEGER NOT NULL DEFAULT 1,
  sort_order        INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_subscriptions (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id           INTEGER NOT NULL REFERENCES users(id),
  plan_id           INTEGER NOT NULL REFERENCES subscription_plans(id),
  starts_at         TEXT NOT NULL,
  ends_at           TEXT NOT NULL,
  is_active         INTEGER NOT NULL DEFAULT 1,
  payment_ref       TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- =====================================================
-- 2. CATALOG & PRODUCTS
-- =====================================================

CREATE TABLE IF NOT EXISTS categories (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id         INTEGER REFERENCES categories(id),
  title             TEXT NOT NULL,
  slug              TEXT,
  is_fixed          INTEGER NOT NULL DEFAULT 1,           -- 1 = admin fixed, 0 = user suggested
  status            TEXT NOT NULL DEFAULT 'active',       -- active | pending | rejected
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id       INTEGER REFERENCES categories(id),
  title             TEXT NOT NULL,
  description       TEXT,
  brand             TEXT,
  attributes_json   TEXT,                                 -- flexible specs
  status            TEXT NOT NULL DEFAULT 'active',       -- active | inactive | archived
  created_by        INTEGER REFERENCES users(id),
  approved_by       INTEGER REFERENCES users(id),
  approved_at       TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS product_barcodes (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id        INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  barcode           TEXT NOT NULL UNIQUE,
  barcode_type      TEXT DEFAULT 'ean13',
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS seller_supply_list (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  seller_id         INTEGER NOT NULL REFERENCES users(id),
  product_id        INTEGER NOT NULL REFERENCES products(id),
  notes             TEXT,
  is_active         INTEGER NOT NULL DEFAULT 1,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(seller_id, product_id)
);

CREATE TABLE IF NOT EXISTS product_review_queue (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  submitted_by      INTEGER NOT NULL REFERENCES users(id),
  title             TEXT NOT NULL,
  description       TEXT,
  category_id       INTEGER,
  attributes_json   TEXT,
  barcodes_json     TEXT,
  ai_result_json    TEXT,                                 -- AI review output
  ai_score          REAL,
  status            TEXT NOT NULL DEFAULT 'pending_ai',   -- pending_ai | pending_admin | approved | rejected
  admin_id          INTEGER REFERENCES users(id),
  admin_note        TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  reviewed_at       TEXT
);

-- =====================================================
-- 3. REQUESTS & OFFERS (Core)
-- =====================================================

CREATE TABLE IF NOT EXISTS requests (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  requester_id      INTEGER NOT NULL REFERENCES users(id),
  city_id           INTEGER,
  city_name         TEXT,
  is_bulk           INTEGER NOT NULL DEFAULT 0,           -- 1 = multi-product request
  status            TEXT NOT NULL DEFAULT 'open',         -- open | matched | cancelled | expired | completed
  publish_mode      TEXT DEFAULT 'separate',              -- separate | together
  expires_at        TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS request_items (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id        INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  product_id        INTEGER REFERENCES products(id),
  title_snapshot    TEXT NOT NULL,                        -- in case product changes later
  quantity          INTEGER NOT NULL DEFAULT 1,
  notes             TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS request_offers (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id        INTEGER NOT NULL REFERENCES requests(id),
  request_item_id   INTEGER REFERENCES request_items(id),
  seller_id         INTEGER NOT NULL REFERENCES users(id),
  price             INTEGER NOT NULL,                     -- unit price in Toman
  quantity          INTEGER NOT NULL DEFAULT 1,
  valid_until       TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'active',       -- active | accepted | rejected | expired | cancelled_with_penalty
  penalty_applied   INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS request_status_history (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id        INTEGER NOT NULL REFERENCES requests(id),
  old_status        TEXT,
  new_status        TEXT NOT NULL,
  changed_by        INTEGER REFERENCES users(id),
  note              TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- =====================================================
-- 4. ORDERS, ESCROW & WALLET
-- =====================================================

CREATE TABLE IF NOT EXISTS orders (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id        INTEGER NOT NULL REFERENCES requests(id),
  offer_id          INTEGER NOT NULL REFERENCES request_offers(id),
  buyer_id          INTEGER NOT NULL REFERENCES users(id),
  seller_id         INTEGER NOT NULL REFERENCES users(id),
  total_amount      INTEGER NOT NULL,
  commission_amount INTEGER NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'pending_payment', -- pending_payment | paid | shipped | delivered | completed | disputed | cancelled
  tracking_code     TEXT,
  shipped_at        TEXT,
  delivered_at      TEXT,
  completed_at      TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id           INTEGER NOT NULL REFERENCES users(id),
  amount            INTEGER NOT NULL,                     -- positive = credit, negative = debit
  type              TEXT NOT NULL,                        -- deposit | payment | release | commission | penalty | refund
  reference_type    TEXT,                                 -- order | request_offer | admin | ...
  reference_id      INTEGER,
  balance_after     INTEGER,
  description       TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS escrow_transactions (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id          INTEGER NOT NULL REFERENCES orders(id),
  amount            INTEGER NOT NULL,
  status            TEXT NOT NULL DEFAULT 'held',         -- held | released_to_seller | refunded_to_buyer
  released_at       TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- =====================================================
-- 5. TRUST, SUPPORT & PENALTIES
-- =====================================================

CREATE TABLE IF NOT EXISTS reviews (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id          INTEGER NOT NULL REFERENCES orders(id),
  reviewer_id       INTEGER NOT NULL REFERENCES users(id),
  reviewee_id       INTEGER NOT NULL REFERENCES users(id),
  rating            INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  comment           TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(order_id, reviewer_id)
);

CREATE TABLE IF NOT EXISTS penalties (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id           INTEGER NOT NULL REFERENCES users(id),
  offer_id          INTEGER REFERENCES request_offers(id),
  reason            TEXT NOT NULL,
  restriction_until TEXT,                                 -- temporary ban on offering
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tickets (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id           INTEGER NOT NULL REFERENCES users(id),
  subject           TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'open',         -- open | in_progress | closed
  priority          TEXT DEFAULT 'normal',
  assigned_admin    INTEGER REFERENCES users(id),
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ticket_messages (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id         INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  sender_id         INTEGER NOT NULL REFERENCES users(id),
  message           TEXT NOT NULL,
  is_admin          INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reports (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  reporter_id       INTEGER NOT NULL REFERENCES users(id),
  reported_user_id  INTEGER REFERENCES users(id),
  order_id          INTEGER REFERENCES orders(id),
  reason            TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending',
  admin_note        TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- =====================================================
-- 6. LOGS, ADMIN & NOTIFICATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS activity_logs (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id           INTEGER,
  action            TEXT NOT NULL,
  entity_type       TEXT,
  entity_id         INTEGER,
  meta_json         TEXT,
  ip                TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id           INTEGER NOT NULL REFERENCES users(id),
  channel           TEXT NOT NULL,                        -- sms | telegram | in_app
  title             TEXT,
  body              TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending',      -- pending | sent | failed
  sent_at           TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- =====================================================
-- INDEXES (critical for pool performance)
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_requests_status_created ON requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requests_city_status ON requests(city_id, status);
CREATE INDEX IF NOT EXISTS idx_request_items_product ON request_items(product_id);
CREATE INDEX IF NOT EXISTS idx_request_offers_request ON request_offers(request_id, status);
CREATE INDEX IF NOT EXISTS idx_request_offers_seller ON request_offers(seller_id, status);
CREATE INDEX IF NOT EXISTS idx_seller_supply_seller ON seller_supply_list(seller_id, is_active);
CREATE INDEX IF NOT EXISTS idx_seller_supply_product ON seller_supply_list(product_id, is_active);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id, status);
CREATE INDEX IF NOT EXISTS idx_product_barcodes_code ON product_barcodes(barcode);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_user ON wallet_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_seller ON orders(seller_id, status);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_type, entity_id);

-- =====================================================
-- SEED: Basic subscription plans (example)
-- =====================================================

INSERT OR IGNORE INTO subscription_plans (id, code, title, price_monthly, price_yearly, sort_order) VALUES
(1, 'free',    'رایگان',     0,      0,      1),
(2, 'silver',  'نقره‌ای',  99000,  990000,  2),
(3, 'gold',    'طلایی',   199000, 1990000,  3),
(4, 'special', 'ویژه',    399000, 3990000,  4);
