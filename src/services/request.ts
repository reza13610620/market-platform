/**
 * Request service - create and list buyer requests
 */

export interface Env {
  DB: D1Database;
}

export interface CreateRequestItem {
  product_id?: number | null;
  title: string;
  quantity?: number;
  notes?: string | null;
}

export interface CreateRequestInput {
  city_name?: string | null;
  is_bulk?: boolean;
  expires_in_hours?: number; // default 48
  items: CreateRequestItem[];
}

export async function createRequest(
  env: Env,
  userId: number,
  input: CreateRequestInput
): Promise<{ ok: true; requestId: number } | { ok: false; error: string }> {
  if (!input.items || input.items.length === 0) {
    return { ok: false, error: "حداقل یک کالا باید مشخص شود" };
  }

  // Validate items
  for (const item of input.items) {
    if (!item.title || item.title.trim().length < 2) {
      return { ok: false, error: "عنوان کالا نامعتبر است" };
    }
    if (item.quantity !== undefined && (item.quantity < 1 || item.quantity > 10000)) {
      return { ok: false, error: "تعداد کالا نامعتبر است" };
    }
  }

  const isBulk = input.is_bulk || input.items.length > 1 ? 1 : 0;
  const expiresHours = input.expires_in_hours || 48;
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + expiresHours);

  // Create request
  const result = await env.DB.prepare(
    `INSERT INTO requests (requester_id, city_name, is_bulk, status, expires_at)
     VALUES (?, ?, ?, 'open', ?)`
  ).bind(
    userId,
    input.city_name?.trim() || null,
    isBulk,
    expiresAt.toISOString()
  ).run();

  const requestId = result.meta.last_row_id as number;

  // Insert items
  const stmt = env.DB.prepare(
    `INSERT INTO request_items (request_id, product_id, title_snapshot, quantity, notes)
     VALUES (?, ?, ?, ?, ?)`
  );

  const batch = input.items.map((item) =>
    stmt.bind(
      requestId,
      item.product_id || null,
      item.title.trim(),
      item.quantity || 1,
      item.notes?.trim() || null
    )
  );

  await env.DB.batch(batch);

  return { ok: true, requestId };
}

export async function getMyRequests(
  env: Env,
  userId: number,
  limit = 20,
  offset = 0
): Promise<any[]> {
  const requests = await env.DB.prepare(
    `SELECT id, city_name, is_bulk, status, expires_at, created_at
     FROM requests
     WHERE requester_id = ?
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`
  ).bind(userId, limit, offset).all();

  const result = [];

  for (const req of requests.results || []) {
    const items = await env.DB.prepare(
      `SELECT id, product_id, title_snapshot, quantity, notes
       FROM request_items WHERE request_id = ?`
    ).bind(req.id).all();

    // Count offers
    const offerCount = await env.DB.prepare(
      `SELECT COUNT(*) as count FROM request_offers WHERE request_id = ? AND status = 'active'`
    ).bind(req.id).first<{ count: number }>();

    result.push({
      id: req.id,
      city_name: req.city_name,
      is_bulk: !!req.is_bulk,
      status: req.status,
      expires_at: req.expires_at,
      created_at: req.created_at,
      items: items.results || [],
      active_offers_count: offerCount?.count || 0
    });
  }

  return result;
}
