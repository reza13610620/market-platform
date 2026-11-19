/**
 * سرویس اعلان‌ها – نسخه ساده
 */

export interface Env {
  DB: D1Database;
}

export async function createNotification(
  env: Env,
  userId: number,
  title: string,
  body: string,
  channel: string = "in_app"
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO notifications (user_id, channel, title, body, status)
     VALUES (?, ?, ?, ?, 'pending')`
  )
    .bind(userId, channel, title, body)
    .run();
}

export async function getMyNotifications(
  env: Env,
  userId: number,
  limit = 30
): Promise<any[]> {
  const rows = await env.DB.prepare(
    `SELECT id, title, body, status, created_at, sent_at
     FROM notifications
     WHERE user_id = ? AND channel = 'in_app'
     ORDER BY created_at DESC
     LIMIT ?`
  )
    .bind(userId, limit)
    .all();

  return (rows.results || []).map((r: any) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    status: r.status,
    is_read: r.status === "sent" || r.status === "read",
    created_at: r.created_at,
  }));
}

export async function markNotificationsRead(
  env: Env,
  userId: number,
  ids?: number[]
): Promise<void> {
  if (ids && ids.length > 0) {
    const placeholders = ids.map(() => "?").join(",");
    await env.DB.prepare(
      `UPDATE notifications SET status = 'read', sent_at = datetime('now')
       WHERE user_id = ? AND id IN (${placeholders})`
    )
      .bind(userId, ...ids)
      .run();
  } else {
    await env.DB.prepare(
      `UPDATE notifications SET status = 'read', sent_at = datetime('now')
       WHERE user_id = ? AND status IN ('pending', 'sent')`
    )
      .bind(userId)
      .run();
  }
}

export async function getUnreadCount(env: Env, userId: number): Promise<number> {
  const row = await env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM notifications
     WHERE user_id = ? AND channel = 'in_app' AND status = 'pending'`
  )
    .bind(userId)
    .first<{ cnt: number }>();
  return row?.cnt || 0;
}
