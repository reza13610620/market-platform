/**
 * Contact reveal routes
 */

import { requireAuth } from "../middleware/auth";
import { revealSellerContact, getMyRemainingQuota, type Env } from "../services/contact";
import { json, error } from "../utils/response";

export async function handleContactRoutes(
  request: Request,
  env: Env,
  path: string
): Promise<Response | null> {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const { userId } = auth;

  // GET /api/contact/quota  → سهمیه باقی‌مانده من
  if (path === "/api/contact/quota" && request.method === "GET") {
    const remaining = await getMyRemainingQuota(env, userId);
    return json({
      success: true,
      data: {
        remaining_quota: remaining, // null = نامحدود
        is_unlimited: remaining === null
      }
    });
  }

  // POST /api/offers/:id/reveal  → نمایش اطلاعات فروشنده
  const match = path.match(/^\/api\/offers\/(\d+)\/reveal$/);
  if (match && request.method === "POST") {
    const offerId = Number(match[1]);
    const result = await revealSellerContact(env, userId, offerId);

    if (!result.ok) {
      const status = result.code === "NO_QUOTA" ? 402 : 403;
      return error(result.error, status, { code: result.code });
    }

    return json({
      success: true,
      message: "اطلاعات فروشنده نمایش داده شد",
      data: {
        seller: result.seller,
        remaining_quota: result.remaining_quota
      }
    });
  }

  return null;
}
