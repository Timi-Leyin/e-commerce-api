import { Router } from "express";
import getProducts from "../controllers/products/getProducts";
import getSingleProduct from "../controllers/products/getSingleProduct";
import conditionVerify from "../middlewares/conditionVerify";

const productRoutes = Router();

// Public product listing + detail (token optional — only enriches cart info)
productRoutes.get("/", conditionVerify, getProducts);
productRoutes.get("/:uuid", conditionVerify, getSingleProduct);

export default productRoutes;
