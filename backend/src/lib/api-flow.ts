import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

import { env } from "../config/env.js";

/**
 * Per-request API-flow tracer.
 *
 * When `DEBUG_API_FLOW` is on, `apiFlowLogger` (middleware) opens a
 * context for each request and stores it in an `AsyncLocalStorage`, so
 * any code running during that request can call `step()` / `traced()` to
 * append to the trace without threading a logger through every call.
 * On `res` "finish" the collected steps are printed as one block.
 *
 * Everything here is a no-op when there is no active context, so the
 * helpers are safe to leave in place with tracing disabled.
 */

export type FlowLayer =
  | "http" // request in / response out
  | "auth" // authenticate middleware — session resolved
  | "validate" // zod route guard
  | "controller" // manual: handler entry
  | "service" // manual: domain logic
  | "db" // Prisma query (automatic, see lib/prisma.ts)
  | "error"; // error handler

export type FlowStep = {
  layer: FlowLayer;
  label: string;
  /** ms from when the request entered the tracer to when this step started */
  at: number;
  /** ms the step itself took, when measured via `traced()` / the Prisma hook */
  ms?: number;
  meta?: Record<string, unknown>;
};

export type FlowContext = {
  id: string;
  method: string;
  url: string;
  startedAt: number;
  steps: FlowStep[];
};

const storage = new AsyncLocalStorage<FlowContext>();

/** True when API-flow tracing is enabled for this URL. */
export function flowEnabledFor(url: string): boolean {
  if (!env.DEBUG_API_FLOW) return false;
  const scope = env.DEBUG_API_FLOW_SCOPE;
  return !scope || url.includes(scope);
}

export function createContext(method: string, url: string): FlowContext {
  return {
    id: randomUUID().slice(0, 8),
    method,
    url,
    startedAt: Date.now(),
    steps: [],
  };
}

export function runWithContext<T>(ctx: FlowContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

/** Append a step to a specific context (used by the middleware itself). */
export function addStep(
  ctx: FlowContext,
  layer: FlowLayer,
  label: string,
  meta?: Record<string, unknown>,
): void {
  ctx.steps.push({ layer, label, at: Date.now() - ctx.startedAt, meta });
}

/**
 * Record one step in the current request's trace. No-op when tracing is
 * off or there is no active request, so it is safe to call unconditionally
 * from controllers and services.
 */
export function step(
  layer: FlowLayer,
  label: string,
  meta?: Record<string, unknown>,
): void {
  const ctx = storage.getStore();
  if (ctx) addStep(ctx, layer, label, meta);
}

/** Run `fn`, timing it, and record the result as a step with an `ms` value. */
export async function traced<T>(
  layer: FlowLayer,
  label: string,
  fn: () => Promise<T>,
  meta?: Record<string, unknown>,
): Promise<T> {
  const ctx = storage.getStore();
  if (!ctx) return fn();
  const start = Date.now();
  const at = start - ctx.startedAt;
  try {
    return await fn();
  } finally {
    ctx.steps.push({ layer, label, at, ms: Date.now() - start, meta });
  }
}

/** Compact, length-capped JSON for step metadata. */
export function preview(value: unknown, max = 200): string {
  let s: string;
  try {
    s = JSON.stringify(value);
  } catch {
    s = String(value);
  }
  if (s === undefined) return String(value);
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

function fmtMeta(meta?: Record<string, unknown>): string {
  if (!meta) return "";
  const parts = Object.entries(meta)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => {
      const raw = typeof v === "string" ? v : preview(v);
      return `${k}=${raw.replace(/\s+/g, " ").trim()}`;
    });
  return parts.length ? `  ${parts.join(" ")}` : "";
}

/** Render the collected trace as one multi-line block. */
export function render(
  ctx: FlowContext,
  status: number,
  matchedRoute: string,
): string {
  const total = Date.now() - ctx.startedAt;
  const lines = [`API-flow ${ctx.id}  ${ctx.method} ${ctx.url}`];
  for (const s of ctx.steps) {
    const at = `+${s.at}ms`.padEnd(7);
    const took = s.ms !== undefined ? ` (${s.ms}ms)` : "";
    lines.push(
      `  ${at} [${s.layer}] ${s.label}${took}${fmtMeta(s.meta)}`,
    );
  }
  lines.push(
    `API-flow ${ctx.id}  ${status} in ${total}ms  route=${matchedRoute}  steps=${ctx.steps.length}`,
  );
  return lines.join("\n");
}
