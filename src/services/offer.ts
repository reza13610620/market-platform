/**
 * Offer service - seller price offers + buyer view offers
 */

export interface Env {
  DB: D1Database;
}

export interface CreateOfferInput {
  request_id: number;
  request_item_id?: number | null;
  price: number;
  quantity?: number;
  valid_hours?: number; // default 24
}

export async function createOffer(
  env: Env,
  sellerId: number,
  input: CreateOfferInput
): Promise<{ ok: true; offerId: number } | { ok: false; error: string }> {
  if (!input.request_id || input.price <= 0) {
    return { ok: false, error: "اطلاعات پیشنهاد ناقص یا نامعتبر است" };
  }

  const request = await env.DB.prepare(
    `SELECT id, status, expires_at, requester_id FROM requests WHERE id = ?`
  ).bind(input.request_id).first<{
    id: number;
    status: string;
    expires_at: string;
    requester_id: number;
  }>();

  if (!request) return { ok: false, error: "درخواست یافت نشد" };
  if (request.status !== "open") return { ok: false, error: "این درخواست دیگر باز نیست" };
  if (new Date(request.expires_at).getTime() < Date.now()) {
    return { ok: false, error: "مهلت این درخواست تمام شده" };
  }
  if (request.requester_id === sellerId) {
    return { ok: false, error: "نمی‌توانید روی درخواست خودتان پیشنهاد بدهید" };
  }

  const existing = await env.DB.prepare(
    `SELECT id FROM request_offers 
     WHERE request_id = ? AND seller_id = ? AND status = 'active'`
  ).bind(input.request_id, sellerId).first();

  if (existing) {
    return { ok: false, error: "شما قبلاً روی این درخواست پیشنهاد فعال دارید" };
  }

  const validHours = input.valid_hours || 24;
  const validUntil = new Date();
  validUntil.setHours(validUntil.getHours() + validHours);

  const result = await env.DB.prepare(
    `INSERT INTO request_offers 
     (request_id, request_item_id, seller_id, price, quantity, valid_until, status)
     VALUES (?, ?, ?, ?, ?, ?, 'active')`
  ).bind(
    input.request_id,
    input.request_item_id || null,
    sellerId,
    input.price,
    input.quantity || 1,
    validUntil.toISOString()
  ).run();

  return { ok: true, offerId: result.meta.last_row_id as number };
}

export async function getPoolRequests(
  env: Env,
  sellerId: number,
  limit = 20,
  offset = 0
): Promise<any[]> {
  const requests = await env.DB.prepare(
    `SELECT r.id, r.city_name, r.is_bulk, r.expires_at, r.created_at
     FROM requests r
     WHERE r.status = 'open'
       AND r.requester_id != ?
       AND r.expires_at > datetime('now')
     ORDER BY r.created_at DESC
     LIMIT ? OFFSET ?`
  ).bind(sellerId, limit, offset).all();

  const result = [];

  for (const req of requests.results || []) {
    const items = await env.DB.prepare(
      `SELECT id, product_id, title_snapshot, quantity, notes
       FROM request_items WHERE request_id = ?`
    ).bind(req.id).all();

    const myOffer = await env.DB.prepare(
      `SELECT id, price, quantity, valid_until, status
       FROM request_offers 
       WHERE request_id = ? AND seller_id = ? AND status = 'active'`
    ).bind(req.id, sellerId).first();

    result.push({
      id: req.id,
      city_name: req.city_name,
      is_bulk: !!req.is_bulk,
      expires_at: req.expires_at,
      created_at: req.created_at,
      items: items.results || [],
      my_offer: myOffer || null
    });
  }

  return result;
}

/** Buyer views offers on their own request (still anonymous) */
export async function getOffersForRequest(
  env: Env,
  requesterId: number,
  requestId: number
): Promise<{ ok: true; offers: any[] } | { ok: false; error: string }> {
  // Make sure this request belongs to the buyer
  const request = await env.DB.prepare(
    `SELECT id, requester_id, status FROM requests WHERE id = ?`
  ).bind(requestId).first<{ id: number; requester_id: number; status: string }>();

  if (!request) return { ok: false, error: "درخواست یافت نشد" };
  if (request.requester_id !== requesterId) {
    return { ok: false, error: "شما اجازه مشاهده پیشنهادهای این درخواست را ندارید" };
  }

  const offers = await env.DB.prepare(
    `SELECT 
       o.id,
       o.price,
       o.quantity,
       o.valid_until,
       o.status,
       o.created_at,
       o.request_item_id,
       p.reputation_score
     FROM request_offers o
     LEFT JOIN user_profiles p ON p.user_id = o.seller_id
     WHERE o.request_id = ?
       AND o.status = 'active'
       AND o.valid_until > datetime('now')
     ORDER BY o.price ASC`
  ).bind(requestId).all();

  // Return anonymous offers (no seller identity)
  const anonymousOffers = (offers.results || []).map((o: any) => ({
    id: o.id,
    price: o.price,
    quantity: o.quantity,
    valid_until: o.valid_until,
    status: o.status,
    created_at: o.created_at,
    request_item_id: o.request_item_id,
    seller_reputation: o.reputation_score ?? 80
    // no seller_id, no name, no phone
  }));

  return { ok: true, offers: anonymousOffers };
}
