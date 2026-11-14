/**
 * Wallet routes - /api/wallet
 */

import { requireAuth } from "../middleware/auth";
import { getWalletBalance, getWalletTransactions, type Env } from "../services/wallet";
import { json, error } from "../utils/response";

export async function handleWalletRoutes(
  request: Request,
  env: Env,
  path: string
): Promise<Response | null> {
  // Only handle /api/wallet and /api/wallet/transactions
  if (!path.startsWith("/api/wallet")) return null;

  // All wallet routes need authentication
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const { userId } = auth;

  // GET /api/wallet  → موجودی کیف پول
  if (path === "/api/wallet" && request.method === "GET") {
    const wallet = await getWalletBalance(env, userId);
    if (!wallet) return error("کیف پول یافت نشد", 404);

    return json({
      success: true,
      data: {
        balance: wallet.balance,
        locked_balance: wallet.locked_balance,
        available: wallet.available
      }
    });
  }

  // GET /api/wallet/transactions  → تاریخچه تراکنش‌ها
  if (path === "/api/wallet/transactions" && request.method === "GET") {
    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get("limit") || 20), 50);
    const offset = Number(url.searchParams.get("offset") || 0);

    const transactions = await getWalletTransactions(env, userId, limit, offset);

    return json({
      success: true,
      data: {
        transactions,
        limit,
        offset
      }
    });
  }

  return error("Method not allowed", 405);
}
