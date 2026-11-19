/**
 * Product suggestion + review queue service
 * + همگام‌سازی کالا با shared-catalog بعد از تأیید
 */

import { upsertSharedProduct } from "./sharedCatalog";

export interface Env {
  DB: D1Database;
  SHARED_CATALOG?: D1Database;
}

export interface SuggestProductInput {
  title: string;
  description?: string | null;
  category_id?: number | null;
  brand?: string | null;
}

export interface AdminReviewInput {
  admin_note?: string | null;
  category_id?: number | null;
  title?: string | null;
  description?: string | null;
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

  const existing = await env.DB.prepare(
    `SELECT id FROM product_review_queue 
     WHERE submitted_by = ? AND title = ? AND status IN ('pending_ai', 'pending_admin', 'needs_edit')
     LIMIT 1`
  )
    .bind(userId, title)
    .first();

  if (existing) {
    return { ok: false, error: "شما قبلاً این کالا را پیشنهاد داده‌اید و در حال بررسی است" };
  }

  const attributesJson = input.brand
    ? JSON.stringify({ brand: input.brand.trim() })
    : null;

  const insertResult = await env.DB.prepare(
    `INSERT INTO product_review_queue 
     (submitted_by, title, description, category_id, attributes_json, status, source)
     VALUES (?, ?, ?, ?, ?, 'pending_ai', 'user_suggestion')`
  )
    .bind(
      userId,
      title,
      input.description?.trim() || null,
      input.category_id || null,
      attributesJson
    )
    .run();

  const suggestionId = insertResult.meta.last_row_id as number;
  await runBasicAiReview(env, suggestionId);

  return { ok: true, suggestionId };
}

async function runBasicAiReview(env: Env, suggestionId: number): Promise<void> {
  const row = await env.DB.prepare(
    `SELECT id, title, description, attributes_json FROM product_review_queue WHERE id = ?`
  )
    .bind(suggestionId)
    .first<any>();

  if (!row) return;

  const title = (row.title || "").trim();
  const description = (row.description || "").trim();

  const similar = await env.DB.prepare(
    `SELECT id, title FROM products 
     WHERE status = 'active' AND (title LIKE ? OR title = ?)
     LIMIT 3`
  )
    .bind(`%${title.slice(0, 20)}%`, title)
    .all();

  const isDuplicate = (similar.results || []).length > 0;
  const duplicateId = isDuplicate ? (similar.results as any[])[0].id : null;

  let qualityScore = 40;
  if (title.length >= 8) qualityScore += 15;
  if (title.length >= 15) qualityScore += 10;
  if (description.length >= 20) qualityScore += 15;
  if (description.length >= 60) qualityScore += 10;
  if (row.attributes_json) qualityScore += 10;
  qualityScore = Math.min(100, qualityScore);

  const existsExternally = true;
  const riskLevel = isDuplicate ? "medium" : qualityScore < 50 ? "medium" : "low";

  const aiResult = {
    is_duplicate: isDuplicate,
    duplicate_product_id: duplicateId,
    exists_externally: existsExternally,
    external_sources: existsExternally ? ["stub"] : [],
    suggested_category_id: null,
    quality_score: qualityScore,
    issues: [] as string[],
    extracted_specs: row.attributes_json ? JSON.parse(row.attributes_json) : {},
    risk_level: riskLevel,
    recommendation: isDuplicate
      ? "review_carefully"
      : qualityScore >= 60
      ? "approve"
      : "needs_edit",
  };

  if (title.length < 5) aiResult.issues.push("عنوان خیلی کوتاه است");
  if (!description) aiResult.issues.push("توضیحات ندارد");
  if (isDuplicate) aiResult.issues.push("احتمال تکراری بودن با کالای موجود");

  await env.DB.prepare(
    `UPDATE product_review_queue 
     SET ai_result_json = ?, ai_score = ?, status = ?
     WHERE id = ?`
  )
    .bind(JSON.stringify(aiResult), qualityScore, "pending_admin", suggestionId)
    .run();
}

export async function getMySuggestions(
  env: Env,
  userId: number,
  limit = 20,
  offset = 0
): Promise<any[]> {
  const rows = await env.DB.prepare(
    `SELECT id, title, description, status, admin_note, ai_score, created_at, reviewed_at
     FROM product_review_queue
     WHERE submitted_by = ?
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`
  )
    .bind(userId, limit, offset)
    .all();

  return (rows.results || []).map((row: any) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    status_label: statusLabel(row.status),
    admin_note: row.admin_note,
    ai_score: row.ai_score,
    created_at: row.created_at,
    reviewed_at: row.reviewed_at,
  }));
}

