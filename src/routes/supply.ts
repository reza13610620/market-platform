/**
 * Seller Supply List routes
 */

import { requireAuth } from "../middleware/auth";
import {
  addToSupplyList,
  removeFromSupplyList,
  getMySupplyList,
  type Env
} from "../services/supply";
import { json, error } from "../utils/response";

export async function handleSupplyRoutes(
  request: Request,
  env: Env,
  path: string
): Promise<Response | null> {
  if (!path.startsWith("/api/supply")) return null;

  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const { userId } = auth;

  // GET /api/supply  → لیست تأمین من
  if (path === "/api/supply" && request.method === "GET") {
    const list = await getMySupplyList(env, userId);
    return json({
      success: true,
      data: list
    });
  }

  // POST /api/supply  → اضافه کردن کالا به لیست تأمین
  if (path === "/api/supply" && request.method === "POST") {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return error("بدنه درخواست نامعتبر است");
    }

    if (!body.product_id) {
      return error("شناسه کالا الزامی است");
    }

    const result = await addToSupplyList(env, userId, Number(body.product_id), body.notes);
    if (!result.ok) return error(result.error);

    return json({
      success: true,
      message: "کالا به لیست تأمین شما اضافه شد"
    }, 201);
  }

  // DELETE /api/supply/:productId  → حذف از لیست تأمین
  const match = path.match(/^\/api\/supply\/(\d+)$/);
  if (match && request.method === "DELETE") {
    const productId = Number(match[1]);
    const result = await removeFromSupplyList(env, userId, productId);
    if (!result.ok) return error(result.error);

    return json({
      success: true,
      message: "کالا از لیست تأمین شما حذف شد"
    });
  }

  return error("Method not allowed", 405);
}
