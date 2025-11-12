import express from "express";
import * as controller from "../controllers/auth.controllers.js";
import * as validators from "../middlewares/authValidator.middleware.js";
import * as middleware from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post(
  "/register",
  validators.registerUserValidations,
  controller.register
);
router.post("/login", validators.loginUserValidations, controller.login);
router.get("/user/profile", middleware.verifyToken, controller.profile);
router.post("/logout", controller.logout);

// Addresses
router.get("/user/addresses", middleware.verifyToken, controller.getAddresses);
router.post(
  "/user/addresses",
  validators.addAddressValidation,
  middleware.verifyToken,
  controller.addAddress
);
router.delete("/user/addresses/:addressId", middleware.verifyToken, controller.deleteAddress);

export default router;
