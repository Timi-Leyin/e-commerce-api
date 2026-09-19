import { Router } from "express";
import getOrders from "../controllers/orders/getOrders";
import verifyAdmin from "../middlewares/verifyAdmin";
import getMyOrders from "../controllers/orders/getMyOrders";
import getOrderById from "../controllers/orders/getOrderById";
import updateOrderSentForDelivery from "../controllers/orders/updateOrderSentForDelivery";
import { confirmOrderReceivedAuth } from "../controllers/orders/confirmOrderReceived";

const ordersRoutes = Router();

ordersRoutes.get("/", verifyAdmin, getOrders);
ordersRoutes.get("/my-orders", getMyOrders);
ordersRoutes.post("/:orderId/confirm-received", confirmOrderReceivedAuth);
ordersRoutes.put("/:orderId/sent-for-delivery", verifyAdmin, updateOrderSentForDelivery);
ordersRoutes.get("/:orderId", getOrderById);

export default ordersRoutes;
