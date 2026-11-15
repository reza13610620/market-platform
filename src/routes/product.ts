/**
 * Product suggestion routes
 */

import { requireAuth } from "../middleware/auth";
import { suggestProduct, getMySuggestions, type Env } from "../services/product";
import { json, error } from "../utils/response";

export async function handleProductRoutes(
  request: Request,
  env: Env,
  path: string
): Promise<Response | null> {
  if (!path.startsWith("/api/products")) return null;

  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const { userId } = auth;

  // POST /api/products/suggest  → پیشنهاد کالای جدید
  if (path === "/api/products/suggest" && request.method === "POST") {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return error("بدنه درخواست نامعتبر است");
    }

    const result = await suggestProduct(env, userId, {
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

  // GET /api/products/my-suggestions  → لیست پیشنهادهای من
  if (path === "/api/products/my-suggestions" && request.method === "GET") {
    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get("limit") || 20), 50);
    const offset = Number(url.searchParams.get("offset") || 0);

    const list = await getMySuggestions(env, userId, limit, offset);

    return json({
      success: true,
      data: list
    });
  }

  return null;
}
