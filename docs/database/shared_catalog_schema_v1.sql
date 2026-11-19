-- Shared Catalog D1 Schema v1
-- Database name: shared-catalog
-- Binding name in Workers: SHARED_CATALOG

CREATE TABLE IF NOT EXISTS shared_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id INTEGER REFERENCES shared_categories(id),
  name TEXT NOT NULL,
  slug TEXT,
  path TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_shared_cat_parent ON shared_categories(parent_id);

CREATE TABLE IF NOT EXISTS shared_products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  category_id INTEGER REFERENCES shared_categories(id),
  description TEXT,
  attributes_json TEXT,
  barcodes_json TEXT,
  image_urls_json TEXT,
  status TEXT DEFAULT 'active',
  source TEXT NOT NULL,
  market_product_id INTEGER,
  bot_node_id INTEGER,
  created_by_system TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(market_product_id),
  UNIQUE(bot_node_id)
);

CREATE INDEX IF NOT EXISTS idx_shared_prod_status ON shared_products(status);
CREATE INDEX IF NOT EXISTS idx_shared_prod_category ON shared_products(category_id);
CREATE INDEX IF NOT EXISTS idx_shared_prod_title ON shared_products(title);

CREATE TABLE IF NOT EXISTS shared_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT NOT NULL UNIQUE,
  display_name TEXT,
  market_user_id INTEGER,
  bot_telegram_id INTEGER,
  bot_chat_id INTEGER,
  reputation_score INTEGER DEFAULT 80,
  is_active INTEGER DEFAULT 1,
  last_seen_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_shared_users_phone ON shared_users(phone);
CREATE INDEX IF NOT EXISTS idx_shared_users_market ON shared_users(market_user_id);
CREATE INDEX IF NOT EXISTS idx_shared_users_telegram ON shared_users(bot_telegram_id);

CREATE TABLE IF NOT EXISTS shared_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT NOT NULL,
  plan_code TEXT NOT NULL,
  plan_name TEXT,
  source TEXT,
  starts_at TEXT,
  expires_at TEXT,
  is_active INTEGER DEFAULT 1,
  benefits_json TEXT,
  market_sub_id INTEGER,
  bot_sub_id INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_shared_sub_phone ON shared_subscriptions(phone);
CREATE INDEX IF NOT EXISTS idx_shared_sub_active ON shared_subscriptions(phone, is_active);

CREATE TABLE IF NOT EXISTS shared_sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id INTEGER,
  source_system TEXT,
  details_json TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
