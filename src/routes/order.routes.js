import express from "express";
import * as validators from "../middlewares/orderValidation.middleware.js";
import * as middleware from "../middlewares/auth.middleware.js";
import * as controllers from "../controllers/order.controllers.js";

const router = express.Router();

router.get("/checkout", middleware.requireAuth, controllers.getCheckout);

router.post(
  "/",
  middleware.requireAuth,
  validators.createOrderValidation,
  controllers.createOrder
);

router.get("/", middleware.requireAuth, controllers.getAllUserOrders);

router.put(
  "/:id/status",
  middleware.requireAuth,
  middleware.isAdmin,
  validators.updateOrderStatusValidation,
  controllers.updateOrderStatus
);

router.delete(
  "/:id",
  middleware.requireAuth,
  validators.orderIdValidation,
  controllers.deleteOrder
);

router.get(
  "/admin/stats",
  middleware.requireAuth,
  middleware.isAdmin,
  controllers.getAdminStats
);

router.get(
  "/admin/all",
  middleware.requireAuth,
  middleware.isAdmin,
  controllers.getAllOrders
);

export default router;
