/**
 * بازخورد دوطرفه + محاسبه امتیاز سیستمی
 * بر اساس docs/FEEDBACK_AND_REPUTATION_v1.md
 *
 * قوانین:
 * - فقط بعد از completed شدن سفارش
 * - هر طرف فقط یک بار به طرف مقابل امتیاز می‌دهد
 * - بازخورد بعد از ثبت قابل ویرایش نیست
 * - امتیاز سیستمی فقط توسط سیستم (و ادمین در موارد خاص) تغییر می‌کند
 */

export interface Env {
  DB: D1Database;
}

export interface CreateReviewInput {
  orderId: number;
  rating: number; // 1-5
  comment?: string | null;
}

export async function createReview(
  env: Env,
  reviewerId: number,
  input: CreateReviewInput
): Promise<{ ok: true; reviewId: number } | { ok: false; error: string }> {
  const rating = Math.round(Number(input.rating));
  if (rating < 1 || rating > 5) {
    return { ok: false, error: "امتیاز باید بین ۱ تا ۵ باشد" };
  }

  const order = await env.DB.prepare(
    `SELECT id, buyer_id, seller_id, status FROM orders WHERE id = ?`
  )
    .bind(input.orderId)
    .first<{ id: number; buyer_id: number; seller_id: number; status: string }>();

  if (!order) {
    return { ok: false, error: "سفارش یافت نشد" };
  }

  if (order.status !== "completed") {
    return {
      ok: false,
      error: "فقط بعد از تکمیل معامله می‌توانید بازخورد ثبت کنید",
    };
  }

  // فقط خریدار یا فروشنده این سفارش
  let revieweeId: number | null = null;
  if (order.buyer_id === reviewerId) {
    revieweeId = order.seller_id;
  } else if (order.seller_id === reviewerId) {
    revieweeId = order.buyer_id;
  } else {
    return { ok: false, error: "شما طرف این معامله نیستید" };
  }

  // یک‌بار فقط
  const existing = await env.DB.prepare(
    `SELECT id FROM reviews WHERE order_id = ? AND reviewer_id = ?`
  )
    .bind(input.orderId, reviewerId)
    .first();

  if (existing) {
    return { ok: false, error: "شما قبلاً برای این معامله بازخورد ثبت کرده‌اید" };
  }

  const comment = input.comment?.trim() || null;
  if (comment && comment.length > 1000) {
    return { ok: false, error: "توضیح نباید بیشتر از ۱۰۰۰ کاراکتر باشد" };
  }

  const result = await env.DB.prepare(
    `INSERT INTO reviews (order_id, reviewer_id, reviewee_id, rating, comment)
     VALUES (?, ?, ?, ?, ?)`
  )
    .bind(input.orderId, reviewerId, revieweeId, rating, comment)
    .run();

  const reviewId = result.meta.last_row_id as number;

  // به‌روزرسانی امتیاز سیستمی طرف مقابل
  await recalculateReputation(env, revieweeId);

  // اعلان به طرف مقابل
  await env.DB.prepare(
    `INSERT INTO notifications (user_id, channel, title, body, status)
     VALUES (?, 'in_app', ?, ?, 'pending')`
  )
    .bind(
      revieweeId,
      "بازخورد جدید دریافت کردید",
      `یک طرف معامله به شما ${rating} ستاره داد${comment ? ". توضیح: " + comment.slice(0, 80) : ""}`
    )
    .run();

  // لاگ
  await env.DB.prepare(
    `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, meta_json)
     VALUES (?, 'review_created', 'review', ?, ?)`
  )
    .bind(
      reviewerId,
      reviewId,
      JSON.stringify({ order_id: input.orderId, rating, reviewee_id: revieweeId })
    )
    .run();

  return { ok: true, reviewId };
}

/**
 * محاسبه مجدد امتیاز سیستمی یک کاربر
 * فرمول مرحله ۱:
 * پایه ۸۰
 * + (میانگین امتیاز دریافتی − ۳) × ۸
 * + تعداد معاملات موفق × ۰.۵ (حداکثر +۱۰)
 * − مجموع کاهش‌های پنالتی فعال/اخیر
 * محدود بین ۰ تا ۱۰۰
 */
