// src/middlewares/orderValidator.middleware.js
import { body, param, validationResult } from "express-validator";

// -------------------- HANDLE VALIDATION ERRORS -------------------- //
const responseWithValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map((err) => ({
        field: err.param || err.path,
        message: err.msg,
      })),
    });
  }
  next();
};


// Create order (manual items + addresses)
const createOrderValidation = [
  body("items")
    .isArray({ min: 1 })
    .withMessage("Items must be an array with at least one item"),
  body("items.*.product")
    .notEmpty()
    .withMessage("Each item must have a product ID"),
  body("items.*.quantity")
    .isInt({ min: 1 })
    .withMessage("Quantity must be at least 1"),
  body("items.*.price.amount")
    .isFloat({ gt: 0 })
    .withMessage("Price amount must be greater than 0"),
  body("items.*.price.currency")
    .isIn(["USD", "BDT"])
    .withMessage("Currency must be USD or BDT"),
  body("shippingAddresses")
    .isArray({ min: 1 })
    .withMessage("At least one shipping address is required"),
  body("shippingAddresses.*.phone")
    .notEmpty()
    .withMessage("Phone number is required"),
  body("shippingAddresses.*.street")
    .notEmpty()
    .withMessage("Street is required"),
  body("shippingAddresses.*.city")
    .notEmpty()
    .withMessage("City is required"),
  body("shippingAddresses.*.state")
    .notEmpty()
    .withMessage("State is required"),
  body("shippingAddresses.*.zip")
    .notEmpty()
    .withMessage("Zip code is required"),
  body("shippingAddresses.*.country")
    .notEmpty()
    .withMessage("Country is required"),
  responseWithValidationErrors,
];

// Checkout validation (POST disabled now)
// This middleware is optional and can remain for reference
const checkoutValidation = [
  body().custom(() => {
    throw new Error(
      "POST /checkout is disabled. Use GET /checkout to fetch cart + addresses and POST /orders to create an order."
    );
  }),
  responseWithValidationErrors,
];

// Get / Update / Delete order by ID
const orderIdValidation = [
  param("id").isMongoId().withMessage("Invalid order ID"),
  responseWithValidationErrors,
];

// Update order status
const updateOrderStatusValidation = [
  param("id").isMongoId().withMessage("Invalid order ID"),
  body("status")
    .isIn(["PENDING", "CONFIRMED", "CANCELLED", "SHIPPED", "DELIVERED"])
    .withMessage(
      "Status must be one of PENDING, CONFIRMED, CANCELLED, SHIPPED, DELIVERED"
    ),
  responseWithValidationErrors,
];

export {
  createOrderValidation,
  checkoutValidation,
  orderIdValidation,
  updateOrderStatusValidation,
};
