/**
 * Ticket routes – نسخه ساده
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
  if (!path.startsWith("/api/tickets")) return null;

  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;
  const { userId } = auth;

  // POST /api/tickets – ایجاد تیکت جدید
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

  // GET /api/tickets – لیست تیکت‌های من
  if (path === "/api/tickets" && request.method === "GET") {
    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get("limit") || 20), 50);
    const offset = Number(url.searchParams.get("offset") || 0);

    const list = await getMyTickets(env, userId, limit, offset);

    return json({
      success: true,
      data: list
    });
  }

  // GET /api/tickets/:id – جزئیات + پیام‌ها
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

  // POST /api/tickets/:id/messages – ارسال پیام جدید
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

    return json({
      success: true,
      message: "پیام ارسال شد"
    });
  }

  // POST /api/tickets/:id/close – بستن تیکت
  const closeMatch = path.match(/^\/api\/tickets\/(\d+)\/close$/);
  if (closeMatch && request.method === "POST") {
    const ticketId = Number(closeMatch[1]);
    const result = await closeTicket(env, userId, ticketId);

    if (!result.ok) return error(result.error);

    return json({
      success: true,
      message: "تیکت بسته شد"
    });
  }

  return null;
}
