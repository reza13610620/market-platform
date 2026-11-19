/**
 * Ticket routes – کاربر + ادمین ساده
 */

import { requireAuth } from "../middleware/auth";
import {
  createTicket,
  getMyTickets,
  getTicketDetails,
  addTicketMessage,
  closeTicket,
  type Env
} from "../services/ticket";
import { json, error } from "../utils/response";

export async function handleTicketRoutes(
  request: Request,
  env: Env,
  path: string
): Promise<Response | null> {
  // --- Admin simple endpoints (موقت: هر کاربر لاگین‌شده برای تست) ---
  if (path.startsWith("/api/admin/tickets")) {
    const auth = await requireAuth(request, env);
    if (auth instanceof Response) return auth;
    const { userId } = auth;

    // GET /api/admin/tickets – لیست همه تیکت‌های باز
    if (path === "/api/admin/tickets" && request.method === "GET") {
      const rows = await env.DB.prepare(
        `SELECT t.id, t.subject, t.status, t.priority, t.created_at, t.updated_at,
                u.phone, u.first_name, u.last_name
         FROM tickets t
         JOIN users u ON u.id = t.user_id
         WHERE t.status IN ('open', 'in_progress')
         ORDER BY t.updated_at DESC
         LIMIT 50`
      ).all();

      return json({
        success: true,
        data: (rows.results || []).map((r: any) => ({
          id: r.id,
          subject: r.subject,
          status: r.status,
          priority: r.priority,
          created_at: r.created_at,
          updated_at: r.updated_at,
          user_phone: r.phone,
          user_name: [r.first_name, r.last_name].filter(Boolean).join(" ") || "—",
        })),
      });
    }

    // GET /api/admin/tickets/:id
    const adminDetails = path.match(/^\/api\/admin\/tickets\/(\d+)$/);
    if (adminDetails && request.method === "GET") {
      const ticketId = Number(adminDetails[1]);
      const result = await getTicketDetails(env, userId, ticketId, true);
      if (!result.ok) return error(result.error, 404);
      return json({ success: true, ticket: result.ticket, messages: result.messages });
    }

    // POST /api/admin/tickets/:id/messages – پاسخ ادمین
    const adminMsg = path.match(/^\/api\/admin\/tickets\/(\d+)\/messages$/);
    if (adminMsg && request.method === "POST") {
      const ticketId = Number(adminMsg[1]);
      let body: any;
      try {
        body = await request.json();
      } catch {
        return error("بدنه نامعتبر");
      }
      const result = await addTicketMessage(env, userId, ticketId, body.message || "", true);
      if (!result.ok) return error(result.error);
      return json({ success: true, message: "پاسخ ثبت شد" });
    }

    // POST /api/admin/tickets/:id/close
    const adminClose = path.match(/^\/api\/admin\/tickets\/(\d+)\/close$/);
    if (adminClose && request.method === "POST") {
      const ticketId = Number(adminClose[1]);
      const result = await closeTicket(env, userId, ticketId, true);
      if (!result.ok) return error(result.error);
      return json({ success: true, message: "تیکت بسته شد" });
    }

    return null;
  }

  if (!path.startsWith("/api/tickets")) return null;

  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;
  const { userId } = auth;

  if (path === "/api/tickets" && request.method === "POST") {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return error("بدنه درخواست نامعتبر است");
    }

    const result = await createTicket(env, userId, {
      subject: body.subject,
      message: body.message,
      priority: body.priority
    });

    if (!result.ok) return error(result.error);

    return json({
      success: true,
      message: "تیکت شما ثبت شد",
      ticket_id: result.ticketId
    }, 201);
  }

  if (path === "/api/tickets" && request.method === "GET") {
    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get("limit") || 20), 50);
    const offset = Number(url.searchParams.get("offset") || 0);

    const list = await getMyTickets(env, userId, limit, offset);

    return json({ success: true, data: list });
  }

  const detailsMatch = path.match(/^\/api\/tickets\/(\d+)$/);
  if (detailsMatch && request.method === "GET") {
    const ticketId = Number(detailsMatch[1]);
    const result = await getTicketDetails(env, userId, ticketId);

    if (!result.ok) return error(result.error, 404);

    return json({
      success: true,
      ticket: result.ticket,
      messages: result.messages
    });
  }

  const messageMatch = path.match(/^\/api\/tickets\/(\d+)\/messages$/);
  if (messageMatch && request.method === "POST") {
    const ticketId = Number(messageMatch[1]);
    let body: any;
    try {
      body = await request.json();
    } catch {
      return error("بدنه درخواست نامعتبر است");
    }

    const result = await addTicketMessage(env, userId, ticketId, body.message || "");

    if (!result.ok) return error(result.error);

    return json({ success: true, message: "پیام ارسال شد" });
  }

  const closeMatch = path.match(/^\/api\/tickets\/(\d+)\/close$/);
  if (closeMatch && request.method === "POST") {
    const ticketId = Number(closeMatch[1]);
    const result = await closeTicket(env, userId, ticketId);

    if (!result.ok) return error(result.error);

    return json({ success: true, message: "تیکت بسته شد" });
  }

  return null;
}
