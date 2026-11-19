/**
 * علاقه‌مندی کالا – نسخه ساده
 */

export interface Env {
  DB: D1Database;
}

export async function addFavorite(
  env: Env,
  userId: number,
  productId: number
): Promise<{ ok: true } | { ok: false; error: string }> {
  const product = await env.DB.prepare(
    `SELECT id FROM products WHERE id = ? AND status = 'active'`
  )
    .bind(productId)
    .first();

  if (!product) return { ok: false, error: "کالا یافت نشد" };

  await env.DB.prepare(
    `INSERT OR IGNORE INTO user_favorites (user_id, product_id) VALUES (?, ?)`
  )
    .bind(userId, productId)
    .run();

  return { ok: true };
}

export async function removeFavorite(
  env: Env,
  userId: number,
  productId: number
): Promise<{ ok: true } | { ok: false; error: string }> {
  await env.DB.prepare(
    `DELETE FROM user_favorites WHERE user_id = ? AND product_id = ?`
  )
    .bind(userId, productId)
    .run();

  return { ok: true };
}

export async function getMyFavorites(
  env: Env,
  userId: number
): Promise<any[]> {
  const rows = await env.DB.prepare(
    `SELECT f.product_id, f.created_at, p.title, p.brand, p.category_id
     FROM user_favorites f
     JOIN products p ON p.id = f.product_id
     WHERE f.user_id = ?
     ORDER BY f.created_at DESC
     LIMIT 100`
  )
    .bind(userId)
    .all();

  return (rows.results || []).map((r: any) => ({
    product_id: r.product_id,
    title: r.title,
    brand: r.brand,
    category_id: r.category_id,
    created_at: r.created_at,
  }));
}
