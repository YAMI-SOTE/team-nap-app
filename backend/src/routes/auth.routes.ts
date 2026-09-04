import { Router } from "express";

import { env } from "../config/env.js";
import {
  changePasswordController,
  confirmPasswordResetController,
  debugController,
  deleteAccountController,
  googleAuthController,
  googleLinkController,
  listSessionsController,
  loginController,
  logoutController,
  logoutOthersController,
  meController,
  requestPasswordResetController,
  revokeSessionController,
  signUpController,
  updateProfileController,
} from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/authenticate.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  changePasswordBody,
  googleAuthBody,
  loginBody,
  passwordResetConfirmBody,
  passwordResetRequestBody,
  sessionIdParams,
  signUpBody,
  updateProfileBody,
} from "../schemas/auth.schema.js";

const router = Router();

// Public.
router.post("/signup", validate({ body: signUpBody }), signUpController);
router.post("/login", validate({ body: loginBody }), loginController);
router.post(
  "/google",
  validate({ body: googleAuthBody }),
  googleAuthController,
);
router.post(
  "/password-reset/request",
  validate({ body: passwordResetRequestBody }),
  requestPasswordResetController,
);
router.post(
  "/password-reset/confirm",
  validate({ body: passwordResetConfirmBody }),
  confirmPasswordResetController,
);

// Session-scoped.
router.post(
  "/google/link",
  authenticate,
  validate({ body: googleAuthBody }),
  googleLinkController,
);
router.get("/me", authenticate, meController);
router.patch(
  "/me",
  authenticate,
  validate({ body: updateProfileBody }),
  updateProfileController,
);
router.delete("/me", authenticate, deleteAccountController);
router.post(
  "/password",
  authenticate,
  validate({ body: changePasswordBody }),
  changePasswordController,
);
router.post("/logout", authenticate, logoutController);
router.post("/logout-others", authenticate, logoutOthersController);
router.get("/sessions", authenticate, listSessionsController);
router.delete(
  "/sessions/:id",
  authenticate,
  validate({ params: sessionIdParams }),
  revokeSessionController,
);

// Dev-only: inspect the stored password hash + session count.
if (env.NODE_ENV !== "production") {
  router.get("/debug", authenticate, debugController);
}

export default router;
