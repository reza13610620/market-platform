/**
 * Market Platform - Cloudflare Worker Entry Point
 */

import { handleAuthRoutes } from "./routes/auth";
import { handleProfileRoutes } from "./routes/profile";
import { handleWalletRoutes } from "./routes/wallet";
import { handleRequestRoutes } from "./routes/request";
import { handleOfferRoutes } from "./routes/offer";
import { handleContactRoutes } from "./routes/contact";
import { handleSupplyRoutes } from "./routes/supply";
import { handleProductRoutes } from "./routes/product";
import { handleTicketRoutes } from "./routes/ticket";
import { handleNotificationRoutes } from "./routes/notification";
import { handleSubscriptionRoutes } from "./routes/subscription";
import { handleReviewRoutes } from "./routes/review";
import { handleSmartRoutes } from "./routes/smart";
import { json, error } from "./utils/response";
import { securityHeaders, getClientIp, checkRateLimit } from "./utils/security";

export interface Env {
  DB: D1Database;
  SMS_API_KEY?: string;
  JWT_SECRET?: string;
}

function withSecurityHeaders(res: Response): Response {
  const headers = new Headers(res.headers);
  const sec = securityHeaders();
  for (const [k, v] of Object.entries(sec)) {
    headers.set(k, v as string);
  }
  if (!headers.has("Access-Control-Allow-Origin")) {
    headers.set("Access-Control-Allow-Origin", "*");
  }
  return new Response(res.body, { status: res.status, headers });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const ip = getClientIp(request);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          ...securityHeaders()
        }
      });
    }

    const globalLimit = checkRateLimit(`global:${ip}`, 300, 60);
    if (!globalLimit.allowed) {
      return withSecurityHeaders(
        error("تعداد درخواست‌ها بیش از حد مجاز است. کمی صبر کنید.", 429)
      );
    }

    if (path === "/" || path === "/health") {
      return withSecurityHeaders(json({
        status: "ok",
        service: "market-platform",
        version: "0.5.0",
        timestamp: new Date().toISOString()
      }));
    }

    if (path.startsWith("/api/auth")) {
      const authLimit = checkRateLimit(`auth:${ip}`, 20, 60);
      if (!authLimit.allowed) {
        return withSecurityHeaders(
          error("تعداد تلاش‌ها زیاد است. لطفاً کمی صبر کنید.", 429)
        );
      }
      const res = await handleAuthRoutes(request, env, path);
      if (res) return withSecurityHeaders(res);
    }

    if (path === "/api/me") {
      const res = await handleProfileRoutes(request, env, path);
      if (res) return withSecurityHeaders(res);
    }

    if (
      path === "/api/me/reviews" ||
      path === "/api/me/orders" ||
      path.match(/^\/api\/users\/\d+\/reviews$/) ||
      path.match(/^\/api\/orders\/\d+\/review$/) ||
      path.match(/^\/api\/orders\/\d+\/complete$/)
    ) {
      const res = await handleReviewRoutes(request, env, path);
      if (res) return withSecurityHeaders(res);
    }

    if (path.startsWith("/api/smart")) {
      const res = await handleSmartRoutes(request, env, path);
      if (res) return withSecurityHeaders(res);
    }

    if (path.startsWith("/api/wallet")) {
      const res = await handleWalletRoutes(request, env, path);
      if (res) return withSecurityHeaders(res);
    }

    if (path.startsWith("/api/supply")) {
      const res = await handleSupplyRoutes(request, env, path);
      if (res) return withSecurityHeaders(res);
    }

    if (path.startsWith("/api/products") || path.startsWith("/api/admin/products")) {
      const res = await handleProductRoutes(request, env, path);
      if (res) return withSecurityHeaders(res);
    }

    if (path.startsWith("/api/tickets")) {
      const res = await handleTicketRoutes(request, env, path);
      if (res) return withSecurityHeaders(res);
    }

    if (path.startsWith("/api/notifications")) {
      const res = await handleNotificationRoutes(request, env, path);
      if (res) return withSecurityHeaders(res);
    }

    if (path.startsWith("/api/plans") || path.startsWith("/api/subscription")) {
      const res = await handleSubscriptionRoutes(request, env, path);
      if (res) return withSecurityHeaders(res);
    }

    if (path.startsWith("/api/contact") || path.match(/^\/api\/offers\/\d+\/reveal$/)) {
      const revealLimit = checkRateLimit(`reveal:${ip}`, 30, 60);
      if (!revealLimit.allowed) {
        return withSecurityHeaders(
          error("تعداد درخواست مشاهده اطلاعات بیش از حد مجاز است.", 429)
        );
      }
      const res = await handleContactRoutes(request, env, path);
      if (res) return withSecurityHeaders(res);
    }

    if (path.startsWith("/api/requests")) {
      const offerRes = await handleOfferRoutes(request, env, path);
      if (offerRes) return withSecurityHeaders(offerRes);
      const res = await handleRequestRoutes(request, env, path);
      if (res) return withSecurityHeaders(res);
    }

    if (path === "/api/pool" || path === "/api/offers" || path.match(/^\/api\/offers\/\d+\/cancel$/) || path === "/api/penalties/my") {
      const res = await handleOfferRoutes(request, env, path);
      if (res) return withSecurityHeaders(res);
    }

    if (path.startsWith("/api/")) {
      return withSecurityHeaders(error("این بخش هنوز پیاده‌سازی نشده", 501));
    }

    return withSecurityHeaders(error("Not Found", 404));
  }
};
