import { Router } from "express";

import { loginController, signUpController } from "../controllers/auth.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import { loginBody, signUpBody } from "../schemas/auth.schema.js";

const router = Router();

router.post("/signup", validate({ body: signUpBody }), signUpController);
router.post("/login", validate({ body: loginBody }), loginController);

export default router;
