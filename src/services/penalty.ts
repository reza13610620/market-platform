/**
 * سیستم پنالتی – نسخه ۱
 * بدون پول. فقط محدودیت موقت + سابقه + تأثیر روی امتیاز اعتبار
 * فاز اول: فقط فروشنده
 */

export interface Env {
  DB: D1Database;
}

export type PenaltyReasonCode =
  | "cancel_offer"
  | "no_ship"
  | "wrong_item"
  | "delay"
  | "abuse"
  | "other";

export type PenaltySeverity = "light" | "medium" | "heavy" | "critical";

export interface ApplyPenaltyInput {
  userId: number;
  reasonCode: PenaltyReasonCode;
  reasonText: string;
  severity?: PenaltySeverity;
  offerId?: number | null;
  orderId?: number | null;
  appliedBy?: "system" | "admin";
  adminId?: number | null;
  adminNote?: string | null;
}

// مقادیر پیش‌فرض (بعداً توسط سوپر ادمین قابل تنظیم)
const DEFAULTS: Record<
  PenaltyReasonCode,
  { severity: PenaltySeverity; reputation: number; hours: number }
> = {
  cancel_offer: { severity: "medium", reputation: 8, hours: 24 },
  no_ship: { severity: "heavy", reputation: 25, hours: 168 },
  wrong_item: { severity: "heavy", reputation: 20, hours: 120 },
  delay: { severity: "medium", reputation: 10, hours: 48 },
  abuse: { severity: "critical", reputation: 40, hours: 720 },
  other: { severity: "medium", reputation: 10, hours: 48 },
};

/**
 * اعمال پنالتی روی کاربر
 */
export async function applyPenalty(
  env: Env,
  input: ApplyPenaltyInput
): Promise<{ ok: true; penaltyId: number; restrictionUntil: string } | { ok: false; error: string }> {
  const defaults = DEFAULTS[input.reasonCode] || DEFAULTS.other;
  const severity = input.severity || defaults.severity;
  const reputationDeduction = defaults.reputation;
  const restrictionHours = defaults.hours;

  const until = new Date();
  until.setHours(until.getHours() + restrictionHours);
  const restrictionUntil = until.toISOString();

  const result = await env.DB.prepare(
    `INSERT INTO penalties (
      user_id, offer_id, order_id,
      reason_code, reason_text, severity,
      reputation_deduction, restriction_hours, block_requests,
      restriction_until, is_active, applied_by, admin_id, admin_note
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 1, ?, ?, ?)`
  )
    .bind(
      input.userId,
      input.offerId || null,
      input.orderId || null,
      input.reasonCode,
      input.reasonText,
      severity,
      reputationDeduction,
      restrictionHours,
      restrictionUntil,
      input.appliedBy || "system",
      input.adminId || null,
      input.adminNote || null
    )
    .run();

  const penaltyId = result.meta.last_row_id as number;

  // کاهش امتیاز اعتبار
  await env.DB.prepare(
    `UPDATE user_profiles
     SET reputation_score = MAX(0, reputation_score - ?),
         updated_at = datetime('now')
     WHERE user_id = ?`
  )
    .bind(reputationDeduction, input.userId)
    .run();

  // لاگ
  await env.DB.prepare(
    `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, meta_json)
     VALUES (?, 'penalty_applied', 'penalty', ?, ?)`
  )
    .bind(
      input.userId,
      penaltyId,
      JSON.stringify({
        reason_code: input.reasonCode,
        severity,
        reputation_deduction: reputationDeduction,
        restriction_hours: restrictionHours,
      })
    )
    .run();

  // اعلان به کاربر
  await env.DB.prepare(
    `INSERT INTO notifications (user_id, channel, title, body, status)
     VALUES (?, 'in_app', ?, ?, 'pending')`
  )
    .bind(
      input.userId,
      "محدودیت اعمال شد",
      `به دلیل «${input.reasonText}» تا ${new Date(restrictionUntil).toLocaleString("fa-IR")} نمی‌توانید پیشنهاد جدید ثبت کنید. امتیاز اعتبار شما نیز کاهش یافت.`
    )
    .run();

  return { ok: true, penaltyId, restrictionUntil };
}

/**
 * بررسی می‌کند آیا کاربر الان محدودیت ثبت پیشنهاد دارد یا نه
 */
export async function checkOfferRestriction(
  env: Env,
  userId: number
): Promise<{ restricted: boolean; until?: string; reason?: string }> {
  const row = await env.DB.prepare(
    `SELECT restriction_until, reason_text
     FROM penalties
     WHERE user_id = ?
       AND is_active = 1
       AND restriction_until > datetime('now')
     ORDER BY restriction_until DESC
     LIMIT 1`
  )
    .bind(userId)
    .first<{ restriction_until: string; reason_text: string }>();

  if (!row) {
    return { restricted: false };
  }

  return {
    restricted: true,
    until: row.restriction_until,
    reason: row.reason_text,
  };
}

/**
 * لیست پنالتی‌های یک کاربر
 */
export async function getUserPenalties(
  env: Env,
  userId: number,
  limit = 20
): Promise<any[]> {
  const rows = await env.DB.prepare(
    `SELECT id, reason_code, reason_text, severity,
            reputation_deduction, restriction_hours, restriction_until,
            is_active, created_at
     FROM penalties
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT ?`
  )
    .bind(userId, limit)
    .all();

  return (rows.results || []).map((r: any) => ({
    id: r.id,
    reason_code: r.reason_code,
    reason_text: r.reason_text,
    severity: r.severity,
    reputation_deduction: r.reputation_deduction,
    restriction_hours: r.restriction_hours,
    restriction_until: r.restriction_until,
    is_active: !!r.is_active && new Date(r.restriction_until) > new Date(),
    created_at: r.created_at,
  }));
}

/**
 * لغو پیشنهاد توسط فروشنده + اعمال پنالتی
 */
export async function cancelOfferWithPenalty(
  env: Env,
  sellerId: number,
  offerId: number
): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  const offer = await env.DB.prepare(
    `SELECT id, seller_id, status, request_id FROM request_offers WHERE id = ?`
  )
    .bind(offerId)
    .first<{ id: number; seller_id: number; status: string; request_id: number }>();

  if (!offer) return { ok: false, error: "پیشنهاد یافت نشد" };
  if (offer.seller_id !== sellerId) {
    return { ok: false, error: "شما اجازه لغو این پیشنهاد را ندارید" };
  }
  if (offer.status !== "active") {
    return { ok: false, error: "این پیشنهاد دیگر فعال نیست" };
  }

  await env.DB.prepare(
    `UPDATE request_offers
     SET status = 'cancelled_with_penalty', penalty_applied = 1, updated_at = datetime('now')
     WHERE id = ?`
  )
    .bind(offerId)
    .run();

  const penaltyResult = await applyPenalty(env, {
    userId: sellerId,
    reasonCode: "cancel_offer",
    reasonText: "لغو پیشنهاد بعد از ثبت",
    offerId,
    appliedBy: "system",
  });

  if (!penaltyResult.ok) {
    return { ok: false, error: "خطا در اعمال پنالتی" };
  }

  return {
    ok: true,
    message: `پیشنهاد لغو شد. تا ${new Date(penaltyResult.restrictionUntil).toLocaleString("fa-IR")} نمی‌توانید پیشنهاد جدید ثبت کنید.`,
  };
}