export async function recalculateReputation(
  env: Env,
  userId: number
): Promise<number> {
  // میانگین امتیاز دریافتی
  const avgRow = await env.DB.prepare(
    `SELECT AVG(rating) as avg_rating, COUNT(*) as cnt
     FROM reviews WHERE reviewee_id = ?`
  )
    .bind(userId)
    .first<{ avg_rating: number | null; cnt: number }>();

  const avgRating = avgRow?.avg_rating ?? 3; // اگر بازخوردی نباشد خنثی
  const reviewCount = avgRow?.cnt ?? 0;

  // تعداد معاملات موفق (سفارش completed که کاربر در آن بوده)
  const successRow = await env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM orders
     WHERE status = 'completed'
       AND (buyer_id = ? OR seller_id = ?)`
  )
    .bind(userId, userId)
    .first<{ cnt: number }>();

  const successCount = successRow?.cnt ?? 0;
  const successBonus = Math.min(successCount * 0.5, 10);

  // مجموع کاهش‌های پنالتی (همه پنالتی‌های ثبت‌شده)
  const penaltyRow = await env.DB.prepare(
    `SELECT COALESCE(SUM(reputation_deduction), 0) as total
     FROM penalties WHERE user_id = ?`
  )
    .bind(userId)
    .first<{ total: number }>();

  const penaltyTotal = penaltyRow?.total ?? 0;

  // فرمول
  let score = 80;
  if (reviewCount > 0) {
    score += (avgRating - 3) * 8;
  }
  score += successBonus;
  score -= penaltyTotal;

  // محدود کردن
  score = Math.max(0, Math.min(100, Math.round(score)));

  await env.DB.prepare(
    `UPDATE user_profiles
     SET reputation_score = ?,
         updated_at = datetime('now')
     WHERE user_id = ?`
  )
    .bind(score, userId)
    .run();

  return score;
}

/**
 * لیست بازخوردهای یک کاربر (به عنوان دریافت‌کننده)
 */
export async function getUserReviews(
  env: Env,
  userId: number,
  limit = 20,
  offset = 0
): Promise<any[]> {
  const rows = await env.DB.prepare(
    `SELECT r.id, r.order_id, r.rating, r.comment, r.created_at,
            r.reviewer_id
     FROM reviews r
     WHERE r.reviewee_id = ?
     ORDER BY r.created_at DESC
     LIMIT ? OFFSET ?`
  )
    .bind(userId, limit, offset)
    .all();

  return (rows.results || []).map((r: any) => ({
    id: r.id,
    order_id: r.order_id,
    rating: r.rating,
    comment: r.comment,
    created_at: r.created_at,
    // هویت reviewer را عمداً نمایش نمی‌دهیم تا ناشناس‌بودن حفظ شود
    // در صورت نیاز بعداً می‌توان نام مستعار اضافه کرد
  }));
}

/**
 * بازخوردهایی که کاربر فعلی داده یا دریافت کرده
 */
export async function getMyReviews(
  env: Env,
  userId: number
): Promise<{ given: any[]; received: any[] }> {
  const given = await env.DB.prepare(
    `SELECT r.id, r.order_id, r.rating, r.comment, r.created_at, r.reviewee_id
     FROM reviews r
     WHERE r.reviewer_id = ?
     ORDER BY r.created_at DESC
     LIMIT 50`
  )
    .bind(userId)
    .all();

  const received = await env.DB.prepare(
    `SELECT r.id, r.order_id, r.rating, r.comment, r.created_at
     FROM reviews r
     WHERE r.reviewee_id = ?
     ORDER BY r.created_at DESC
     LIMIT 50`
  )
    .bind(userId)
    .all();

  return {
    given: (given.results || []).map((r: any) => ({
      id: r.id,
      order_id: r.order_id,
      rating: r.rating,
      comment: r.comment,
      created_at: r.created_at,
      reviewee_id: r.reviewee_id,
    })),
    received: (received.results || []).map((r: any) => ({
      id: r.id,
      order_id: r.order_id,
      rating: r.rating,
      comment: r.comment,
      created_at: r.created_at,
    })),
  };
}

/**
 * علامت‌گذاری سفارش به عنوان completed (توسط یکی از طرفین)
 * این برای فاز فعلی که اسکرو کامل نداریم ضروری است.
 */
export async function markOrderCompleted(
  env: Env,
  userId: number,
  orderId: number
): Promise<{ ok: true } | { ok: false; error: string }> {
  const order = await env.DB.prepare(
    `SELECT id, buyer_id, seller_id, status FROM orders WHERE id = ?`
  )
    .bind(orderId)
    .first<{ id: number; buyer_id: number; seller_id: number; status: string }>();

  if (!order) return { ok: false, error: "سفارش یافت نشد" };

  if (order.buyer_id !== userId && order.seller_id !== userId) {
    return { ok: false, error: "شما طرف این معامله نیستید" };
  }

  if (order.status === "completed") {
    return { ok: true }; // قبلاً تکمیل شده
  }

  // وضعیت‌های مجاز برای تکمیل
  const allowed = ["in_progress", "contact_revealed", "shipped", "delivered", "pending_payment"];
  if (!allowed.includes(order.status)) {
    return {
      ok: false,
      error: `وضعیت فعلی سفارش (${order.status}) اجازه تکمیل نمی‌دهد`,
    };
  }

  await env.DB.prepare(
    `UPDATE orders
     SET status = 'completed',
         completed_at = datetime('now'),
         updated_at = datetime('now')
     WHERE id = ?`
  )
    .bind(orderId)
    .run();

  // اعلان به طرف مقابل
  const otherId = order.buyer_id === userId ? order.seller_id : order.buyer_id;
  await env.DB.prepare(
    `INSERT INTO notifications (user_id, channel, title, body, status)
     VALUES (?, 'in_app', ?, ?, 'pending')`
  )
    .bind(
      otherId,
      "معامله تکمیل شد",
      "طرف مقابل معامله را تکمیل‌شده علامت زد. حالا می‌توانید به هم امتیاز بدهید."
    )
    .run();

  // به‌روزرسانی امتیاز هر دو طرف (چون success count تغییر کرد)
  await recalculateReputation(env, order.buyer_id);
  await recalculateReputation(env, order.seller_id);

  await env.DB.prepare(
    `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, meta_json)
     VALUES (?, 'order_completed', 'order', ?, ?)`
  )
    .bind(userId, orderId, JSON.stringify({ by: userId }))
    .run();

  return { ok: true };
}

/**
 * ایجاد سفارش سبک هنگام reveal (برای پشتیبانی فاز فعلی بدون اسکرو کامل)
 * اگر قبلاً سفارش برای این offer ساخته شده باشد، همان را برمی‌گرداند.
 */
export async function ensureOrderForOffer(
  env: Env,
  offerId: number,
  buyerId: number,
  sellerId: number,
  requestId: number,
  price: number
): Promise<number> {
  const existing = await env.DB.prepare(
    `SELECT id FROM orders WHERE offer_id = ?`
  )
    .bind(offerId)
    .first<{ id: number }>();

  if (existing) return existing.id;

  const result = await env.DB.prepare(
    `INSERT INTO orders (
      request_id, offer_id, buyer_id, seller_id,
      total_amount, commission_amount, status
    ) VALUES (?, ?, ?, ?, ?, 0, 'contact_revealed')`
  )
    .bind(requestId, offerId, buyerId, sellerId, price)
    .run();

  return result.meta.last_row_id as number;
}

/**
 * سفارش‌های مربوط به کاربر (برای صفحه بازخورد)
 */
export async function getMyOrders(
  env: Env,
  userId: number,
  status?: string
): Promise<any[]> {
  let query = `
    SELECT o.id, o.request_id, o.offer_id, o.buyer_id, o.seller_id,
           o.total_amount, o.status, o.completed_at, o.created_at,
           CASE WHEN o.buyer_id = ? THEN 'buyer' ELSE 'seller' END as my_role
    FROM orders o
    WHERE (o.buyer_id = ? OR o.seller_id = ?)
  `;
  const params: any[] = [userId, userId, userId];

  if (status) {
    query += ` AND o.status = ?`;
    params.push(status);
  }

  query += ` ORDER BY o.created_at DESC LIMIT 50`;

  const rows = await env.DB.prepare(query).bind(...params).all();

  const orders = rows.results || [];

  // بررسی اینکه آیا کاربر برای هر سفارش بازخورد داده یا نه
  const result = [];
  for (const o of orders) {
    const myReview = await env.DB.prepare(
      `SELECT id, rating FROM reviews WHERE order_id = ? AND reviewer_id = ?`
    )
      .bind(o.id, userId)
      .first<{ id: number; rating: number }>();

    result.push({
      id: o.id,
      request_id: o.request_id,
      offer_id: o.offer_id,
      total_amount: o.total_amount,
      status: o.status,
      completed_at: o.completed_at,
      created_at: o.created_at,
      my_role: o.my_role,
      has_reviewed: !!myReview,
      my_rating: myReview?.rating ?? null,
      can_review: o.status === "completed" && !myReview,
    });
  }

  return result;
}
