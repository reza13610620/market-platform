/**
 * Favorites routes
 * GET    /api/favorites
 * POST   /api/favorites
 * DELETE /api/favorites/:productId
 */

import { requireAuth } from "../middleware/auth";
import {
  addFavorite,
  removeFavorite,
  getMyFavorites,
  type Env,
} from "../services/favorite";
import { json, error } from "../utils/response";

export async function handleFavoriteRoutes(
  request: Request,
  env: Env,
  path: string
): Promise<Response | null> {
  if (!path.startsWith("/api/favorites")) return null;

  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;
  const { userId } = auth;

  if (path === "/api/favorites" && request.method === "GET") {
    const list = await getMyFavorites(env, userId);
    return json({ success: true, data: list });
  }

  if (path === "/api/favorites" && request.method === "POST") {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return error("بدنه نامعتبر");
    }
    const productId = Number(body.product_id);
    if (!productId) return error("شناسه کالا لازم است");

    const result = await addFavorite(env, userId, productId);
    if (!result.ok) return error(result.error);
    return json({ success: true, message: "به علاقه‌مندی‌ها اضافه شد" });
  }

  const delMatch = path.match(/^\/api\/favorites\/(\d+)$/);
  if (delMatch && request.method === "DELETE") {
    const productId = Number(delMatch[1]);
    const result = await removeFavorite(env, userId, productId);
    if (!result.ok) return error(result.error);
    return json({ success: true, message: "از علاقه‌مندی‌ها حذف شد" });
  }

  return null;
}
