import { requireAuth } from "../middleware/auth";
import {
  getMyNotifications,
  markNotificationsRead,
  getUnreadCount,
  type Env,
} from "../services/notification";
import { json } from "../utils/response";

export async function handleNotificationRoutes(
  request: Request,
  env: Env,
  path: string
): Promise<Response | null> {
  if (!path.startsWith("/api/notifications")) return null;

  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;
  const { userId } = auth;

  if (path === "/api/notifications" && request.method === "GET") {
    const list = await getMyNotifications(env, userId);
    const unread = await getUnreadCount(env, userId);
    return json({ success: true, data: list, unread_count: unread });
  }

  if (path === "/api/notifications/read" && request.method === "POST") {
    let body: any = {};
    try {
      body = await request.json();
    } catch {}
    await markNotificationsRead(env, userId, body.ids);
    return json({ success: true, message: "خوانده شد" });
  }

  if (path === "/api/notifications/unread-count" && request.method === "GET") {
    const count = await getUnreadCount(env, userId);
    return json({ success: true, count });
  }

  return null;
}
