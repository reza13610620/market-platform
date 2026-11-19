import { requireAuth } from "../middleware/auth";
import {
  listPlans,
  getMySubscription,
  upgradePlan,
  type Env,
} from "../services/subscription";
import { json, error } from "../utils/response";

export async function handleSubscriptionRoutes(
  request: Request,
  env: Env,
  path: string
): Promise<Response | null> {
  if (!path.startsWith("/api/plans") && !path.startsWith("/api/subscription")) {
    return null;
  }

  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;
  const { userId } = auth;

  if (path === "/api/plans" && request.method === "GET") {
    const plans = await listPlans(env);
    return json({ success: true, data: plans });
  }

  if (path === "/api/subscription/me" && request.method === "GET") {
    const sub = await getMySubscription(env, userId);
    return json({ success: true, data: sub });
  }

  if (path === "/api/subscription/upgrade" && request.method === "POST") {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return error("بدنه درخواست نامعتبر است");
    }

    if (!body.plan_code) {
      return error("کد پلن الزامی است");
    }

    const result = await upgradePlan(env, userId, body.plan_code);
    if (!result.ok) return error(result.error);

    return json({ success: true, message: result.message });
  }

  return null;
}
