/**
 * Auth middleware - extracts and verifies user from token
 */

import { verifyToken, extractBearerToken, type TokenPayload } from "../utils/jwt";
import { unauthorized } from "../utils/response";

export interface Env {
  DB: D1Database;
  JWT_SECRET?: string;
}

export interface AuthResult {
  userId: number;
  payload: TokenPayload;
}

export async function requireAuth(
  request: Request,
  env: Env
): Promise<AuthResult | Response> {
  const token = extractBearerToken(request);
  if (!token) return unauthorized("توکن یافت نشد");

  const secret = env.JWT_SECRET || "dev-secret-change-me-in-production";
  const payload = await verifyToken(token, secret);

  if (!payload) return unauthorized("توکن نامعتبر یا منقضی شده است");

  // Optional: check user still active
  const user = await env.DB.prepare(
    `SELECT id, status FROM users WHERE id = ?`
  ).bind(payload.userId).first<{ id: number; status: string }>();

  if (!user) return unauthorized("کاربر یافت نشد");
  if (user.status === "banned" || user.status === "suspended") {
    return unauthorized("حساب شما محدود یا مسدود شده است");
  }

  return { userId: user.id, payload };
}
