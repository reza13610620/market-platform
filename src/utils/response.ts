/**
 * Standard API response helpers
 */

export function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}

export function error(message: string, status = 400, extra?: Record<string, unknown>): Response {
  return json({ error: message, ...extra }, status);
}

export function unauthorized(message = "Unauthorized"): Response {
  return error(message, 401);
}

export function forbidden(message = "Forbidden"): Response {
  return error(message, 403);
}

export function notFound(message = "Not Found"): Response {
  return error(message, 404);
}
