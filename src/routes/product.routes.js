import express from "express";
import * as controller from "../controllers/product.controllers.js";
import * as validators from "../middlewares/productValidator.middleware.js";
import * as middleware from "../middlewares/auth.middleware.js";
import multer from "multer";

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

router.post(
  "/",
  middleware.verifyToken,
  middleware.isAdmin,
  upload.array("images", 5),
  validators.createProductValidations,
  controller.create
);

export default router;