export async function getAdminReviewQueue(
  env: Env,
  options: { status?: string; limit?: number; offset?: number } = {}
): Promise<{ items: any[]; total: number }> {
  const limit = Math.min(options.limit || 30, 100);
  const offset = options.offset || 0;
  const statusFilter = options.status || "pending_admin";

  const countRow = await env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM product_review_queue WHERE status = ?`
  )
    .bind(statusFilter)
    .first<{ cnt: number }>();

  const rows = await env.DB.prepare(
    `SELECT q.id, q.title, q.description, q.category_id, q.attributes_json,
            q.ai_result_json, q.ai_score, q.status, q.source, q.admin_note,
            q.created_at, q.submitted_by,
            u.first_name, u.last_name, u.phone
     FROM product_review_queue q
     LEFT JOIN users u ON u.id = q.submitted_by
     WHERE q.status = ?
     ORDER BY 
       CASE WHEN q.ai_score IS NULL THEN 0 ELSE q.ai_score END ASC,
       q.created_at ASC
     LIMIT ? OFFSET ?`
  )
    .bind(statusFilter, limit, offset)
    .all();

  const items = (rows.results || []).map((row: any) => {
    let aiResult = null;
    try {
      aiResult = row.ai_result_json ? JSON.parse(row.ai_result_json) : null;
    } catch {}
    let attrs = null;
    try {
      attrs = row.attributes_json ? JSON.parse(row.attributes_json) : null;
    } catch {}

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      category_id: row.category_id,
      attributes: attrs,
      ai_result: aiResult,
      ai_score: row.ai_score,
      status: row.status,
      status_label: statusLabel(row.status),
      source: row.source,
      admin_note: row.admin_note,
      created_at: row.created_at,
      submitted_by: {
        id: row.submitted_by,
        name: [row.first_name, row.last_name].filter(Boolean).join(" ") || null,
        phone: row.phone,
      },
    };
  });

  return { items, total: countRow?.cnt || 0 };
}

export async function approveSuggestion(
  env: Env,
  adminId: number,
  suggestionId: number,
  input: AdminReviewInput = {}
): Promise<{ ok: true; productId: number } | { ok: false; error: string }> {
  const row = await env.DB.prepare(
    `SELECT * FROM product_review_queue WHERE id = ?`
  )
    .bind(suggestionId)
    .first<any>();

  if (!row) return { ok: false, error: "پیشنهاد یافت نشد" };
  if (row.status === "approved") return { ok: false, error: "این پیشنهاد قبلاً تأیید شده است" };
  if (row.status === "rejected") return { ok: false, error: "این پیشنهاد قبلاً رد شده است" };

  const finalTitle = (input.title || row.title || "").trim();
  const finalDescription =
    input.description !== undefined ? input.description : row.description;
  const finalCategoryId =
    input.category_id !== undefined ? input.category_id : row.category_id;

  let attributes: any = {};
  try {
    if (row.attributes_json) attributes = JSON.parse(row.attributes_json);
  } catch {}
  if (input.brand) attributes.brand = input.brand.trim();

  const attributesJson = JSON.stringify({
    schema_version: "1.1",
    attributes: {
      brand: attributes.brand || null,
      model: attributes.model || null,
      condition: "new",
      origin_country: null,
      warranty: null,
      expiry_date: null,
    },
    specs: [],
    tags: [],
    meta: {
      suggested_by_user: true,
      ai_verified: true,
      from_review_queue_id: suggestionId,
    },
  });

  const productResult = await env.DB.prepare(
    `INSERT INTO products 
     (category_id, title, description, brand, attributes_json, status, created_by, approved_by, approved_at)
     VALUES (?, ?, ?, ?, ?, 'active', ?, ?, datetime('now'))`
  )
    .bind(
      finalCategoryId || null,
      finalTitle,
      finalDescription || null,
      attributes.brand || null,
      attributesJson,
      row.submitted_by,
      adminId
    )
    .run();

  const productId = productResult.meta.last_row_id as number;

  await env.DB.prepare(
    `UPDATE product_review_queue 
     SET status = 'approved', admin_id = ?, admin_note = ?, reviewed_at = datetime('now')
     WHERE id = ?`
  )
    .bind(adminId, input.admin_note || "تأیید شد", suggestionId)
    .run();

  await env.DB.prepare(
    `INSERT INTO notifications (user_id, channel, title, body, status)
     VALUES (?, 'in_app', ?, ?, 'pending')`
  )
    .bind(
      row.submitted_by,
      "کالای پیشنهادی شما تأیید شد",
      `کالای «${finalTitle}» به کاتالوگ اضافه شد و اکنون قابل استفاده است.`
    )
    .run();

  await env.DB.prepare(
    `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, meta_json)
     VALUES (?, 'product_approved', 'product_review_queue', ?, ?)`
  )
    .bind(
      adminId,
      suggestionId,
      JSON.stringify({ product_id: productId, title: finalTitle })
    )
    .run();

  // همگام‌سازی با کاتالوگ مشترک
  try {
    await upsertSharedProduct(env, {
      title: finalTitle,
      brand: attributes.brand || null,
      model: attributes.model || null,
      category_id: finalCategoryId || null,
      description: finalDescription || null,
      attributes_json: attributesJson,
      status: "active",
      source: "market",
      market_product_id: productId,
      created_by_system: "market",
    });
  } catch (e) {
    console.error("[Product] shared product sync failed:", e);
  }

  return { ok: true, productId };
}

export async function rejectSuggestion(
  env: Env,
  adminId: number,
  suggestionId: number,
  adminNote: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!adminNote || adminNote.trim().length < 3) {
    return { ok: false, error: "دلیل رد باید حداقل ۳ حرف باشد" };
  }

  const row = await env.DB.prepare(
    `SELECT id, status, submitted_by, title FROM product_review_queue WHERE id = ?`
  )
    .bind(suggestionId)
    .first<any>();

  if (!row) return { ok: false, error: "پیشنهاد یافت نشد" };
  if (row.status === "approved" || row.status === "rejected") {
    return { ok: false, error: "این پیشنهاد قبلاً بررسی شده است" };
  }

  await env.DB.prepare(
    `UPDATE product_review_queue 
     SET status = 'rejected', admin_id = ?, admin_note = ?, reviewed_at = datetime('now')
     WHERE id = ?`
  )
    .bind(adminId, adminNote.trim(), suggestionId)
    .run();

  await env.DB.prepare(
    `INSERT INTO notifications (user_id, channel, title, body, status)
     VALUES (?, 'in_app', ?, ?, 'pending')`
  )
    .bind(
      row.submitted_by,
      "پیشنهاد کالای شما رد شد",
      `کالای «${row.title}» رد شد. دلیل: ${adminNote.trim()}`
    )
    .run();

  await env.DB.prepare(
    `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, meta_json)
     VALUES (?, 'product_rejected', 'product_review_queue', ?, ?)`
  )
    .bind(adminId, suggestionId, JSON.stringify({ reason: adminNote.trim() }))
    .run();

  return { ok: true };
}

export async function requestEditSuggestion(
  env: Env,
  adminId: number,
  suggestionId: number,
  adminNote: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!adminNote || adminNote.trim().length < 3) {
    return { ok: false, error: "توضیح نیاز به ویرایش باید حداقل ۳ حرف باشد" };
  }

  const row = await env.DB.prepare(
    `SELECT id, status, submitted_by, title FROM product_review_queue WHERE id = ?`
  )
    .bind(suggestionId)
    .first<any>();

  if (!row) return { ok: false, error: "پیشنهاد یافت نشد" };
  if (row.status === "approved" || row.status === "rejected") {
    return { ok: false, error: "این پیشنهاد قبلاً بررسی شده است" };
  }

  await env.DB.prepare(
    `UPDATE product_review_queue 
     SET status = 'needs_edit', admin_id = ?, admin_note = ?, reviewed_at = datetime('now')
     WHERE id = ?`
  )
    .bind(adminId, adminNote.trim(), suggestionId)
    .run();

  await env.DB.prepare(
    `INSERT INTO notifications (user_id, channel, title, body, status)
     VALUES (?, 'in_app', ?, ?, 'pending')`
  )
    .bind(
      row.submitted_by,
      "پیشنهاد کالا نیاز به اصلاح دارد",
      `کالای «${row.title}» نیاز به اصلاح دارد. توضیح: ${adminNote.trim()}`
    )
    .run();

  return { ok: true };
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending_ai: "در حال بررسی اولیه",
    pending_admin: "در انتظار تأیید نهایی",
    needs_edit: "نیاز به ویرایش",
    approved: "تأیید شده",
    rejected: "رد شده",
  };
  return map[status] || status;
}
