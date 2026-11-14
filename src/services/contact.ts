/**
 * Contact view service - reveal seller contact with quota check
 */

export interface Env {
  DB: D1Database;
}

interface RevealResult {
  ok: true;
  seller: {
    phone: string;
    first_name: string | null;
    last_name: string | null;
    city_name: string | null;
    reputation_score: number;
  };
  remaining_quota: number | null; // null = unlimited
} | {
  ok: false;
  error: string;
  code?: "NO_QUOTA" | "SELLER_RESTRICTED" | "ALREADY_VIEWED" | "NOT_ALLOWED";
}

export async function revealSellerContact(
  env: Env,
  buyerId: number,
  offerId: number
): Promise<RevealResult> {
  // 1. Get the offer + request + seller
  const offer = await env.DB.prepare(
    `SELECT o.id, o.request_id, o.seller_id, o.status, o.valid_until,
            r.requester_id, r.status as request_status
     FROM request_offers o
     JOIN requests r ON r.id = o.request_id
     WHERE o.id = ?`
  ).bind(offerId).first<{
    id: number;
    request_id: number;
    seller_id: number;
    status: string;
    valid_until: string;
    requester_id: number;
    request_status: string;
  }>();

  if (!offer) {
    return { ok: false, error: "پیشنهاد یافت نشد", code: "NOT_ALLOWED" };
  }

  // Only the buyer of the request can reveal
  if (offer.requester_id !== buyerId) {
    return { ok: false, error: "شما اجازه مشاهده این پیشنهاد را ندارید", code: "NOT_ALLOWED" };
  }

  if (offer.status !== "active" || new Date(offer.valid_until).getTime() < Date.now()) {
    return { ok: false, error: "این پیشنهاد دیگر معتبر نیست", code: "NOT_ALLOWED" };
  }

  if (offer.request_status !== "open") {
    return { ok: false, error: "این درخواست دیگر باز نیست", code: "NOT_ALLOWED" };
  }

  // 2. Check if already viewed this seller on this offer
  const alreadyViewed = await env.DB.prepare(
    `SELECT id FROM contact_views 
     WHERE viewer_id = ? AND viewed_user_id = ? AND offer_id = ?`
  ).bind(buyerId, offer.seller_id, offerId).first();

  if (alreadyViewed) {
    // Already paid/viewed before → just return the info again (no extra quota)
    const sellerInfo = await getSellerInfo(env, offer.seller_id);
    if (!sellerInfo) return { ok: false, error: "اطلاعات فروشنده یافت نشد" };

    const quota = await getRemainingQuota(env, buyerId);
    return {
      ok: true,
      seller: sellerInfo,
      remaining_quota: quota
    };
  }

  // 3. Check seller status
  const sellerUser = await env.DB.prepare(
    `SELECT id, status FROM users WHERE id = ?`
  ).bind(offer.seller_id).first<{ id: number; status: string }>();

  if (!sellerUser || sellerUser.status === "banned" || sellerUser.status === "suspended") {
    return { ok: false, error: "این فروشنده در حال حاضر قابل نمایش نیست", code: "SELLER_RESTRICTED" };
  }

  // 4. Check buyer's remaining quota
  const remaining = await getRemainingQuota(env, buyerId);

  if (remaining !== null && remaining <= 0) {
    return {
      ok: false,
      error: "سهمیه مشاهده اطلاعات تماس شما تمام شده است. لطفاً پلن خود را ارتقا دهید.",
      code: "NO_QUOTA"
    };
  }

  // 5. Record the view (this consumes the quota)
  await env.DB.prepare(
    `INSERT INTO contact_views (viewer_id, viewed_user_id, offer_id, request_id)
     VALUES (?, ?, ?, ?)`
  ).bind(buyerId, offer.seller_id, offerId, offer.request_id).run();

  // 6. Return seller contact
  const sellerInfo = await getSellerInfo(env, offer.seller_id);
  if (!sellerInfo) return { ok: false, error: "اطلاعات فروشنده یافت نشد" };

  const newRemaining = remaining === null ? null : remaining - 1;

  return {
    ok: true,
    seller: sellerInfo,
    remaining_quota: newRemaining
  };
}

async function getSellerInfo(env: Env, sellerId: number) {
  const row = await env.DB.prepare(
    `SELECT u.phone, u.first_name, u.last_name,
            p.city_name, p.reputation_score
     FROM users u
     LEFT JOIN user_profiles p ON p.user_id = u.id
     WHERE u.id = ?`
  ).bind(sellerId).first<{
    phone: string;
    first_name: string | null;
    last_name: string | null;
    city_name: string | null;
    reputation_score: number | null;
  }>();

  if (!row) return null;

  return {
    phone: row.phone,
    first_name: row.first_name,
    last_name: row.last_name,
    city_name: row.city_name,
    reputation_score: row.reputation_score ?? 80
  };
}

/** Calculate remaining monthly contact view quota */
async function getRemainingQuota(env: Env, userId: number): Promise<number | null> {
  // Get active plan benefits
  const plan = await env.DB.prepare(
    `SELECT sp.benefits_json
     FROM user_subscriptions us
     JOIN subscription_plans sp ON sp.id = us.plan_id
     WHERE us.user_id = ? AND us.is_active = 1
     ORDER BY us.ends_at DESC LIMIT 1`
  ).bind(userId).first<{ benefits_json: string | null }>();

  let quotaMonthly: number | null = 3; // default free

  if (plan?.benefits_json) {
    try {
      const benefits = JSON.parse(plan.benefits_json);
      const q = benefits?.limits?.contact_view_quota_monthly;
      if (q === null) return null; // unlimited
      if (typeof q === "number") quotaMonthly = q;
    } catch {
      // keep default
    }
  }

  if (quotaMonthly === null) return null;

  // Count views in current month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const used = await env.DB.prepare(
    `SELECT COUNT(*) as count FROM contact_views
     WHERE viewer_id = ? AND created_at >= ?`
  ).bind(userId, startOfMonth.toISOString()).first<{ count: number }>();

  const usedCount = used?.count || 0;
  return Math.max(0, quotaMonthly - usedCount);
}

export async function getMyRemainingQuota(env: Env, userId: number) {
  return getRemainingQuota(env, userId);
}
