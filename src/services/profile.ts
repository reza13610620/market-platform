/**
 * Profile service - get and update current user profile
 */

export interface Env {
  DB: D1Database;
}

export interface MeResponse {
  id: number;
  phone: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  is_buyer: boolean;
  is_seller: boolean;
  status: string;
  created_at: string;
  profile: {
    city_name: string | null;
    bio: string | null;
    avatar_url: string | null;
    reputation_score: number;
    badges: string[];
    notification_prefs: Record<string, boolean>;
  };
  wallet: {
    balance: number;
    locked_balance: number;
  };
  subscription: {
    plan_code: string;
    plan_title: string;
    ends_at: string;
    is_active: boolean;
  } | null;
}

export async function getMe(env: Env, userId: number): Promise<MeResponse | null> {
  const user = await env.DB.prepare(
    `SELECT id, phone, first_name, last_name, username, is_buyer, is_seller, status, created_at
     FROM users WHERE id = ?`
  ).bind(userId).first<{
    id: number;
    phone: string;
    first_name: string | null;
    last_name: string | null;
    username: string | null;
    is_buyer: number;
    is_seller: number;
    status: string;
    created_at: string;
  }>();

  if (!user) return null;

  const profile = await env.DB.prepare(
    `SELECT city_name, bio, avatar_url, reputation_score, badges_json, notification_prefs
     FROM user_profiles WHERE user_id = ?`
  ).bind(userId).first<{
    city_name: string | null;
    bio: string | null;
    avatar_url: string | null;
    reputation_score: number;
    badges_json: string | null;
    notification_prefs: string | null;
  }>();

  const wallet = await env.DB.prepare(
    `SELECT balance, locked_balance FROM user_wallets WHERE user_id = ?`
  ).bind(userId).first<{ balance: number; locked_balance: number }>();

  const sub = await env.DB.prepare(
    `SELECT us.ends_at, us.is_active, sp.code as plan_code, sp.title as plan_title
     FROM user_subscriptions us
     JOIN subscription_plans sp ON sp.id = us.plan_id
     WHERE us.user_id = ? AND us.is_active = 1
     ORDER BY us.ends_at DESC LIMIT 1`
  ).bind(userId).first<{
    ends_at: string;
    is_active: number;
    plan_code: string;
    plan_title: string;
  }>();

  let badges: string[] = [];
  try {
    badges = profile?.badges_json ? JSON.parse(profile.badges_json) : [];
  } catch {
    badges = [];
  }

  let notificationPrefs: Record<string, boolean> = {
    sms: true,
    telegram: true,
    in_app: true
  };
  try {
    if (profile?.notification_prefs) {
      notificationPrefs = JSON.parse(profile.notification_prefs);
    }
  } catch {
    // keep default
  }

  return {
    id: user.id,
    phone: user.phone,
    first_name: user.first_name,
    last_name: user.last_name,
    username: user.username,
    is_buyer: !!user.is_buyer,
    is_seller: !!user.is_seller,
    status: user.status,
    created_at: user.created_at,
    profile: {
      city_name: profile?.city_name ?? null,
      bio: profile?.bio ?? null,
      avatar_url: profile?.avatar_url ?? null,
      reputation_score: profile?.reputation_score ?? 80,
      badges,
      notification_prefs: notificationPrefs
    },
    wallet: {
      balance: wallet?.balance ?? 0,
      locked_balance: wallet?.locked_balance ?? 0
    },
    subscription: sub
      ? {
          plan_code: sub.plan_code,
          plan_title: sub.plan_title,
          ends_at: sub.ends_at,
          is_active: !!sub.is_active
        }
      : null
  };
}

export interface UpdateProfileInput {
  first_name?: string;
  last_name?: string;
  city_name?: string;
  bio?: string;
  avatar_url?: string;
  is_seller?: boolean;
  notification_prefs?: Record<string, boolean>;
}

export async function updateMe(
  env: Env,
  userId: number,
  data: UpdateProfileInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  // Update users table
  const userUpdates: string[] = [];
  const userValues: any[] = [];

  if (data.first_name !== undefined) {
    userUpdates.push("first_name = ?");
    userValues.push(data.first_name?.trim() || null);
  }
  if (data.last_name !== undefined) {
    userUpdates.push("last_name = ?");
    userValues.push(data.last_name?.trim() || null);
  }
  if (data.is_seller !== undefined) {
    userUpdates.push("is_seller = ?");
    userValues.push(data.is_seller ? 1 : 0);
  }

  if (userUpdates.length > 0) {
    userUpdates.push("updated_at = datetime('now')");
    userValues.push(userId);
    await env.DB.prepare(
      `UPDATE users SET ${userUpdates.join(", ")} WHERE id = ?`
    ).bind(...userValues).run();
  }

  // Update user_profiles table
  const profileUpdates: string[] = [];
  const profileValues: any[] = [];

  if (data.city_name !== undefined) {
    profileUpdates.push("city_name = ?");
    profileValues.push(data.city_name?.trim() || null);
  }
  if (data.bio !== undefined) {
    profileUpdates.push("bio = ?");
    profileValues.push(data.bio?.trim() || null);
  }
  if (data.avatar_url !== undefined) {
    profileUpdates.push("avatar_url = ?");
    profileValues.push(data.avatar_url?.trim() || null);
  }
  if (data.notification_prefs !== undefined) {
    profileUpdates.push("notification_prefs = ?");
    profileValues.push(JSON.stringify(data.notification_prefs));
  }

  if (profileUpdates.length > 0) {
    profileUpdates.push("updated_at = datetime('now')");
    profileValues.push(userId);
    await env.DB.prepare(
      `UPDATE user_profiles SET ${profileUpdates.join(", ")} WHERE user_id = ?`
    ).bind(...profileValues).run();
  }

  return { ok: true };
}
