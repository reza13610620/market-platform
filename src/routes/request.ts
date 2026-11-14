/**
 * Request routes - /api/requests
 */

import { requireAuth } from "../middleware/auth";
import { createRequest, getMyRequests, type Env } from "../services/request";
import { json, error } from "../utils/response";

export async function handleRequestRoutes(
  request: Request,
  env: Env,
  path: string
): Promise<Response | null> {
  if (!path.startsWith("/api/requests")) return null;

  // All request routes need authentication
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const { userId } = auth;

  // POST /api/requests  → ثبت درخواست جدید
  if (path === "/api/requests" && request.method === "POST") {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return error("بدنه درخواست نامعتبر است");
    }

    const result = await createRequest(env, userId, {
      city_name: body.city_name,
      is_bulk: body.is_bulk,
      expires_in_hours: body.expires_in_hours,
      items: body.items || []
    });

    if (!result.ok) return error(result.error);

    return json({
      success: true,
      message: "درخواست با موفقیت ثبت شد",
      request_id: result.requestId
    }, 201);
  }

  // GET /api/requests/my  → لیست درخواست‌های من
  if (path === "/api/requests/my" && request.method === "GET") {
    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get("limit") || 20), 50);
    const offset = Number(url.searchParams.get("offset") || 0);

    const requests = await getMyRequests(env, userId, limit, offset);

    return json({
      success: true,
      data: requests
    });
  }

  return error("Method not allowed", 405);
}
