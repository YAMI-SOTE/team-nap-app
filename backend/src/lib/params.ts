import type { Request } from "express";

/**
 * Read a single route param. Express types params as
 * `string | string[]`; this collapses the array case (repeated params)
 * to the first value. Replaces the copy-pasted
 * `Array.isArray(x) ? x[0] : x` in the controllers.
 */
export function firstParam(req: Request, name: string): string {
  const value = req.params[name];
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}
