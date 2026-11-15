/**
 * Product suggestion service
 * کاربران می‌توانند کالای ناموجود را پیشنهاد دهند
 */

export interface Env {
  DB: D1Database;
}

export interface SuggestProductInput {
  title: string;
  description?: string | null;
  category_id?: number | null;
  brand?: string | null;
}

export async function suggestProduct(
  env: Env,
  userId: number,
  input: SuggestProductInput
): Promise<{ ok: true; suggestionId: number } | { ok: false; error: string }> {
  const title = input.title?.trim();
  if (!title || title.length < 2) {
    return { ok: false, error: "عنوان کالا الزامی است و باید حداقل ۲ حرف باشد" };
  }

  if (title.length > 200) {
    return { ok: false, error: "عنوان کالا خیلی طولانی است" };
  }

  // Prevent exact duplicate pending suggestions from same user
  const existing = await env.DB.prepare(
    `SELECT id FROM product_review_queue 
     WHERE submitted_by = ? AND title = ? AND status IN ('pending_ai', 'pending_admin')
     LIMIT 1`
  ).bind(userId, title).first();

  if (existing) {
    return { ok: false, error: "شما قبلاً این کالا را پیشنهاد داده‌اید و در حال بررسی است" };
  }

  const result = await env.DB.prepare(
    `INSERT INTO product_review_queue 
     (submitted_by, title, description, category_id, attributes_json, status, source)
     VALUES (?, ?, ?, ?, ?, 'pending_ai', 'user_suggestion')`
  ).bind(
    userId,
    title,
    input.description?.trim() || null,
    input.category_id || null,
    input.brand ? JSON.stringify({ brand: input.brand.trim() }) : null
  ).run();

  return { ok: true, suggestionId: result.meta.last_row_id as number };
}

export async function getMySuggestions(
  env: Env,
  userId: number,
  limit = 20,
  offset = 0
): Promise<any[]> {
  const rows = await env.DB.prepare(
    `SELECT id, title, description, status, admin_note, created_at, reviewed_at
     FROM product_review_queue
     WHERE submitted_by = ?
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`
  ).bind(userId, limit, offset).all();

  return (rows.results || []).map((row: any) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    status_label: statusLabel(row.status),
    admin_note: row.admin_note,
    created_at: row.created_at,
    reviewed_at: row.reviewed_at
  }));
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending_ai: 'در حال بررسی اولیه',
    pending_admin: 'در انتظار تأیید نهایی',
    needs_edit: 'نیاز به ویرایش',
    approved: 'تأیید شده',
    rejected: 'رد شده'
  };
  return map[status] || status;
}
