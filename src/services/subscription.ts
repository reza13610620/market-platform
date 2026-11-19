/**
 * سرویس پلن و ارتقا – نسخه ساده
 * + همگام‌سازی اشتراک با shared-catalog
 */

import { upsertSharedSubscription } from "./sharedCatalog";

export interface Env {
  DB: D1Database;
  SHARED_CATALOG?: D1Database;
}

export async function listPlans(env: Env): Promise<any[]> {
  const rows = await env.DB.prepare(
    `SELECT id, code, title, price_monthly, price_yearly, benefits_json, sort_order
     FROM subscription_plans
     WHERE is_active = 1
     ORDER BY sort_order ASC`
  ).all();

  return (rows.results || []).map((p: any) => {
    let benefits: any = {};
    try {
      benefits = p.benefits_json ? JSON.parse(p.benefits_json) : {};
    } catch {}
    return {
      id: p.id,
      code: p.code,
      title: p.title,
      price_monthly: p.price_monthly,
      price_yearly: p.price_yearly,
      contact_view_quota: benefits?.limits?.contact_view_quota_monthly ?? 3,
      max_active_requests: benefits?.limits?.max_active_requests ?? 5,
      features: benefits?.features || {},
      is_free: p.code === "free",
    };
  });
}

export async function getMySubscription(env: Env, userId: number) {
  const row = await env.DB.prepare(
    `SELECT us.id, us.plan_id, us.starts_at, us.ends_at, us.is_active,
            sp.code, sp.title, sp.benefits_json, sp.price_monthly
     FROM user_subscriptions us
     JOIN subscription_plans sp ON sp.id = us.plan_id
     WHERE us.user_id = ? AND us.is_active = 1
     ORDER BY us.ends_at DESC LIMIT 1`
  )
    .bind(userId)
    .first<any>();

  if (!row) {
    return {
      plan_code: "free",
      plan_title: "رایگان",
      starts_at: null,
      ends_at: null,
      contact_view_quota: 3,
    };
  }

  let benefits: any = {};
  try {
    benefits = row.benefits_json ? JSON.parse(row.benefits_json) : {};
  } catch {}

  return {
    plan_code: row.code,
    plan_title: row.title,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    contact_view_quota: benefits?.limits?.contact_view_quota_monthly ?? 3,
    price_monthly: row.price_monthly,
  };
}

export async function upgradePlan(
  env: Env,
  userId: number,
  planCode: string
): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  if (planCode === "free") {
    return { ok: false, error: "نمی‌توانید به پلن رایگان «ارتقا» دهید" };
  }

  const plan = await env.DB.prepare(
    `SELECT id, code, title, price_monthly, benefits_json FROM subscription_plans
     WHERE code = ? AND is_active = 1`
  )
    .bind(planCode)
    .first<{
      id: number;
      code: string;
      title: string;
      price_monthly: number;
      benefits_json: string | null;
    }>();

  if (!plan) {
    return { ok: false, error: "پلن یافت نشد" };
  }

  await env.DB.prepare(
    `UPDATE user_subscriptions SET is_active = 0 WHERE user_id = ? AND is_active = 1`
  )
    .bind(userId)
    .run();

  const now = new Date();
  const ends = new Date();
  ends.setMonth(ends.getMonth() + 1);

  const subResult = await env.DB.prepare(
    `INSERT INTO user_subscriptions (user_id, plan_id, starts_at, ends_at, is_active, payment_ref)
     VALUES (?, ?, ?, ?, 1, ?)`
  )
    .bind(userId, plan.id, now.toISOString(), ends.toISOString(), `sim_${Date.now()}`)
    .run();

  const marketSubId = subResult.meta.last_row_id as number;

  await env.DB.prepare(
    `INSERT INTO notifications (user_id, channel, title, body, status)
     VALUES (?, 'in_app', ?, ?, 'pending')`
  )
    .bind(
      userId,
      "پلن شما ارتقا یافت",
      `پلن «${plan.title}» با موفقیت برای شما فعال شد. از مزایای جدید استفاده کنید.`
    )
    .run();

  // همگام‌سازی با اشتراک مشترک (کلید: شماره موبایل)
  try {
    const user = await env.DB.prepare(`SELECT phone FROM users WHERE id = ?`)
      .bind(userId)
      .first<{ phone: string }>();

    if (user?.phone) {
      await upsertSharedSubscription(env, {
        phone: user.phone,
        plan_code: plan.code,
        plan_name: plan.title,
        source: "market",
        starts_at: now.toISOString(),
        expires_at: ends.toISOString(),
        benefits_json: plan.benefits_json,
        market_sub_id: marketSubId,
      });
    }
  } catch (e) {
    console.error("[Subscription] shared sub sync failed:", e);
  }

  return {
    ok: true,
    message: `پلن «${plan.title}» با موفقیت فعال شد`,
  };
}
