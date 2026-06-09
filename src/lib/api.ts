// Consistent JSON responses + uniform error handling for route handlers.
//
// Every protected/mutating route should wrap its logic in `withErrorHandling`
// so an unexpected throw becomes a structured 500 instead of leaking a stack.

import { NextResponse } from "next/server";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function badRequest(error: string, issues?: unknown) {
  return NextResponse.json({ error, issues }, { status: 400 });
}

export function unauthorized(error = "Not authenticated") {
  return NextResponse.json({ error }, { status: 401 });
}

export function forbidden(error = "Not allowed") {
  return NextResponse.json({ error }, { status: 403 });
}

export function notFound(error = "Not found") {
  return NextResponse.json({ error }, { status: 404 });
}

export function serverError(error = "Something went wrong") {
  return NextResponse.json({ error }, { status: 500 });
}

type Handler = (req: Request) => Promise<Response> | Response;

/**
 * Wrap a route handler so any thrown error becomes a 500 with a structured body.
 * Validation and auth should still be handled explicitly with badRequest/unauthorized.
 */
export function withErrorHandling(handler: Handler): Handler {
  return async (req: Request) => {
    try {
      return await handler(req);
    } catch (err) {
      console.error("[api] unhandled error:", err);
      return serverError();
    }
  };
}
