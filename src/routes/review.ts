/**
 * Review & Order completion routes
 * POST /api/orders/:id/review
 * POST /api/orders/:id/complete
 * GET  /api/me/reviews
 * GET  /api/me/orders
 * GET  /api/users/:id/reviews
 */

import { requireAuth } from "../middleware/auth";
import {
  createReview,
  getMyReviews,
  getUserReviews,
  markOrderCompleted,
  getMyOrders,
  type Env,
} from "../services/review";
import { json, error } from "../utils/response";

export async function handleReviewRoutes(
  request: Request,
  env: Env,
  path: string
): Promise<Response | null> {
  // GET /api/me/reviews
  if (path === "/api/me/reviews" && request.method === "GET") {
    const auth = await requireAuth(request, env);
    if (auth instanceof Response) return auth;

    const data = await getMyReviews(env, auth.userId);
    return json({ success: true, data });
  }

  // GET /api/me/orders
  if (path === "/api/me/orders" && request.method === "GET") {
    const auth = await requireAuth(request, env);
    if (auth instanceof Response) return auth;

    const url = new URL(request.url);
    const status = url.searchParams.get("status") || undefined;

    const data = await getMyOrders(env, auth.userId, status || undefined);
    return json({ success: true, data });
  }

  // GET /api/users/:id/reviews
  const userReviewsMatch = path.match(/^\/api\/users\/(\d+)\/reviews$/);
  if (userReviewsMatch && request.method === "GET") {
    const targetUserId = parseInt(userReviewsMatch[1], 10);
    if (isNaN(targetUserId)) return error("شناسه کاربر نامعتبر است");

    // عمومی است (ناشناس)
    const data = await getUserReviews(env, targetUserId);
    return json({ success: true, data });
  }

  // POST /api/orders/:id/review
  const reviewMatch = path.match(/^\/api\/orders\/(\d+)\/review$/);
  if (reviewMatch && request.method === "POST") {
    const auth = await requireAuth(request, env);
    if (auth instanceof Response) return auth;

    const orderId = parseInt(reviewMatch[1], 10);
    if (isNaN(orderId)) return error("شناسه سفارش نامعتبر است");

    let body: any;
    try {
      body = await request.json();
    } catch {
      return error("بدنه درخواست نامعتبر است");
    }

    const result = await createReview(env, auth.userId, {
      orderId,
      rating: body.rating,
      comment: body.comment,
    });

    if (!result.ok) return error(result.error);

    return json({
      success: true,
      data: { review_id: result.reviewId },
      message: "بازخورد شما با موفقیت ثبت شد",
    });
  }

  // POST /api/orders/:id/complete
  const completeMatch = path.match(/^\/api\/orders\/(\d+)\/complete$/);
  if (completeMatch && request.method === "POST") {
    const auth = await requireAuth(request, env);
    if (auth instanceof Response) return auth;

    const orderId = parseInt(completeMatch[1], 10);
    if (isNaN(orderId)) return error("شناسه سفارش نامعتبر است");

    const result = await markOrderCompleted(env, auth.userId, orderId);
    if (!result.ok) return error(result.error);

    return json({
      success: true,
      message: "معامله با موفقیت تکمیل شد. حالا می‌توانید به هم امتیاز بدهید.",
    });
  }

  return null;
}
