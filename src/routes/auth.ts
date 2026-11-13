/**
 * Auth routes: /api/auth/request-otp  &  /api/auth/verify-otp
 */

import { requestOtp, verifyOtp, type Env } from "../services/auth";
import { json, error } from "../utils/response";

export async function handleAuthRoutes(
  request: Request,
  env: Env,
  path: string
): Promise<Response | null> {
  if (request.method !== "POST") {
    return error("Method not allowed", 405);
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return error("بدنه درخواست نامعتبر است");
  }

  // POST /api/auth/request-otp
  if (path === "/api/auth/request-otp") {
    const phone = body?.phone;
    if (!phone) return error("شماره موبایل الزامی است");

    const result = await requestOtp(env, String(phone));
    if (!result.ok) return error(result.error);

    return json({ success: true, message: result.message });
  }

  // POST /api/auth/verify-otp
  if (path === "/api/auth/verify-otp") {
    const phone = body?.phone;
    const code = body?.code;

    if (!phone || !code) return error("شماره موبایل و کد تأیید الزامی است");

    const result = await verifyOtp(env, String(phone), String(code));
    if (!result.ok) return error(result.error);

    // فعلاً یک توکن ساده برمی‌گردانیم (در مرحله بعد JWT واقعی می‌شود)
    const token = btoa(`user:${result.userId}:${Date.now()}`);

    return json({
      success: true,
      user_id: result.userId,
      is_new_user: result.isNew,
      token
    });
  }

  return null;
}
