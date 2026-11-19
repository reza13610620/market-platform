/**
 * سرویس همگام‌سازی با D1 مشترک (shared-catalog)
 * Binding مورد نیاز: env.SHARED_CATALOG
 */

export interface SharedEnv {
  SHARED_CATALOG?: D1Database;
}

function db(env: SharedEnv): D1Database | null {
  return env.SHARED_CATALOG || null;
}

/** ثبت یا به‌روزرسانی کاربر مشترک با کلید شماره موبایل */
export async function upsertSharedUser(
  env: SharedEnv,
  data: {
    phone: string;
    display_name?: string | null;
    market_user_id?: number | null;
    bot_telegram_id?: number | null;
    bot_chat_id?: number | null;
    reputation_score?: number;
  }
): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  const shared = db(env);
  if (!shared) return { ok: false, error: "SHARED_CATALOG متصل نیست" };

  const phone = (data.phone || "").replace(/\D/g, "");
  if (phone.length < 10) return { ok: false, error: "شماره موبایل نامعتبر" };

  const existing = await shared
    .prepare(`SELECT id FROM shared_users WHERE phone = ?`)
    .bind(phone)
    .first<{ id: number }>();

  if (existing) {
    await shared
      .prepare(
        `UPDATE shared_users SET
          display_name = COALESCE(?, display_name),
          market_user_id = COALESCE(?, market_user_id),
          bot_telegram_id = COALESCE(?, bot_telegram_id),
          bot_chat_id = COALESCE(?, bot_chat_id),
          reputation_score = COALESCE(?, reputation_score),
          last_seen_at = datetime('now'),
          updated_at = datetime('now')
        WHERE id = ?`
      )
      .bind(
        data.display_name ?? null,
        data.market_user_id ?? null,
        data.bot_telegram_id ?? null,
        data.bot_chat_id ?? null,
        data.reputation_score ?? null,
        existing.id
      )
      .run();
    return { ok: true, id: existing.id };
  }

  const result = await shared
    .prepare(
      `INSERT INTO shared_users
       (phone, display_name, market_user_id, bot_telegram_id, bot_chat_id, reputation_score, last_seen_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
    )
    .bind(
      phone,
      data.display_name ?? null,
      data.market_user_id ?? null,
      data.bot_telegram_id ?? null,
      data.bot_chat_id ?? null,
      data.reputation_score ?? 80
    )
    .run();

  return { ok: true, id: result.meta.last_row_id as number };
}

/** ثبت یا به‌روزرسانی کالا در کاتالوگ مشترک */
export async function upsertSharedProduct(
  env: SharedEnv,
  data: {
    title: string;
    brand?: string | null;
    model?: string | null;
    category_id?: number | null;
    description?: string | null;
    attributes_json?: string | null;
    barcodes_json?: string | null;
    image_urls_json?: string | null;
    status?: string;
    source: "market" | "bot" | "both";
    market_product_id?: number | null;
    bot_node_id?: number | null;
    created_by_system: "market" | "bot";
  }
): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  const shared = db(env);
  if (!shared) return { ok: false, error: "SHARED_CATALOG متصل نیست" };

  if (!data.title?.trim()) return { ok: false, error: "عنوان کالا لازم است" };

  let existingId: number | null = null;

  if (data.market_product_id) {
    const row = await shared
      .prepare(`SELECT id FROM shared_products WHERE market_product_id = ?`)
      .bind(data.market_product_id)
      .first<{ id: number }>();
    if (row) existingId = row.id;
  }

  if (!existingId && data.bot_node_id) {
    const row = await shared
      .prepare(`SELECT id FROM shared_products WHERE bot_node_id = ?`)
      .bind(data.bot_node_id)
      .first<{ id: number }>();
    if (row) existingId = row.id;
  }

  if (existingId) {
    await shared
      .prepare(
        `UPDATE shared_products SET
          title = ?,
          brand = COALESCE(?, brand),
          model = COALESCE(?, model),
          category_id = COALESCE(?, category_id),
          description = COALESCE(?, description),
          attributes_json = COALESCE(?, attributes_json),
          barcodes_json = COALESCE(?, barcodes_json),
          image_urls_json = COALESCE(?, image_urls_json),
          status = COALESCE(?, status),
          source = CASE
            WHEN source = 'both' THEN 'both'
            WHEN source != ? THEN 'both'
            ELSE source
          END,
          market_product_id = COALESCE(?, market_product_id),
          bot_node_id = COALESCE(?, bot_node_id),
          updated_at = datetime('now')
        WHERE id = ?`
      )
      .bind(
        data.title.trim(),
        data.brand ?? null,
        data.model ?? null,
        data.category_id ?? null,
        data.description ?? null,
        data.attributes_json ?? null,
        data.barcodes_json ?? null,
        data.image_urls_json ?? null,
        data.status ?? "active",
        data.source,
        data.market_product_id ?? null,
        data.bot_node_id ?? null,
        existingId
      )
      .run();
    return { ok: true, id: existingId };
  }

  const result = await shared
    .prepare(
      `INSERT INTO shared_products
       (title, brand, model, category_id, description, attributes_json, barcodes_json,
        image_urls_json, status, source, market_product_id, bot_node_id, created_by_system)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      data.title.trim(),
      data.brand ?? null,
      data.model ?? null,
      data.category_id ?? null,
      data.description ?? null,
      data.attributes_json ?? null,
      data.barcodes_json ?? null,
      data.image_urls_json ?? null,
      data.status ?? "active",
      data.source,
      data.market_product_id ?? null,
      data.bot_node_id ?? null,
      data.created_by_system
    )
    .run();

  return { ok: true, id: result.meta.last_row_id as number };
}

