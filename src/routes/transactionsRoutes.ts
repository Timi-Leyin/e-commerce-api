import { Router } from "express";
import verifyToken from "../middlewares/verifyToken";
import {
  getTransactionById,
  getTransactionByReference,
} from "../controllers/transactions/getTransaction";

const transactionsRoutes = Router();

transactionsRoutes.get("/reference/:reference", verifyToken, getTransactionByReference);
transactionsRoutes.get("/:transactionId", verifyToken, getTransactionById);

export default transactionsRoutes;
