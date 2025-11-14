import express from "express";
import * as controller from "../controllers/cart.controllers.js";
import * as validators from "../middlewares/cartValidator.middleware.js";
import * as middleware from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/", middleware.optionalAuth, controller.getCart);
router.post(
  "/add",
  middleware.optionalAuth,
  validators.validateAddToCart,
  controller.addToCart
);
router.patch(
  "/update",
  middleware.optionalAuth,
  validators.validateUpdateCart,
  controller.updateCartItem
);
router.delete(
  "/remove/:productId",
  middleware.optionalAuth,
  validators.validateRemoveFromCart,
  controller.removeFromCart
);
router.delete(
  "/clear",
  middleware.optionalAuth,
  validators.validateClearCart,
  controller.clearCart
);
router.post(
  "/merge",
  middleware.requireAuth,
  validators.validateMergeCart,
  controller.mergeCart
);
router.get(
  "/count",
  middleware.optionalAuth,
  validators.validateCartCount,
  controller.getCartCount
);

export default router;
