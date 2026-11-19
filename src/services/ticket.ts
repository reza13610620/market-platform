/**
 * سیستم تیکت پشتیبانی – نسخه ساده
 * کاربر تیکت باز می‌کند → پشتیبانی پاسخ می‌دهد → بسته می‌شود
 */

export interface Env {
  DB: D1Database;
}

export interface CreateTicketInput {
  subject: string;
  message: string;
  priority?: string;
}

export async function createTicket(
  env: Env,
  userId: number,
  input: CreateTicketInput
): Promise<{ ok: true; ticketId: number } | { ok: false; error: string }> {
  const subject = input.subject?.trim();
  const message = input.message?.trim();

  if (!subject || subject.length < 3) {
    return { ok: false, error: "موضوع تیکت باید حداقل ۳ حرف باشد" };
  }
  if (subject.length > 200) {
    return { ok: false, error: "موضوع خیلی طولانی است" };
  }
  if (!message || message.length < 5) {
    return { ok: false, error: "پیام اولیه باید حداقل ۵ حرف باشد" };
  }

  // محدودیت ساده تعداد تیکت باز
  const openCount = await env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM tickets WHERE user_id = ? AND status IN ('open', 'in_progress')`
  ).bind(userId).first<{ cnt: number }>();

  if ((openCount?.cnt || 0) >= 5) {
    return { ok: false, error: "شما بیش از ۵ تیکت باز دارید. لطفاً ابتدا آن‌ها را پیگیری کنید." };
  }

  const priority = input.priority === "high" ? "high" : "normal";

  const ticketResult = await env.DB.prepare(
    `INSERT INTO tickets (user_id, subject, status, priority)
     VALUES (?, ?, 'open', ?)`
  ).bind(userId, subject, priority).run();

  const ticketId = ticketResult.meta.last_row_id as number;

  // پیام اول
  await env.DB.prepare(
    `INSERT INTO ticket_messages (ticket_id, sender_id, message, is_admin)
     VALUES (?, ?, ?, 0)`
  ).bind(ticketId, userId, message).run();

  return { ok: true, ticketId };
}

export async function getMyTickets(
  env: Env,
  userId: number,
  limit = 20,
  offset = 0
): Promise<any[]> {
  const rows = await env.DB.prepare(
    `SELECT id, subject, status, priority, created_at, updated_at
     FROM tickets
     WHERE user_id = ?
     ORDER BY updated_at DESC
     LIMIT ? OFFSET ?`
  ).bind(userId, limit, offset).all();

  return (rows.results || []).map((row: any) => ({
    id: row.id,
    subject: row.subject,
    status: row.status,
    status_label: statusLabel(row.status),
    priority: row.priority,
    created_at: row.created_at,
    updated_at: row.updated_at
  }));
}

export async function getTicketDetails(
  env: Env,
  userId: number,
  ticketId: number,
  isAdminView = false
): Promise<{ ok: true; ticket: any; messages: any[] } | { ok: false; error: string }> {
  const ticket = await env.DB.prepare(
    `SELECT id, user_id, subject, status, priority, assigned_admin, created_at, updated_at
     FROM tickets WHERE id = ?`
  ).bind(ticketId).first<any>();

  if (!ticket) return { ok: false, error: "تیکت یافت نشد" };

  // کاربر فقط تیکت خودش را می‌بیند
  if (!isAdminView && ticket.user_id !== userId) {
    return { ok: false, error: "دسترسی مجاز نیست" };
  }

  const messages = await env.DB.prepare(
    `SELECT m.id, m.sender_id, m.message, m.is_admin, m.created_at,
            u.first_name, u.last_name
     FROM ticket_messages m
     LEFT JOIN users u ON u.id = m.sender_id
     WHERE m.ticket_id = ?
     ORDER BY m.created_at ASC`
  ).bind(ticketId).all();

  return {
    ok: true,
    ticket: {
      id: ticket.id,
      subject: ticket.subject,
      status: ticket.status,
      status_label: statusLabel(ticket.status),
      priority: ticket.priority,
      created_at: ticket.created_at,
      updated_at: ticket.updated_at
    },
    messages: (messages.results || []).map((m: any) => ({
      id: m.id,
      message: m.message,
      is_admin: !!m.is_admin,
      sender_name: m.is_admin
        ? "پشتیبانی"
        : [m.first_name, m.last_name].filter(Boolean).join(" ") || "کاربر",
      created_at: m.created_at
    }))
  };
}

export async function addTicketMessage(
  env: Env,
  userId: number,
  ticketId: number,
  message: string,
  asAdmin = false
): Promise<{ ok: true } | { ok: false; error: string }> {
  const text = message?.trim();
  if (!text || text.length < 2) {
    return { ok: false, error: "پیام خیلی کوتاه است" };
  }

  const ticket = await env.DB.prepare(
    `SELECT id, user_id, status FROM tickets WHERE id = ?`
  ).bind(ticketId).first<any>();

  if (!ticket) return { ok: false, error: "تیکت یافت نشد" };

  if (!asAdmin && ticket.user_id !== userId) {
    return { ok: false, error: "دسترسی مجاز نیست" };
  }

  if (ticket.status === "closed") {
    return { ok: false, error: "این تیکت بسته شده است" };
  }

  await env.DB.prepare(
    `INSERT INTO ticket_messages (ticket_id, sender_id, message, is_admin)
     VALUES (?, ?, ?, ?)`
  ).bind(ticketId, userId, text, asAdmin ? 1 : 0).run();

  // وضعیت را به in_progress تغییر بده اگر ادمین جواب داد
  const newStatus = asAdmin ? "in_progress" : ticket.status;

  await env.DB.prepare(
    `UPDATE tickets SET status = ?, updated_at = datetime('now') WHERE id = ?`
  ).bind(newStatus, ticketId).run();

  return { ok: true };
}

export async function closeTicket(
  env: Env,
  userId: number,
  ticketId: number,
  asAdmin = false
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ticket = await env.DB.prepare(
    `SELECT id, user_id, status FROM tickets WHERE id = ?`
  ).bind(ticketId).first<any>();

  if (!ticket) return { ok: false, error: "تیکت یافت نشد" };

  if (!asAdmin && ticket.user_id !== userId) {
    return { ok: false, error: "دسترسی مجاز نیست" };
  }

  if (ticket.status === "closed") {
    return { ok: false, error: "تیکت قبلاً بسته شده است" };
  }

  await env.DB.prepare(
    `UPDATE tickets SET status = 'closed', updated_at = datetime('now') WHERE id = ?`
  ).bind(ticketId).run();

  return { ok: true };
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    open: "باز",
    in_progress: "در حال بررسی",
    closed: "بسته شده"
  };
  return map[status] || status;
}
