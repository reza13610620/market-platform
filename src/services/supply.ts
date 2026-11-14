/**
 * Seller Supply List service
 * کالاهایی که فروشنده می‌تواند تأمین کند
 */

export interface Env {
  DB: D1Database;
}

export async function addToSupplyList(
  env: Env,
  sellerId: number,
  productId: number,
  notes?: string | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  // Check product exists
  const product = await env.DB.prepare(
    `SELECT id, title, status FROM products WHERE id = ?`
  ).bind(productId).first<{ id: number; title: string; status: string }>();

  if (!product) {
    return { ok: false, error: "کالا یافت نشد" };
  }
  if (product.status !== "active") {
    return { ok: false, error: "این کالا فعال نیست" };
  }

  // Check if already in list
  const existing = await env.DB.prepare(
    `SELECT id FROM seller_supply_list WHERE seller_id = ? AND product_id = ?`
  ).bind(sellerId, productId).first();

  if (existing) {
    // Reactivate if was inactive
    await env.DB.prepare(
      `UPDATE seller_supply_list SET is_active = 1, notes = ? WHERE seller_id = ? AND product_id = ?`
    ).bind(notes?.trim() || null, sellerId, productId).run();
    return { ok: true };
  }

  await env.DB.prepare(
    `INSERT INTO seller_supply_list (seller_id, product_id, notes, is_active)
     VALUES (?, ?, ?, 1)`
  ).bind(sellerId, productId, notes?.trim() || null).run();

  // Also mark user as seller if not already
  await env.DB.prepare(
    `UPDATE users SET is_seller = 1, updated_at = datetime('now') WHERE id = ? AND is_seller = 0`
  ).bind(sellerId).run();

  return { ok: true };
}

export async function removeFromSupplyList(
  env: Env,
  sellerId: number,
  productId: number
): Promise<{ ok: true } | { ok: false; error: string }> {
  const result = await env.DB.prepare(
    `UPDATE seller_supply_list SET is_active = 0 WHERE seller_id = ? AND product_id = ?`
  ).bind(sellerId, productId).run();

  if (result.meta.changes === 0) {
    return { ok: false, error: "این کالا در لیست تأمین شما نیست" };
  }

  return { ok: true };
}

export async function getMySupplyList(
  env: Env,
  sellerId: number
): Promise<any[]> {
  const rows = await env.DB.prepare(
    `SELECT 
       s.id,
       s.product_id,
       s.notes,
       s.is_active,
       s.created_at,
       p.title,
       p.brand,
       p.status as product_status
     FROM seller_supply_list s
     JOIN products p ON p.id = s.product_id
     WHERE s.seller_id = ? AND s.is_active = 1
     ORDER BY s.created_at DESC`
  ).bind(sellerId).all();

  return rows.results || [];
}
