/**
 * Auth service - Mobile OTP
 */

import { generateOtpCode, normalizePhone, otpExpiresAt } from "../utils/otp";

export interface Env {
  DB: D1Database;
  SMS_API_KEY?: string;
}

const MAX_ATTEMPTS = 5;
const OTP_TTL_MINUTES = 5;
const RATE_LIMIT_SECONDS = 60; // حداقل فاصله بین دو درخواست کد

export async function requestOtp(env: Env, rawPhone: string): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  const phone = normalizePhone(rawPhone);
  if (!phone) {
    return { ok: false, error: "شماره موبایل معتبر نیست" };
  }

  // Rate limit: آخرین کد ارسال‌شده
  const recent = await env.DB.prepare(
    `SELECT created_at FROM otp_codes 
     WHERE phone = ? AND used = 0 
     ORDER BY created_at DESC LIMIT 1`
  ).bind(phone).first<{ created_at: string }>();

  if (recent) {
    const last = new Date(recent.created_at).getTime();
    const now = Date.now();
    if (now - last < RATE_LIMIT_SECONDS * 1000) {
      return { ok: false, error: "لطفاً کمی صبر کنید و دوباره تلاش کنید" };
    }
  }

  const code = generateOtpCode(5);
  const expiresAt = otpExpiresAt(OTP_TTL_MINUTES);

  await env.DB.prepare(
    `INSERT INTO otp_codes (phone, code, expires_at) VALUES (?, ?, ?)`
  ).bind(phone, code, expiresAt).run();

  // TODO: ارسال واقعی پیامک
  // فعلاً در محیط توسعه کد را در پاسخ برمی‌گردانیم (فقط برای تست)
  // در پروداکشن باید از سرویس پیامک استفاده شود و کد برگردانده نشود.

  console.log(`[OTP] phone=${phone} code=${code}`);

  return {
    ok: true,
    message: "کد تأیید ارسال شد"
    // در حالت توسعه می‌توان کد را هم برگرداند:
    // , dev_code: code
  };
}

export async function verifyOtp(
  env: Env,
  rawPhone: string,
  code: string
): Promise<{ ok: true; userId: number; isNew: boolean } | { ok: false; error: string }> {
  const phone = normalizePhone(rawPhone);
  if (!phone) {
    return { ok: false, error: "شماره موبایل معتبر نیست" };
  }

  if (!code || code.length < 4) {
    return { ok: false, error: "کد تأیید نامعتبر است" };
  }

  const row = await env.DB.prepare(
    `SELECT id, code, attempts, expires_at, used 
     FROM otp_codes 
     WHERE phone = ? AND used = 0 
     ORDER BY created_at DESC LIMIT 1`
  ).bind(phone).first<{
    id: number;
    code: string;
    attempts: number;
    expires_at: string;
    used: number;
  }>();

  if (!row) {
    return { ok: false, error: "کد تأیید یافت نشد. دوباره درخواست دهید" };
  }

  if (row.attempts >= MAX_ATTEMPTS) {
    return { ok: false, error: "تعداد تلاش‌ها بیش از حد مجاز است. دوباره کد درخواست دهید" };
  }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    return { ok: false, error: "کد تأیید منقضی شده است" };
  }

  if (row.code !== code) {
    await env.DB.prepare(
      `UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?`
    ).bind(row.id).run();
    return { ok: false, error: "کد تأیید اشتباه است" };
  }

  // کد درست است → استفاده شد
  await env.DB.prepare(
    `UPDATE otp_codes SET used = 1 WHERE id = ?`
  ).bind(row.id).run();

  // پیدا کردن یا ساختن کاربر
  let user = await env.DB.prepare(
    `SELECT id FROM users WHERE phone = ?`
  ).bind(phone).first<{ id: number }>();

  let isNew = false;

  if (!user) {
    isNew = true;
    const result = await env.DB.prepare(
      `INSERT INTO users (phone, is_buyer, is_seller, status) VALUES (?, 1, 0, 'active')`
    ).bind(phone).run();

    const userId = result.meta.last_row_id as number;

    // ساخت پروفایل و کیف پول
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO user_profiles (user_id, reputation_score) VALUES (?, 80)`
      ).bind(userId),
      env.DB.prepare(
        `INSERT INTO user_wallets (user_id, balance, locked_balance) VALUES (?, 0, 0)`
      ).bind(userId)
    ]);

    // اختصاص پلن رایگان
    const freePlan = await env.DB.prepare(
      `SELECT id FROM subscription_plans WHERE code = 'free' LIMIT 1`
    ).first<{ id: number }>();

    if (freePlan) {
      const now = new Date();
      const ends = new Date();
      ends.setFullYear(ends.getFullYear() + 10); // پلن رایگان بلندمدت

      await env.DB.prepare(
        `INSERT INTO user_subscriptions (user_id, plan_id, starts_at, ends_at, is_active)
         VALUES (?, ?, ?, ?, 1)`
      ).bind(userId, freePlan.id, now.toISOString(), ends.toISOString()).run();
    }

    return { ok: true, userId, isNew: true };
  }

  return { ok: true, userId: user.id, isNew: false };
}
