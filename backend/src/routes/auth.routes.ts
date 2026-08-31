import { Router } from "express";

import {
  listSessionsController,
  loginController,
  logoutController,
  logoutOthersController,
  meController,
  revokeSessionController,
  signUpController,
} from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/authenticate.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { loginBody, sessionIdParams, signUpBody } from "../schemas/auth.schema.js";

const router = Router();

// Public.
router.post("/signup", validate({ body: signUpBody }), signUpController);
router.post("/login", validate({ body: loginBody }), loginController);

// Session-scoped.
router.get("/me", authenticate, meController);
router.post("/logout", authenticate, logoutController);
router.post("/logout-others", authenticate, logoutOthersController);
router.get("/sessions", authenticate, listSessionsController);
router.delete(
  "/sessions/:id",
  authenticate,
  validate({ params: sessionIdParams }),
  revokeSessionController,
);

export default router;
