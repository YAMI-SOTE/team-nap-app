import type { RequestHandler } from "express";
import { z } from "zod";

import { HttpError } from "../lib/http-error.js";

type ValidationSchemas = {
  body?: z.ZodType;
  params?: z.ZodType;
  query?: z.ZodType;
};

/**
 * Route guard: validates `req.body` / `req.params` / `req.query` against
 * the given zod schemas. On failure the request stops with a 400 whose
 * `details` lists the issues. Replaces the hand-rolled
 * `typeof x === "string" ? x : default` checks in the controllers.
 *
 * `body` and `params` are replaced with the parsed (coerced/defaulted)
 * result; `query` is validated only, since Express 5 makes `req.query`
 * read-only.
 */
export function validate(schemas: ValidationSchemas): RequestHandler {
  return (req, _res, next) => {
    try {
      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as typeof req.params;
      }
      if (schemas.query) {
        schemas.query.parse(req.query);
      }
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(
          HttpError.badRequest("Invalid request", z.flattenError(error)),
        );
        return;
      }
      next(error);
    }
  };
}
