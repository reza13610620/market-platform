/**
 * Profile routes - /api/me
 */

import { requireAuth } from "../middleware/auth";
import { getMe, updateMe, type Env } from "../services/profile";
import { json, error } from "../utils/response";

export async function handleProfileRoutes(
  request: Request,
  env: Env,
  path: string
): Promise<Response | null> {
  if (path !== "/api/me") return null;

  // All profile routes need authentication
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth; // unauthorized

  const { userId } = auth;

  // GET /api/me
  if (request.method === "GET") {
    const me = await getMe(env, userId);
    if (!me) return error("کاربر یافت نشد", 404);
    return json({ success: true, data: me });
  }

  // PATCH /api/me
  if (request.method === "PATCH") {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return error("بدنه درخواست نامعتبر است");
    }

    // Only allow known fields
    const allowed = {
      first_name: body.first_name,
      last_name: body.last_name,
      city_name: body.city_name,
      bio: body.bio,
      avatar_url: body.avatar_url,
      is_seller: body.is_seller,
      notification_prefs: body.notification_prefs
    };

    // Remove undefined keys
    const data: any = {};
    for (const [k, v] of Object.entries(allowed)) {
      if (v !== undefined) data[k] = v;
    }

    if (Object.keys(data).length === 0) {
      return error("هیچ فیلدی برای به‌روزرسانی ارسال نشده");
    }

    const result = await updateMe(env, userId, data);
    if (!result.ok) return error(result.error);

    // Return updated profile
    const me = await getMe(env, userId);
    return json({ success: true, data: me });
  }

  return error("Method not allowed", 405);
}
