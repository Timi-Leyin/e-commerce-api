import { Router } from "express";
import {
  opayReturn,
  opayVerifyPayment,
  opayWebhook,
} from "../controllers/webhooks/opayCallback";
import verifyToken from "../middlewares/verifyToken";

const webhooksRoutes = Router();

webhooksRoutes.get("/opay/return", opayReturn);
webhooksRoutes.post("/opay/callback", opayWebhook);
webhooksRoutes.get("/opay/verify/:reference", verifyToken, opayVerifyPayment);

export default webhooksRoutes;