/** ثبت یا تمدید اشتراک مشترک */
export async function upsertSharedSubscription(
  env: SharedEnv,
  data: {
    phone: string;
    plan_code: string;
    plan_name?: string | null;
    source: "market" | "bot";
    starts_at: string;
    expires_at: string;
    benefits_json?: string | null;
    market_sub_id?: number | null;
    bot_sub_id?: number | null;
  }
): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  const shared = db(env);
  if (!shared) return { ok: false, error: "SHARED_CATALOG متصل نیست" };

  const phone = (data.phone || "").replace(/\D/g, "");
  if (phone.length < 10) return { ok: false, error: "شماره موبایل نامعتبر" };

  // اشتراک‌های فعال قبلی همین کاربر را غیرفعال کن
  await shared
    .prepare(
      `UPDATE shared_subscriptions SET is_active = 0, updated_at = datetime('now')
       WHERE phone = ? AND is_active = 1`
    )
    .bind(phone)
    .run();

  const result = await shared
    .prepare(
      `INSERT INTO shared_subscriptions
       (phone, plan_code, plan_name, source, starts_at, expires_at, is_active, benefits_json, market_sub_id, bot_sub_id)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`
    )
    .bind(
      phone,
      data.plan_code,
      data.plan_name ?? null,
      data.source,
      data.starts_at,
      data.expires_at,
      data.benefits_json ?? null,
      data.market_sub_id ?? null,
      data.bot_sub_id ?? null
    )
    .run();

  return { ok: true, id: result.meta.last_row_id as number };
}

/** خواندن اشتراک فعال کاربر با شماره موبایل */
export async function getActiveSharedSubscription(
  env: SharedEnv,
  phone: string
): Promise<any | null> {
  const shared = db(env);
  if (!shared) return null;

  const normalized = phone.replace(/\D/g, "");
  const row = await shared
    .prepare(
      `SELECT * FROM shared_subscriptions
       WHERE phone = ? AND is_active = 1 AND (expires_at IS NULL OR expires_at > datetime('now'))
       ORDER BY id DESC LIMIT 1`
    )
    .bind(normalized)
    .first();

  return row || null;
}
