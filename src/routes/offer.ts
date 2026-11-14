/**
 * Offer & Pool routes
 */

import { requireAuth } from "../middleware/auth";
import {
  createOffer,
  getPoolRequests,
  getOffersForRequest,
  type Env
} from "../services/offer";
import { json, error } from "../utils/response";

export async function handleOfferRoutes(
  request: Request,
  env: Env,
  path: string
): Promise<Response | null> {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const { userId } = auth;

  // GET /api/pool  → استخر درخواست‌ها برای فروشنده
  if (path === "/api/pool" && request.method === "GET") {
    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get("limit") || 20), 50);
    const offset = Number(url.searchParams.get("offset") || 0);

    const pool = await getPoolRequests(env, userId, limit, offset);

    return json({
      success: true,
      data: pool
    });
  }

  // POST /api/offers  → ثبت پیشنهاد قیمت
  if (path === "/api/offers" && request.method === "POST") {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return error("بدنه درخواست نامعتبر است");
    }

    const result = await createOffer(env, userId, {
      request_id: body.request_id,
      request_item_id: body.request_item_id,
      price: body.price,
      quantity: body.quantity,
      valid_hours: body.valid_hours
    });

    if (!result.ok) return error(result.error);

    return json({
      success: true,
      message: "پیشنهاد شما با موفقیت ثبت شد",
      offer_id: result.offerId
    }, 201);
  }

  // GET /api/requests/:id/offers  → پیشنهادهای رسیده به درخواست من (خریدار)
  const match = path.match(/^\/api\/requests\/(\d+)\/offers$/);
  if (match && request.method === "GET") {
    const requestId = Number(match[1]);
    const result = await getOffersForRequest(env, userId, requestId);

    if (!result.ok) return error(result.error, 403);

    return json({
      success: true,
      data: result.offers
    });
  }

  return null;
}
