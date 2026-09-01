/**
 * Request augmentation. `authenticate` (src/middleware/authenticate.middleware.ts)
 * sets `req.auth` after resolving a session token; `currentUserId(req)`
 * reads it.
 */
declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        sessionId: string;
      };
    }
  }
}

export {};
