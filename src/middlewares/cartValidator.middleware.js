// middlewares/cartValidator.middleware.js
import { body, param, validationResult } from "express-validator";

// -------------------- HANDLE VALIDATION ERRORS -------------------- //
const responseWithValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }
  next();
};

// -------------------- VALIDATORS -------------------- //

// POST /cart/add
const validateAddToCart = [
  body("productId").exists().withMessage("productId is required").isMongoId().withMessage("invalid productId"),
  body("qty").optional().isInt({ min: 1 }).withMessage("qty must be a positive integer"),
  responseWithValidationErrors,
];

// PATCH /cart/update
const validateUpdateCart = [
  body("productId").exists().withMessage("productId is required").isMongoId().withMessage("invalid productId"),
  body("qty").exists().withMessage("qty is required").isInt({ min: 1 }).withMessage("qty must be a positive integer"),
  responseWithValidationErrors,
];

// DELETE /cart/remove/:productId
const validateRemoveFromCart = [
  param("productId").exists().withMessage("productId param is required").isMongoId().withMessage("invalid productId"),
  responseWithValidationErrors,
];

// DELETE /cart/clear  -> no body validation needed (kept for symmetry)
const validateClearCart = [responseWithValidationErrors];

// POST /cart/merge (called at login) - accept optional anonId (string UUID)
const validateMergeCart = [
  body("anonId").optional().isString().withMessage("anonId must be a string"),
  responseWithValidationErrors,
];

// POST /checkout (login required) - minimal required fields
const validateCheckout = [
  // require basic shipping/contact info
  body("shipping.name").exists().withMessage("shipping.name is required"),
  body("shipping.phone").exists().withMessage("shipping.phone is required"),
  body("shipping.address").exists().withMessage("shipping.address is required"),
  // payment method should be 'COD' per your decision, but still validate if provided
  body("paymentMethod").optional().isIn(["COD"]).withMessage("paymentMethod must be 'COD'"),
  responseWithValidationErrors,
];

// GET /cart/count - no validation needed
const validateCartCount = [responseWithValidationErrors];

export {
  validateAddToCart,
  validateUpdateCart,
  validateRemoveFromCart,
  validateClearCart,
  validateMergeCart,
  validateCheckout,
  validateCartCount,
};
