-- Market Platform Schema v2 - Initial Migration
-- Compatible with Cloudflare D1

PRAGMA foreign_keys = ON;

-- =====================================================
-- 1. USERS & ACCESS
-- =====================================================

CREATE TABLE IF NOT EXISTS users (
  id                INTEGER PRIMARY KEY,
  phone             TEXT UNIQUE,
  first_name        TEXT,
  last_name         TEXT,
  username          TEXT,
  is_buyer          INTEGER NOT NULL DEFAULT 1,
  is_seller         INTEGER NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'active',
  referral_code     TEXT UNIQUE,
  referred_by       INTEGER REFERENCES users(id),
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id           INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  city_id           INTEGER,
  city_name         TEXT,
  bio               TEXT,
  avatar_url        TEXT,
  reputation_score  INTEGER NOT NULL DEFAULT 80,
  badges_json       TEXT DEFAULT '[]',
  notification_prefs TEXT DEFAULT '{"sms":true,"telegram":true,"in_app":true,"whatsapp":false,"bale":false}',
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_wallets (
  user_id           INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance           INTEGER NOT NULL DEFAULT 0,
  locked_balance    INTEGER NOT NULL DEFAULT 0,
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subscription_plans (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  code              TEXT NOT NULL UNIQUE,
  title             TEXT NOT NULL,
  price_monthly     INTEGER NOT NULL DEFAULT 0,
  price_yearly      INTEGER NOT NULL DEFAULT 0,
  benefits_json     TEXT,
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
  is_fixed          INTEGER NOT NULL DEFAULT 1,
  status            TEXT NOT NULL DEFAULT 'active',
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id       INTEGER REFERENCES categories(id),
  title             TEXT NOT NULL,
  description       TEXT,
  brand             TEXT,
  attributes_json   TEXT,
  status            TEXT NOT NULL DEFAULT 'active',
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
  ai_result_json    TEXT,
  ai_score          REAL,
  status            TEXT NOT NULL DEFAULT 'pending_ai',
  source            TEXT DEFAULT 'seller_submission',
  admin_id          INTEGER REFERENCES users(id),
  admin_note        TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  reviewed_at       TEXT
);

CREATE TABLE IF NOT EXISTS user_favorites (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id           INTEGER NOT NULL REFERENCES users(id),
  product_id        INTEGER NOT NULL REFERENCES products(id),
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, product_id)
);

-- =====================================================
-- 3. REQUESTS & OFFERS
-- =====================================================

CREATE TABLE IF NOT EXISTS requests (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  requester_id      INTEGER NOT NULL REFERENCES users(id),
  city_id           INTEGER,
  city_name         TEXT,
  is_bulk           INTEGER NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'open',
  publish_mode      TEXT DEFAULT 'separate',
  expires_at        TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS request_items (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id        INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  product_id        INTEGER REFERENCES products(id),
  title_snapshot    TEXT NOT NULL,
  quantity          INTEGER NOT NULL DEFAULT 1,
  notes             TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS request_offers (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id        INTEGER NOT NULL REFERENCES requests(id),
  request_item_id   INTEGER REFERENCES request_items(id),
  seller_id         INTEGER NOT NULL REFERENCES users(id),
  price             INTEGER NOT NULL,
  quantity          INTEGER NOT NULL DEFAULT 1,
  valid_until       TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'active',
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

CREATE TABLE IF NOT EXISTS contact_views (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  viewer_id         INTEGER NOT NULL REFERENCES users(id),
  viewed_user_id    INTEGER NOT NULL REFERENCES users(id),
  offer_id          INTEGER REFERENCES request_offers(id),
  request_id        INTEGER REFERENCES requests(id),
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
  status            TEXT NOT NULL DEFAULT 'pending_payment',
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
  amount            INTEGER NOT NULL,
  type              TEXT NOT NULL,
  reference_type    TEXT,
  reference_id      INTEGER,
  balance_after     INTEGER,
  description       TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS escrow_transactions (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id          INTEGER NOT NULL REFERENCES orders(id),
  amount            INTEGER NOT NULL,
  status            TEXT NOT NULL DEFAULT 'held',
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
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id             INTEGER NOT NULL REFERENCES users(id),
  offer_id            INTEGER REFERENCES request_offers(id),
  order_id            INTEGER REFERENCES orders(id),
  reason_code         TEXT NOT NULL,
  reason_text         TEXT NOT NULL,
  severity            TEXT NOT NULL DEFAULT 'medium',
  reputation_deduction INTEGER NOT NULL DEFAULT 0,
  restriction_hours   INTEGER NOT NULL DEFAULT 0,
  block_requests      INTEGER NOT NULL DEFAULT 0,
  restriction_until   TEXT,
  is_active           INTEGER NOT NULL DEFAULT 1,
  applied_by          TEXT DEFAULT 'system',
  admin_id            INTEGER REFERENCES users(id),
  admin_note          TEXT,
  created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tickets (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id           INTEGER NOT NULL REFERENCES users(id),
  subject           TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'open',
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
-- 6. LOGS & NOTIFICATIONS
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
  channel           TEXT NOT NULL,
  title             TEXT,
  body              TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending',
  sent_at           TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS otp_codes (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  phone             TEXT NOT NULL,
  code              TEXT NOT NULL,
  attempts          INTEGER NOT NULL DEFAULT 0,
  expires_at        TEXT NOT NULL,
  used              INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- =====================================================
-- INDEXES
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
CREATE INDEX IF NOT EXISTS idx_penalties_user ON penalties(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_favorites_user ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_views_viewer ON contact_views(viewer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_codes(phone, expires_at);

-- =====================================================
-- SEED DATA
-- =====================================================

INSERT OR IGNORE INTO subscription_plans (id, code, title, price_monthly, price_yearly, sort_order, benefits_json) VALUES
(1, 'free', 'رایگان', 0, 0, 1, '{"schema_version":"1.0","limits":{"max_active_requests":5,"max_monthly_offers":10,"max_active_offers":3,"max_products_in_supply":20,"max_images_per_product":3,"max_support_tickets_monthly":2,"contact_view_quota_monthly":3},"features":{"priority_support":false,"advanced_analytics":false,"bulk_request":false,"featured_profile":false,"priority_in_pool":"normal","api_access":false},"discounts":{"commission_percent":0,"featured_listing_percent":0}}'),
(2, 'silver', 'نقره‌ای', 99000, 990000, 2, '{"schema_version":"1.0","limits":{"max_active_requests":15,"max_monthly_offers":50,"max_active_offers":10,"max_products_in_supply":100,"max_images_per_product":6,"max_support_tickets_monthly":5,"contact_view_quota_monthly":15},"features":{"priority_support":false,"advanced_analytics":false,"bulk_request":true,"featured_profile":false,"priority_in_pool":"normal","api_access":false},"discounts":{"commission_percent":0,"featured_listing_percent":0}}'),
(3, 'gold', 'طلایی', 199000, 1990000, 3, '{"schema_version":"1.0","limits":{"max_active_requests":50,"max_monthly_offers":200,"max_active_offers":30,"max_products_in_supply":500,"max_images_per_product":10,"max_support_tickets_monthly":15,"contact_view_quota_monthly":50},"features":{"priority_support":true,"advanced_analytics":true,"bulk_request":true,"featured_profile":true,"priority_in_pool":"high","api_access":false},"discounts":{"commission_percent":5,"featured_listing_percent":10}}'),
(4, 'special', 'ویژه', 399000, 3990000, 4, '{"schema_version":"1.0","limits":{"max_active_requests":null,"max_monthly_offers":null,"max_active_offers":null,"max_products_in_supply":null,"max_images_per_product":15,"max_support_tickets_monthly":50,"contact_view_quota_monthly":null},"features":{"priority_support":true,"advanced_analytics":true,"bulk_request":true,"featured_profile":true,"priority_in_pool":"high","api_access":true},"discounts":{"commission_percent":10,"featured_listing_percent":20}}');
