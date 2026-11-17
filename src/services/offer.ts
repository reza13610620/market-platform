/**
 * Offer service - seller price offers + buyer view offers + smart pool
 */

export interface Env {
  DB: D1Database;
}

export interface CreateOfferInput {
  request_id: number;
  request_item_id?: number | null;
  price: number;
  quantity?: number;
  valid_hours?: number;
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

export interface PoolOptions {
  limit?: number;
  offset?: number;
  onlyMySupply?: boolean;   // فقط کالاهای لیست تأمین من
  cityFilter?: 'my' | 'all'; // شهر من یا همه
  timeFilter?: 'today' | 'all'; // فقط امروز یا همه بازها
  typeFilter?: 'single' | 'bulk' | 'all'; // تکی، یکجا، یا همه
}

export async function getPoolRequests(
  env: Env,
  sellerId: number,
  options: PoolOptions = {}
): Promise<any[]> {
  const limit = options.limit || 20;
  const offset = options.offset || 0;
  const onlyMySupply = options.onlyMySupply || false;
  const cityFilter = options.cityFilter || 'all';
  const timeFilter = options.timeFilter || 'all';
  const typeFilter = options.typeFilter || 'all';

  // گرفتن شهر فروشنده
  let sellerCity: string | null = null;
  if (cityFilter === 'my') {
    const profile = await env.DB.prepare(
      `SELECT city_name FROM user_profiles WHERE user_id = ?`
    ).bind(sellerId).first<{ city_name: string | null }>();
    sellerCity = profile?.city_name || null;
  }

  // ساخت شرط‌های پایه
  const conditions: string[] = [
    `r.status = 'open'`,
    `r.requester_id != ?`,
    `r.expires_at > datetime('now')`
  ];
  const params: any[] = [sellerId];

  // فیلتر شهر
  if (cityFilter === 'my' && sellerCity) {
    conditions.push(`r.city_name = ?`);
    params.push(sellerCity);
  }

  // فیلتر زمان
  if (timeFilter === 'today') {
    conditions.push(`date(r.created_at) = date('now')`);
  }

  // فیلتر نوع درخواست (تکی / یکجا)
  if (typeFilter === 'single') {
    conditions.push(`r.is_bulk = 0`);
  } else if (typeFilter === 'bulk') {
    conditions.push(`r.is_bulk = 1`);
  }

  let baseQuery = '';
  let finalParams: any[] = [];

  if (onlyMySupply) {
    // فقط درخواست‌هایی که حداقل یک کالای داخل لیست تأمین فروشنده دارند
    baseQuery = `
      SELECT DISTINCT r.id, r.city_name, r.is_bulk, r.expires_at, r.created_at,
             1 as matches_my_supply
      FROM requests r
      JOIN request_items ri ON ri.request_id = r.id
      JOIN seller_supply_list s ON s.product_id = ri.product_id AND s.seller_id = ? AND s.is_active = 1
      WHERE ${conditions.join(' AND ')}
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `;
    finalParams = [sellerId, ...params, limit, offset];
  } else {
    // همه درخواست‌های باز + اولویت به آن‌هایی که با لیست تأمین جور هستند
    baseQuery = `
      SELECT r.id, r.city_name, r.is_bulk, r.expires_at, r.created_at,
             CASE WHEN EXISTS (
               SELECT 1 FROM request_items ri2
               JOIN seller_supply_list s2 ON s2.product_id = ri2.product_id
               WHERE ri2.request_id = r.id AND s2.seller_id = ? AND s2.is_active = 1
             ) THEN 1 ELSE 0 END as matches_my_supply
      FROM requests r
      WHERE ${conditions.join(' AND ')}
      ORDER BY matches_my_supply DESC, r.created_at DESC
      LIMIT ? OFFSET ?
    `;
    finalParams = [sellerId, ...params, limit, offset];
  }

  const rows = await env.DB.prepare(baseQuery).bind(...finalParams).all();
  const requests = rows.results || [];

  const result = [];

  for (const req of requests) {
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
      my_offer: myOffer || null,
      matches_my_supply: !!req.matches_my_supply
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
  const request = await env.DB.prepare(
    `SELECT id, requester_id, status FROM requests WHERE id = ?`
  ).bind(requestId).first<{ id: number; requester_id: number; status: string }>();

  if (!request) return { ok: false, error: "درخواست یافت نشد" };
  if (request.requester_id !== requesterId) {
    return { ok: false, error: "شما اجازه مشاهده پیشنهادهای این درخواست را ندارید" };
  }

  const offers = await env.DB.prepare(
    `SELECT 
       o.id, o.price, o.quantity, o.valid_until, o.status, o.created_at, o.request_item_id,
       p.reputation_score
     FROM request_offers o
     LEFT JOIN user_profiles p ON p.user_id = o.seller_id
     WHERE o.request_id = ?
       AND o.status = 'active'
       AND o.valid_until > datetime('now')
     ORDER BY o.price ASC`
  ).bind(requestId).all();

  const anonymousOffers = (offers.results || []).map((o: any) => ({
    id: o.id,
    price: o.price,
    quantity: o.quantity,
    valid_until: o.valid_until,
    status: o.status,
    created_at: o.created_at,
    request_item_id: o.request_item_id,
    seller_reputation: o.reputation_score ?? 80
  }));

  return { ok: true, offers: anonymousOffers };
}
