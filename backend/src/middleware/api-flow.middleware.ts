import type { RequestHandler } from "express";

import {
  addStep,
  createContext,
  flowEnabledFor,
  preview,
  render,
  runWithContext,
} from "../lib/api-flow.js";

/**
 * Opens an API-flow trace context for the request (see `lib/api-flow.ts`)
 * and prints the collected steps on `res` "finish". Inert unless
 * `DEBUG_API_FLOW` is set. Mount it right after `express.json()` so
 * `req.body` is populated, and before the feature routers so the whole
 * chain runs inside the context.
 */
export const apiFlowLogger: RequestHandler = (req, res, next) => {
  if (!flowEnabledFor(req.originalUrl)) {
    next();
    return;
  }

  const ctx = createContext(req.method, req.originalUrl);

  // `req.route` / `req.baseUrl` are only correct while the stack is still
  // inside the matched handler — by the time "finish" fires they have been
  // unwound. Snapshot the route pattern on the first `res.end()` call.
  let matchedRoute = "(unmatched)";
  const originalEnd = res.end.bind(res);
  res.end = ((...args: Parameters<typeof originalEnd>) => {
    if (matchedRoute === "(unmatched)" && req.route?.path != null) {
      matchedRoute = `${req.method} ${req.baseUrl}${req.route.path}`;
    }
    return originalEnd(...args);
  }) as typeof res.end;

  runWithContext(ctx, () => {
    const hasBody = req.body && Object.keys(req.body).length > 0;
    const hasQuery = req.query && Object.keys(req.query).length > 0;
    addStep(ctx, "http", "request in", {
      ...(hasBody ? { body: preview(req.body) } : {}),
      ...(hasQuery ? { query: preview(req.query) } : {}),
    });

    res.on("finish", () => {
      addStep(ctx, "http", "response out", { status: res.statusCode });
      console.log(render(ctx, res.statusCode, matchedRoute));
    });

    next();
  });
};
