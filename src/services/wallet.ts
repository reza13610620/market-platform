/**
 * Wallet service - balance and transactions
 */

export interface Env {
  DB: D1Database;
}

export interface WalletBalance {
  balance: number;
  locked_balance: number;
  available: number; // balance - locked (what user can actually spend)
}

export interface WalletTransaction {
  id: number;
  amount: number;
  type: string;
  description: string | null;
  balance_after: number | null;
  created_at: string;
}

export async function getWalletBalance(env: Env, userId: number): Promise<WalletBalance | null> {
  const row = await env.DB.prepare(
    `SELECT balance, locked_balance FROM user_wallets WHERE user_id = ?`
  ).bind(userId).first<{ balance: number; locked_balance: number }>();

  if (!row) return null;

  return {
    balance: row.balance,
    locked_balance: row.locked_balance,
    available: row.balance - row.locked_balance
  };
}

export async function getWalletTransactions(
  env: Env,
  userId: number,
  limit = 20,
  offset = 0
): Promise<WalletTransaction[]> {
  const rows = await env.DB.prepare(
    `SELECT id, amount, type, description, balance_after, created_at
     FROM wallet_transactions
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`
  ).bind(userId, limit, offset).all<{
    id: number;
    amount: number;
    type: string;
    description: string | null;
    balance_after: number | null;
    created_at: string;
  }>();

  return rows.results || [];
}
