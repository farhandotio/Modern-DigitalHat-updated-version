import express from "express";
import * as controller from "../controllers/product.controllers.js";
import * as validators from "../middlewares/productValidator.middleware.js";
import * as middleware from "../middlewares/auth.middleware.js";
import multer from "multer";

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

router.post(
  "/",
  middleware.requireAuth,
  middleware.isAdmin,
  upload.array("images", 5),
  validators.createProductValidations,
  controller.create
);

router.patch(
  "/:id",
  middleware.requireAuth,
  middleware.isAdmin,
  upload.array("images", 5),
  validators.updateProductValidations,
  controller.update
);

router.get("/:id", controller.fetchById);

router.delete(
  "/:id",
  middleware.requireAuth,
  middleware.isAdmin,
  controller.deleteOne
);

// Fetch all with filter
router.get("/", controller.fetchAll);

export default router;
