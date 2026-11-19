/**
 * دستیار هوشمند – نسخه ۱ (پایه برای خرید و فروش هوشمند آینده)
 * فقط برای پلن‌های طلایی و ویژه (advanced_analytics = true)
 *
 * فعلاً پیشنهادهای ساده و قابل فهم بر اساس داده واقعی پلتفرم:
 * - برای خریدار: بهترین قیمت‌ها، اختلاف قیمت، فروشنده‌های با اعتبار بالا
 * - برای فروشنده: درخواست‌های داغ، فرصت‌های لیست تأمین، قیمت‌های رقابتی
 */

export interface Env {
  DB: D1Database;
}

export async function hasSmartAccess(env: Env, userId: number): Promise<boolean> {
  const row = await env.DB.prepare(
    `SELECT sp.benefits_json
     FROM user_subscriptions us
     JOIN subscription_plans sp ON sp.id = us.plan_id
     WHERE us.user_id = ? AND us.is_active = 1
     ORDER BY us.ends_at DESC LIMIT 1`
  )
    .bind(userId)
    .first<{ benefits_json: string | null }>();

  if (!row?.benefits_json) return false;
  try {
    const benefits = JSON.parse(row.benefits_json);
    return !!benefits?.features?.advanced_analytics;
  } catch {
    return false;
  }
}

export async function getSmartSuggestions(
  env: Env,
  userId: number
): Promise<{ ok: true; data: any } | { ok: false; error: string; code?: string }> {
  const allowed = await hasSmartAccess(env, userId);
  if (!allowed) {
    return {
      ok: false,
      error: "دستیار هوشمند فقط برای پلن‌های طلایی و ویژه فعال است.",
      code: "VIP_ONLY",
    };
  }

  // --- پیشنهادهای خریدار ---
  const buyerTips: any[] = [];

  // درخواست‌های باز کاربر که پیشنهاد دارند
  const myOpenRequests = await env.DB.prepare(
    `SELECT r.id, r.created_at,
            (SELECT COUNT(*) FROM request_offers o WHERE o.request_id = r.id AND o.status = 'active' AND o.valid_until > datetime('now')) as offer_count,
            (SELECT MIN(o.price) FROM request_offers o WHERE o.request_id = r.id AND o.status = 'active' AND o.valid_until > datetime('now')) as min_price,
            (SELECT MAX(o.price) FROM request_offers o WHERE o.request_id = r.id AND o.status = 'active' AND o.valid_until > datetime('now')) as max_price,
            (SELECT AVG(o.price) FROM request_offers o WHERE o.request_id = r.id AND o.status = 'active' AND o.valid_until > datetime('now')) as avg_price
     FROM requests r
     WHERE r.requester_id = ? AND r.status IN ('open', 'matched')
     ORDER BY r.created_at DESC
     LIMIT 10`
  )
    .bind(userId)
    .all();

  for (const req of myOpenRequests.results || []) {
    if ((req as any).offer_count > 0) {
      const minP = Number((req as any).min_price);
      const maxP = Number((req as any).max_price);
      const avgP = Number((req as any).avg_price);
      const diffPct = maxP > 0 ? Math.round(((maxP - minP) / maxP) * 100) : 0;

      buyerTips.push({
        type: "price_comparison",
        request_id: (req as any).id,
        title: "مقایسه قیمت پیشنهادها",
        message:
          diffPct >= 15
            ? `اختلاف قیمت بین پیشنهادها حدود ${diffPct}٪ است. کمترین قیمت ${minP.toLocaleString("fa-IR")} تومان پیشنهاد شده.`
            : `قیمت‌ها نسبتاً نزدیک هم هستند. میانگین حدود ${Math.round(avgP).toLocaleString("fa-IR")} تومان.`,
        min_price: minP,
        max_price: maxP,
        avg_price: Math.round(avgP),
        offer_count: (req as any).offer_count,
        priority: diffPct >= 20 ? "high" : "normal",
      });
    }
  }

  // --- پیشنهادهای فروشنده ---
  const sellerTips: any[] = [];

  // درخواست‌های منطبق با لیست تأمین که هنوز پیشنهاد نداده
  const matchingRequests = await env.DB.prepare(
    `SELECT r.id, r.city_name, r.created_at, r.is_bulk,
            ri.title_snapshot,
            (SELECT COUNT(*) FROM request_offers o WHERE o.request_id = r.id AND o.status = 'active') as current_offers
     FROM requests r
     JOIN request_items ri ON ri.request_id = r.id
     JOIN seller_supply_list s ON s.product_id = ri.product_id AND s.seller_id = ? AND s.is_active = 1
     WHERE r.status = 'open'
       AND r.requester_id != ?
       AND r.expires_at > datetime('now')
       AND NOT EXISTS (
         SELECT 1 FROM request_offers o2
         WHERE o2.request_id = r.id AND o2.seller_id = ? AND o2.status = 'active'
       )
     ORDER BY r.created_at DESC
     LIMIT 8`
  )
    .bind(userId, userId, userId)
    .all();

  for (const row of matchingRequests.results || []) {
    const r = row as any;
    sellerTips.push({
      type: "matching_request",
      request_id: r.id,
      title: "فرصت فروش",
      message: `درخواست «${r.title_snapshot}» با لیست تأمین شما مطابقت دارد${r.current_offers === 0 ? " و هنوز هیچ پیشنهادی نگرفته" : ` (${r.current_offers} پیشنهاد فعال)`}.`,
      city_name: r.city_name,
      is_bulk: !!r.is_bulk,
      current_offers: r.current_offers,
      priority: r.current_offers === 0 ? "high" : "normal",
    });
  }

  // درخواست‌های داغ (پیشنهاد زیاد)
  const hotRequests = await env.DB.prepare(
    `SELECT r.id,
            (SELECT COUNT(*) FROM request_offers o WHERE o.request_id = r.id AND o.status = 'active') as offer_count
     FROM requests r
     WHERE r.status = 'open'
       AND r.requester_id != ?
       AND r.expires_at > datetime('now')
     GROUP BY r.id
     HAVING offer_count >= 3
     ORDER BY offer_count DESC
     LIMIT 5`
  )
    .bind(userId)
    .all();

  for (const row of hotRequests.results || []) {
    const r = row as any;
    sellerTips.push({
      type: "hot_request",
      request_id: r.id,
      title: "درخواست پرطرفدار",
      message: `این درخواست ${r.offer_count} پیشنهاد فعال دارد. اگر قیمت رقابتی بدهید شانس بیشتری دارید.`,
      offer_count: r.offer_count,
      priority: "normal",
    });
  }

  // آمار کلی کاربر
  const stats = await env.DB.prepare(
    `SELECT
       (SELECT COUNT(*) FROM requests WHERE requester_id = ? AND status IN ('open','matched')) as open_requests,
       (SELECT COUNT(*) FROM request_offers WHERE seller_id = ? AND status = 'active') as active_offers,
       (SELECT reputation_score FROM user_profiles WHERE user_id = ?) as reputation
    `
  )
    .bind(userId, userId, userId)
    .first<any>();

  return {
    ok: true,
    data: {
      buyer_tips: buyerTips,
      seller_tips: sellerTips,
      stats: {
        open_requests: stats?.open_requests ?? 0,
        active_offers: stats?.active_offers ?? 0,
        reputation: stats?.reputation ?? 80,
      },
      generated_at: new Date().toISOString(),
      note: "این پیشنهادها بر اساس داده‌های فعلی پلتفرم ساخته شده‌اند. نسخه هوشمندتر در آینده اضافه می‌شود.",
    },
  };
}
