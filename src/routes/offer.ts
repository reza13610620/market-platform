/**
 * Offer & Pool routes + cancel with penalty
 */

import { requireAuth } from "../middleware/auth";
import {
  createOffer,
  getPoolRequests,
  getOffersForRequest,
  cancelOfferWithPenalty,
  type Env
} from "../services/offer";
import { getUserPenalties } from "../services/penalty";
import { json, error } from "../utils/response";

export async function handleOfferRoutes(
  request: Request,
  env: Env,
  path: string
): Promise<Response | null> {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const { userId } = auth;

  // GET /api/pool
  if (path === "/api/pool" && request.method === "GET") {
    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get("limit") || 20), 50);
    const offset = Number(url.searchParams.get("offset") || 0);
    const onlyMySupply = url.searchParams.get("only_my_supply") === "1";

    const cityParam = url.searchParams.get("city") || "all";
    const cityFilter = cityParam === "my" ? "my" : "all";

    const timeParam = url.searchParams.get("time") || "all";
    const timeFilter = timeParam === "today" ? "today" : "all";

    const typeParam = url.searchParams.get("type") || "all";
    const typeFilter =
      typeParam === "single" ? "single" : typeParam === "bulk" ? "bulk" : "all";

    const pool = await getPoolRequests(env, userId, {
      limit,
      offset,
      onlyMySupply,
      cityFilter,
      timeFilter,
      typeFilter
    });

    return json({
      success: true,
      data: pool,
      filters: {
        only_my_supply: onlyMySupply,
        city: cityFilter,
        time: timeFilter,
        type: typeFilter
      }
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

  // POST /api/offers/:id/cancel  → لغو پیشنهاد + پنالتی
  const cancelMatch = path.match(/^\/api\/offers\/(\d+)\/cancel$/);
  if (cancelMatch && request.method === "POST") {
    const offerId = Number(cancelMatch[1]);
    const result = await cancelOfferWithPenalty(env, userId, offerId);

    if (!result.ok) return error(result.error);

    return json({
      success: true,
      message: result.message
    });
  }

  // GET /api/penalties/my  → لیست پنالتی‌های من
  if (path === "/api/penalties/my" && request.method === "GET") {
    const list = await getUserPenalties(env, userId);
    return json({
      success: true,
      data: list
    });
  }

  // GET /api/requests/:id/offers
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
