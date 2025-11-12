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

// -------------------- REGISTER VALIDATIONS -------------------- //
const registerUserValidations = [
  body("email")
    .notEmpty()
    .withMessage("Email is required.")
    .isEmail()
    .withMessage("Please enter a valid email address."),

  body("password")
    .notEmpty()
    .withMessage("Password is required.")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long."),

  body("fullname.firstName")
    .notEmpty()
    .withMessage("First name is required.")
    .isLength({ min: 2 })
    .withMessage("First name must be at least 2 characters."),

  body("fullname.lastName")
    .notEmpty()
    .withMessage("Last name is required.")
    .isLength({ min: 2 })
    .withMessage("Last name must be at least 2 characters."),

  responseWithValidationErrors,
];

// -------------------- LOGIN VALIDATIONS -------------------- //
const loginUserValidations = [
  body("email")
    .notEmpty()
    .withMessage("Email is required.")
    .isEmail()
    .withMessage("Please enter a valid email address."),

  body("password").notEmpty().withMessage("Password is required."),

  responseWithValidationErrors,
];

// -------------------- ADDRESS VALIDATIONS -------------------- //
const addAddressValidation = [
  body("phone")
    .trim()
    .notEmpty()
    .withMessage("Phone number is required.")
    .isLength({ min: 10, max: 15 })
    .withMessage("Phone number must be between 10 and 15 digits."),
  body("street").trim().notEmpty().withMessage("Street address is required."),
  body("city").trim().notEmpty().withMessage("City is required."),
  body("state").trim().notEmpty().withMessage("State is required."),
  body("zip")
    .trim()
    .notEmpty()
    .withMessage("ZIP code is required.")
    .isPostalCode("any")
    .withMessage("Invalid ZIP code format."),
  body("country").trim().notEmpty().withMessage("Country is required."),
  body("isDefault")
    .optional()
    .isBoolean()
    .withMessage("isDefault must be a boolean"),
  responseWithValidationErrors,
];

export { registerUserValidations, loginUserValidations, addAddressValidation };
