import { Router } from "express";
import getOrders from "../controllers/orders/getOrders";
import verifyAdmin from "../middlewares/verifyAdmin";
import getMyOrders from "../controllers/orders/getMyOrders";
import updateOrderSentForDelivery from "../controllers/orders/updateOrderSentForDelivery";

const ordersRoutes = Router();

ordersRoutes.get("/", verifyAdmin, getOrders);
ordersRoutes.get("/my-orders", getMyOrders);
ordersRoutes.put("/:orderId/sent-for-delivery", verifyAdmin, updateOrderSentForDelivery);

export default ordersRoutes;
