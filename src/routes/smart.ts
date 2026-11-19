/**
 * Smart assistant routes – VIP only
 * GET /api/smart/suggestions
 */

import { requireAuth } from "../middleware/auth";
import { getSmartSuggestions, type Env } from "../services/smart";
import { json, error } from "../utils/response";

export async function handleSmartRoutes(
  request: Request,
  env: Env,
  path: string
): Promise<Response | null> {
  if (path === "/api/smart/suggestions" && request.method === "GET") {
    const auth = await requireAuth(request, env);
    if (auth instanceof Response) return auth;

    const result = await getSmartSuggestions(env, auth.userId);
    if (!result.ok) {
      return error(result.error, result.code === "VIP_ONLY" ? 403 : 400, {
        code: result.code,
      });
    }

    return json({ success: true, data: result.data });
  }

  return null;
}
