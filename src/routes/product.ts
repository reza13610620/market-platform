/**
 * Product suggestion + admin review routes
 */

import { requireAuth } from "../middleware/auth";
import {
  suggestProduct,
  getMySuggestions,
  getAdminReviewQueue,
  approveSuggestion,
  rejectSuggestion,
  requestEditSuggestion,
  type Env
} from "../services/product";
import { json, error } from "../utils/response";

/**
 * بررسی ساده نقش ادمین (موقت)
 * بعداً با سیستم نقش واقعی جایگزین می‌شود.
 * فعلاً برای تست، هر کاربر لاگین‌شده می‌تواند (بعداً محدود می‌کنیم).
 */
async function requireAdmin(
  request: Request,
  env: Env
): Promise<{ userId: number } | Response> {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  // TODO: اضافه کردن چک نقش واقعی (مثلاً جدول admin_users یا فیلد is_admin)
  // فعلاً برای پیشبرد کار، اجازه می‌دهیم هر کاربر لاگین‌شده تست کند.
  // در نسخه بعدی فقط کاربران ادمین دسترسی خواهند داشت.

  return { userId: auth.userId };
}

export async function handleProductRoutes(
  request: Request,
  env: Env,
  path: string
): Promise<Response | null> {
  if (!path.startsWith("/api/products") && !path.startsWith("/api/admin/products")) {
    return null;
  }

  // ========== User endpoints ==========

  // POST /api/products/suggest
  if (path === "/api/products/suggest" && request.method === "POST") {
    const auth = await requireAuth(request, env);
    if (auth instanceof Response) return auth;

    let body: any;
    try {
      body = await request.json();
    } catch {
      return error("بدنه درخواست نامعتبر است");
    }

    const result = await suggestProduct(env, auth.userId, {
      title: body.title,
      description: body.description,
      category_id: body.category_id,
      brand: body.brand
    });

    if (!result.ok) return error(result.error);

    return json({
      success: true,
      message: "پیشنهاد شما ثبت شد و در حال بررسی است",
      suggestion_id: result.suggestionId
    }, 201);
  }

  // GET /api/products/my-suggestions
  if (path === "/api/products/my-suggestions" && request.method === "GET") {
    const auth = await requireAuth(request, env);
    if (auth instanceof Response) return auth;

    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get("limit") || 20), 50);
    const offset = Number(url.searchParams.get("offset") || 0);

    const list = await getMySuggestions(env, auth.userId, limit, offset);

    return json({
      success: true,
      data: list
    });
  }

  // ========== Admin endpoints ==========

  // GET /api/admin/products/review-queue
  if (path === "/api/admin/products/review-queue" && request.method === "GET") {
    const admin = await requireAdmin(request, env);
    if (admin instanceof Response) return admin;

    const url = new URL(request.url);
    const status = url.searchParams.get("status") || "pending_admin";
    const limit = Math.min(Number(url.searchParams.get("limit") || 30), 100);
    const offset = Number(url.searchParams.get("offset") || 0);

    const result = await getAdminReviewQueue(env, { status, limit, offset });

    return json({
      success: true,
      total: result.total,
      data: result.items
    });
  }

  // POST /api/admin/products/:id/approve
  const approveMatch = path.match(/^\/api\/admin\/products\/(\d+)\/approve$/);
  if (approveMatch && request.method === "POST") {
    const admin = await requireAdmin(request, env);
    if (admin instanceof Response) return admin;

    const suggestionId = Number(approveMatch[1]);
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // body اختیاری است
    }

    const result = await approveSuggestion(env, admin.userId, suggestionId, {
      admin_note: body.admin_note,
      category_id: body.category_id,
      title: body.title,
      description: body.description,
      brand: body.brand
    });

    if (!result.ok) return error(result.error);

    return json({
      success: true,
      message: "کالا تأیید و به کاتالوگ اضافه شد",
      product_id: result.productId
    });
  }

  // POST /api/admin/products/:id/reject
  const rejectMatch = path.match(/^\/api\/admin\/products\/(\d+)\/reject$/);
  if (rejectMatch && request.method === "POST") {
    const admin = await requireAdmin(request, env);
    if (admin instanceof Response) return admin;

    const suggestionId = Number(rejectMatch[1]);
    let body: any;
    try {
      body = await request.json();
    } catch {
      return error("بدنه درخواست نامعتبر است");
    }

    const result = await rejectSuggestion(env, admin.userId, suggestionId, body.admin_note || body.reason || "");

    if (!result.ok) return error(result.error);

    return json({
      success: true,
      message: "پیشنهاد رد شد"
    });
  }

  // POST /api/admin/products/:id/request-edit
  const editMatch = path.match(/^\/api\/admin\/products\/(\d+)\/request-edit$/);
  if (editMatch && request.method === "POST") {
    const admin = await requireAdmin(request, env);
    if (admin instanceof Response) return admin;

    const suggestionId = Number(editMatch[1]);
    let body: any;
    try {
      body = await request.json();
    } catch {
      return error("بدنه درخواست نامعتبر است");
    }

    const result = await requestEditSuggestion(env, admin.userId, suggestionId, body.admin_note || body.reason || "");

    if (!result.ok) return error(result.error);

    return json({
      success: true,
      message: "درخواست اصلاح برای کاربر ارسال شد"
    });
  }

  return null;
}
