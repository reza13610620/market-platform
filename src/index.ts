/**
 * Market Platform - Cloudflare Worker Entry Point
 * Phase 1 Foundation + Auth + JWT + Profile
 */

import { handleAuthRoutes } from "./routes/auth";
import { handleProfileRoutes } from "./routes/profile";
import { json, error } from "./utils/response";

export interface Env {
  DB: D1Database;
  SMS_API_KEY?: string;
  JWT_SECRET?: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization"
        }
      });
    }

    // Health check
    if (path === "/" || path === "/health") {
      return json({
        status: "ok",
        service: "market-platform",
        version: "0.1.1",
        timestamp: new Date().toISOString()
      });
    }

    // Auth routes
    if (path.startsWith("/api/auth")) {
      const res = await handleAuthRoutes(request, env, path);
      if (res) {
        const headers = new Headers(res.headers);
        headers.set("Access-Control-Allow-Origin", "*");
        return new Response(res.body, { status: res.status, headers });
      }
    }

    // Profile routes (/api/me)
    if (path === "/api/me") {
      const res = await handleProfileRoutes(request, env, path);
      if (res) {
        const headers = new Headers(res.headers);
        headers.set("Access-Control-Allow-Origin", "*");
        return new Response(res.body, { status: res.status, headers });
      }
    }

    // Other API routes (under construction)
    if (path.startsWith("/api/")) {
      return error("این بخش هنوز پیاده‌سازی نشده", 501);
    }

    return error("Not Found", 404);
  }
};
