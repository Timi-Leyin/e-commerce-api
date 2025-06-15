import { NextFunction, Request, Response } from "express";
import { body, query, validationResult } from "express-validator";
import mainConfig from "../config/main";
// import becomeSeller from "../controllers/sellers/becomeSeller";

export const waitlistValidator = [
  body("email").trim().normalizeEmail().isEmail().withMessage("Invalid Email"),
  body("type")
    .trim()
    .matches(/(^(seller)$|^(buyer)$)/i)
    .withMessage("type Must be a Seller or Buyer"),
];

const currencyValidator = body("currency", "Currency is Required")
  .trim()
  .matches(/^(NGN)$/i)
  .withMessage("NGN are the only Currency Allowed");

// AUTH
const loginValidator = [
  body("email", "Invalid Email").trim().normalizeEmail().isEmail(),
  body("password", "Password cannot be Empty").trim().isLength({ min: 1 }),
];

const signupValidator = [
  body("email", "Invalid Email").trim().normalizeEmail().isEmail(),
  body("password", "Password cannot be Empty")
    .trim()
    .isLength({ min: 6 })
    .withMessage("Password Must Be Greater that 6"),
];

const forgottenPasswordValidator = [
  body("email", "Invalid Email")
    .trim()
    .normalizeEmail()
    .isEmail()
    .withMessage("Email is required"),
];

export const verifyValidator = [
  body("type", "Verification Type is required")
    .trim()
    .matches(/(reset)$|(verify)$/i)
    .withMessage("Type must be either RESET or VERIFY"),
  body("token", "Verification Token is required")
    .trim()
    .isLength({ min: 20 })
    .withMessage("Invalid Verification Token Format"),
];

// export const verifyOtpValidator = [
//   body("email", "Invalid Email").normalizeEmail().isEmail(),
//   body("otp", "OTP is Required")
//     .isLength({ min: 4 })
//     .withMessage("Invalid OTP"),
// ];

const becomeSellerValidator = [
  body("shop_category", "Shop category is required")
    .trim()
    .isLength({ min: 3 })
    .withMessage("Shop Category length must be more than 3"),
  body("shop_name", "Shop Name is required")
    .trim()
    .isLength({ min: 3 })
    .withMessage("Shop Name length must be more than 3"),
  body("phone", "Contact Phone is Required")
    .trim()
    .isString()
    .isMobilePhone("en-NG")
    .withMessage("Enter a Valid phone Number"),
  body("country", "Shop Country is Required")
    .trim()
    .isString()
    .matches(/^Nigeria$/i)
    .withMessage("Supported in Nigeria Only"),
  body("address", "Shop Address is Required")
    .trim()
    .isString()
    .isLength({ min: 6 })
    .withMessage("Invalid Address"),
];

export const newProductValidator = [
  body("name", "Product name is required")
    .trim()
    .isString()
    .isLength({ min: 5 })
    .withMessage("Name must be greater than 5 character"),
  body("quantity", "Product Quantity is required")
    .trim()
    .isNumeric()
    .withMessage("Quantity must be Numeric"),
  currencyValidator,
  body("category", "Category is Required")
    .trim()
    .isString()
    .isLength({ min: 5 })
    .withMessage("Category must be greater than 5 character"),
  body("price", "Price is Required")
    .isNumeric()
    .withMessage("Enter a valid Price"),
  body("description", "Description is Required")
    .trim()
    .isString()
    .isLength({ min: 10 })
    .withMessage("Description must be greater than 10 character"),
  body("old_price")
    .optional()
    .isNumeric()
    .withMessage("Old Price must be Numeric"),
  body("percentage_discount")
    .optional()
    .isNumeric()
    .withMessage("Enter a valid Percentage"),
];

const validationError = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (errors.array().length > 0) {
    const error = errors.array()[0].msg;
    return res.status(mainConfig.status.notAcceptable).json({ msg: error });
  }
  return next();
};

export const reportValidator = [
  body("reason", "Reason for report is required").trim().isString(),
];

export const addCartValidator = [
  body("product_id", "Product ID is Required").trim().isString().notEmpty(),
  body("quantity").trim().isNumeric().withMessage("Quantity must be Numeric"),
];

export const removeCartValidator = [
  body("product_id", "Product ID is Required")
    .trim()
    .isString()
    .isLength({ min: 6 }),
];

export const checkOutValidator = [
  body("payment_method", "Payment Method is Required")
    .trim()
    .isString()
    .matches(/(^(pay on delivery)$|^(bank)$)/i)
    .withMessage("Payment Method can only be via Bank or Pay on Delivery"),
  currencyValidator,
  body("coupon").trim().isString().optional(),
  body("delivery_method", "Delivery Method is Required")
    .trim()
    .isString()
    .matches(/(^(home delivery)$|^(pick up station)$)/i)
    .withMessage(
      "Delivery Method can only be via Pick up Station or Home Delivery"
    ),
  body("address_id")
    .optional()
    .trim()
    .isNumeric({ no_symbols: true })
    .withMessage("Invalid Address ID"),
];

// address Validators

export const newAddressValidator = [
  body("firstName")
    .trim()
    .isString()
    .isLength({
      min: 3,
    })
    .withMessage("First Name must be more than 3 characters"),
  body("lastName")
    .trim()
    .isString()
    .isLength({
      min: 3,
    })
    .withMessage("Last Name must be more than 3 characters"),
  body("phone").trim(),
  body("additionalPhone").optional().trim(),
  body("country")
    .trim()
    .isString()
    .isLength({
      min: 3,
    })
    .withMessage("Country must be more than 3 characters"),
  body("region")
    .trim()
    .isString()
    .isLength({
      min: 3,
    })
    .withMessage("Region must be more than 3 characters"),
  body("city")
    .trim()
    .isString()
    .isLength({
      min: 3,
    })
    .withMessage("City must be more than 3 characters"),
];

let updateAddressValidator = [];
updateAddressValidator = Object.assign(
  updateAddressValidator,
  newAddressValidator
);
/*
  GENERAL VALIDATORS
*/
export const checkUserValidator = [
  query("email")
    .optional()
    .trim()
    .normalizeEmail()
    .isEmail()
    .withMessage("Invalid Email"),
  query("username")
    .optional()
    .trim()
    .isLength({ min: 3 })
    .withMessage("Username must be at least 3 characters"),
  query("shop_name").optional().trim(),
];

export {
  loginValidator,
  signupValidator,
  validationError,
  forgottenPasswordValidator,
  becomeSellerValidator,
  updateAddressValidator,
};
