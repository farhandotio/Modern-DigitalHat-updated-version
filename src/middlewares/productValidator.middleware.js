import { body, validationResult } from "express-validator";

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

// -------------------- CREATE PRODUCT VALIDATION -------------------- //
const createProductValidations = [
  // title
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required.")
    .isLength({ min: 3 })
    .withMessage("Title must be at least 3 characters long."),

  // description
  body("description")
    .optional()
    .isString()
    .withMessage("Description must be a string."),

  // price.amount (nested)
  body("priceAmount")
    .notEmpty()
    .withMessage("Price amount is required.")
    .bail()
    .isFloat({ gt: 0 })
    .withMessage("Price amount must be a number greater than 0."),

  // price.currency (nested)
  body("priceCurrency")
    .optional()
    .isIn(["USD", "BDT"])
    .withMessage("Currency must be either USD or BDT."),

  // offer (percentage)
  body("offer")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Offer must be a number between 0 and 100."),

  // offerDeadline: optional, must be ISO8601 date and if provided must be in the future
  body("offerDeadline")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("Offer deadline must be a valid ISO8601 date.")
    .bail()
    .custom((value) => {
      const date = new Date(value);
      if (isNaN(date.getTime()))
        throw new Error("Offer deadline is not a valid date.");
      if (date <= new Date())
        throw new Error("Offer deadline must be a future date/time.");
      return true;
    }),

  // productType
  body("productType")
    .optional()
    .isIn(["Standard", "BestSeller", "FlashSale"])
    .withMessage(
      "productType must be one of: Standard, BestSeller, FlashSale."
    ),

  // isAffiliate
  body("isAffiliate")
    .optional()
    .isBoolean()
    .withMessage("isAffiliate must be a boolean (true/false).")
    .toBoolean(),

  body("categoryName")
    .notEmpty()
    .withMessage("Category name is required.")
    .bail()
    .isString()
    .trim()
    .withMessage("Category name must be a string."),

  body("categorySlug")
    .optional()
    .notEmpty()
    .withMessage("Category slug is required.")
    .bail()
    .isString()
    .withMessage("Category slug must be a string.")
    .matches(/^[a-z0-9-]+$/)
    .withMessage(
      "Category slug must be lowercase letters, numbers or dashes (e.g. 'bluetooth-tws')."
    ),

  // brand
  body("brand")
    .optional()
    .isString()
    .trim()
    .withMessage("Brand must be a string."),

  // stock & sold
  body("stock")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Stock must be an integer >= 0."),

  body("sold")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Sold must be an integer >= 0."),

  // images
  body("images")
    .optional()
    .isArray()
    .withMessage("Images must be an array of objects."),

  body("images.*.url")
    .optional()
    .isURL()
    .withMessage("Each image must have a valid 'url'."),

  body("images.*.thumbnailUrl")
    .optional()
    .isURL()
    .withMessage("Each image thumbnail must be a valid URL."),

  body("images.*.fileId")
    .optional()
    .isString()
    .withMessage("Each image must have a 'fileId' string."),

  responseWithValidationErrors,
];

export { createProductValidations };
