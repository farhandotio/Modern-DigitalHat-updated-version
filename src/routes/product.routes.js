import express from "express";
import * as controller from "../controllers/product.controllers.js";
import * as validators from "../middlewares/authValidator.middleware.js";
import * as middleware from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/", middleware.verifyToken, middleware.isAdmin, controller.create);

export default router;
