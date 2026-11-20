/**
 * Contact view service - reveal seller contact with quota check
 * + notify seller + mark request as matched
 * + create lightweight order for post-deal feedback (current phase)
 */

import { createNotification } from "./notification";
import { ensureOrderForOffer } from "./review";

export interface Env {
  DB: D1Database;
}

type RevealResult =
  | {
      ok: true;
      seller: {
        phone: string;
        first_name: string | null;
        last_name: string | null;
        city_name: string | null;
        reputation_score: number;
      };
      remaining_quota: number | null;
      order_id?: number;
    }
  | {
      ok: false;
      error: string;
      code?: "NO_QUOTA" | "SELLER_RESTRICTED" | "ALREADY_VIEWED" | "NOT_ALLOWED";
    };

export async function revealSellerContact(
  env: Env,
  buyerId: number,
  offerId: number
): Promise<RevealResult> {
  const offer = await env.DB.prepare(
    `SELECT o.id, o.request_id, o.seller_id, o.status, o.valid_until, o.price,
            r.requester_id, r.status as request_status
     FROM request_offers o
     JOIN requests r ON r.id = o.request_id
     WHERE o.id = ?`
  )
    .bind(offerId)
    .first<{
      id: number;
      request_id: number;
      seller_id: number;
      status: string;
      valid_until: string;
      price: number;
      requester_id: number;
      request_status: string;
    }>();

  if (!offer) {
    return { ok: false, error: "پیشنهاد یافت نشد", code: "NOT_ALLOWED" };
  }

  if (offer.requester_id !== buyerId) {
    return { ok: false, error: "شما اجازه مشاهده این پیشنهاد را ندارید", code: "NOT_ALLOWED" };
  }

  if (offer.status !== "active" || new Date(offer.valid_until).getTime() < Date.now()) {
    return { ok: false, error: "این پیشنهاد دیگر معتبر نیست", code: "NOT_ALLOWED" };
  }

  if (offer.request_status !== "open" && offer.request_status !== "matched") {
    return { ok: false, error: "این درخواست دیگر باز نیست", code: "NOT_ALLOWED" };
  }

  const alreadyViewed = await env.DB.prepare(
    `SELECT id FROM contact_views 
     WHERE viewer_id = ? AND viewed_user_id = ? AND offer_id = ?`
  )
    .bind(buyerId, offer.seller_id, offerId)
    .first();

  if (alreadyViewed) {
    const sellerInfo = await getSellerInfo(env, offer.seller_id);
    if (!sellerInfo) return { ok: false, error: "اطلاعات فروشنده یافت نشد" };
    const quota = await getRemainingQuota(env, buyerId);
    const existingOrder = await env.DB.prepare(`SELECT id FROM orders WHERE offer_id = ?`)
      .bind(offerId)
      .first<{ id: number }>();
    return {
      ok: true,
      seller: sellerInfo,
      remaining_quota: quota,
      order_id: existingOrder?.id,
    };
  }

  const sellerUser = await env.DB.prepare(`SELECT id, status FROM users WHERE id = ?`)
    .bind(offer.seller_id)
    .first<{ id: number; status: string }>();

  if (!sellerUser || sellerUser.status === "banned" || sellerUser.status === "suspended") {
    return { ok: false, error: "این فروشنده در حال حاضر قابل نمایش نیست", code: "SELLER_RESTRICTED" };
  }

  const remaining = await getRemainingQuota(env, buyerId);

  if (remaining !== null && remaining <= 0) {
    return {
      ok: false,
      error: "سهمیه مشاهده اطلاعات تماس شما تمام شده است. لطفاً پلن خود را ارتقا دهید.",
      code: "NO_QUOTA",
    };
  }

  await env.DB.prepare(
    `INSERT INTO contact_views (viewer_id, viewed_user_id, offer_id, request_id)
     VALUES (?, ?, ?, ?)`
  )
    .bind(buyerId, offer.seller_id, offerId, offer.request_id)
    .run();

  if (offer.request_status === "open") {
    await env.DB.prepare(
      `UPDATE requests SET status = 'matched', updated_at = datetime('now') WHERE id = ?`
    )
      .bind(offer.request_id)
      .run();

    await env.DB.prepare(
      `INSERT INTO request_status_history (request_id, old_status, new_status, changed_by, note)
       VALUES (?, 'open', 'matched', ?, 'مشاهده اطلاعات تماس فروشنده')`
    )
      .bind(offer.request_id, buyerId)
      .run();
  }

  const orderId = await ensureOrderForOffer(
    env,
    offerId,
    buyerId,
    offer.seller_id,
    offer.request_id,
    offer.price
  );

  const priceText = Number(offer.price).toLocaleString("fa-IR");
  await createNotification(
    env,
    offer.seller_id,
    "خریدار اطلاعات تماس شما را مشاهده کرد",
    `یک خریدار پیشنهاد شما به مبلغ ${priceText} تومان را انتخاب کرده و اطلاعات تماس شما را دیده است. منتظر تماس او باشید.`
  );

  await createNotification(
    env,
    buyerId,
    "اطلاعات فروشنده نمایش داده شد",
    `اطلاعات تماس فروشنده برای پیشنهاد ${priceText} تومان در اختیار شما قرار گرفت. می‌توانید با او هماهنگ کنید.`
  );

  const sellerInfo = await getSellerInfo(env, offer.seller_id);
  if (!sellerInfo) return { ok: false, error: "اطلاعات فروشنده یافت نشد" };

  const newRemaining = remaining === null ? null : remaining - 1;

  return {
    ok: true,
    seller: sellerInfo,
    remaining_quota: newRemaining,
    order_id: orderId,
  };
}

async function getSellerInfo(env: Env, sellerId: number) {
  const row = await env.DB.prepare(
    `SELECT u.phone, u.first_name, u.last_name,
            p.city_name, p.reputation_score
     FROM users u
     LEFT JOIN user_profiles p ON p.user_id = u.id
     WHERE u.id = ?`
  )
    .bind(sellerId)
    .first<{
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
    reputation_score: row.reputation_score ?? 80,
  };
}

async function getRemainingQuota(env: Env, userId: number): Promise<number | null> {
  const plan = await env.DB.prepare(
    `SELECT sp.benefits_json
     FROM user_subscriptions us
     JOIN subscription_plans sp ON sp.id = us.plan_id
     WHERE us.user_id = ? AND us.is_active = 1
     ORDER BY us.ends_at DESC LIMIT 1`
  )
    .bind(userId)
    .first<{ benefits_json: string | null }>();

  let quotaMonthly: number | null = 3;

  if (plan?.benefits_json) {
    try {
      const benefits = JSON.parse(plan.benefits_json);
      const q = benefits?.limits?.contact_view_quota_monthly;
      if (q === null) return null;
      if (typeof q === "number") quotaMonthly = q;
    } catch {}
  }

  if (quotaMonthly === null) return null;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const used = await env.DB.prepare(
    `SELECT COUNT(*) as count FROM contact_views
     WHERE viewer_id = ? AND created_at >= ?`
  )
    .bind(userId, startOfMonth.toISOString())
    .first<{ count: number }>();

  return Math.max(0, quotaMonthly - (used?.count || 0));
}

export async function getMyRemainingQuota(env: Env, userId: number) {
  return getRemainingQuota(env, userId);
}
