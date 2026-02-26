import { Router } from "express";
import mainConfig from "../config/main";
import verifyToken from "../middlewares/verifyToken";
import { newProductMulterHandler } from "../middlewares/multerHandler";
import { newProductValidator, validationError } from "../middlewares/validator";
import createNew from "../controllers/admin/createNew";
import deleteProduct from "../controllers/admin/deleteProduct";
import updateProduct from "../controllers/admin/updateProduct";
import getAllUsers from "../controllers/admin/getAllUsers";

const adminRoutes = Router();

adminRoutes.post(
  mainConfig.routes.newProduct,
  newProductMulterHandler,
  newProductValidator,
  validationError,
  createNew
);

adminRoutes.delete(mainConfig.routes.deleteProduct, deleteProduct);
adminRoutes.put(mainConfig.routes.updateProduct, newProductMulterHandler, updateProduct);
adminRoutes.get(mainConfig.routes.allUsers, getAllUsers);

export default adminRoutes;
