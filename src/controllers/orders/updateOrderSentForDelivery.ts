import { Request, Response } from "express";
import { nanoid } from "nanoid";
import mainConfig from "../../config/main";
import Orders, { orderStatus } from "../../models/Order";
import Token from "../../models/Token";
import User from "../../models/User";
import errorHandler from "../../utils/errorHandler";
import {
  canDispatchOrder,
  formatOrderDelivery,
  isDelivered,
  normalizeStatus,
} from "../../utils/orderDelivery";
import sendEmail from "../../utils/sendEmail";

const frontendBase = () =>
  String(
    process.env.FRONTEND_BASE_URL || "https://all-star-communications.com",
  ).replace(/\/$/, "");

export default async (req: Request | any, res: Response) => {
  try {
    const { orderId } = req.params;

    const order = await Orders.findOne({
      where: {
        uuid: orderId,
      },
    });

    if (!order) {
      return res.status(mainConfig.status.notFound).json({
        msg: "Order not found",
      });
    }

    const orderData = order.get();

    if (isDelivered(orderData.status)) {
      return res.status(mainConfig.status.bad).json({
        msg: "Order is already delivered",
        data: formatOrderDelivery(orderData),
      });
    }

    if (!canDispatchOrder(orderData.status)) {
      return res.status(mainConfig.status.bad).json({
        msg: `Order cannot be dispatched from status "${orderData.status}". Payment must be confirmed first.`,
        data: {
          orderId: orderData.uuid,
          status: orderData.status,
        },
      });
    }

    const customer = await User.findOne({
      where: {
        uuid: orderData.user_id,
      },
      attributes: ["email", "firstName", "lastName"],
    });

    if (!customer) {
      return res.status(mainConfig.status.notFound).json({
        msg: "Customer not found",
      });
    }

    const customerData = customer.get();

    if (!customerData.email) {
      return res.status(mainConfig.status.bad).json({
        msg: "Customer email not available",
      });
    }

    const tokenType = `order-received:${orderData.uuid}`;
    const tokenValue = nanoid(48);
    const now = new Date();
    const alreadyOut = normalizeStatus(orderData.status) === orderStatus.out;

    await Token.destroy({
      where: {
        type: tokenType,
      },
    });

    await Token.create({
      uuid: nanoid(35),
      type: tokenType,
      token: tokenValue,
      user_id: orderData.user_id,
      expiresOn: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    await Orders.update(
      {
        status: orderStatus.out,
        dispatched_at: orderData.dispatched_at || now,
      },
      {
        where: {
          uuid: orderData.uuid,
        },
      },
    );

    // Frontend-hosted confirmation page (seamless UX)
    const confirmLink = `${frontendBase()}/orders/confirm-received?token=${encodeURIComponent(
      tokenValue,
    )}&type=${encodeURIComponent(tokenType)}&orderId=${encodeURIComponent(
      orderData.uuid,
    )}&orderCode=${encodeURIComponent(orderData.order_code || "")}`;

    await sendEmail({
      to: customerData.email,
      subject: `Your order ${orderData.order_code} is on the way`,
      path: "src/emails/order-delivery.ejs",
      data: {
        brandName: "All Stars Solutions",
        name: customerData.firstName || customerData.email.split("@")[0],
        orderCode: orderData.order_code,
        orderId: orderData.uuid,
        confirmLink,
        trackLink: `${frontendBase()}/orders/${orderData.uuid}`,
      },
    });

    const updated = await Orders.findOne({ where: { uuid: orderData.uuid } });

    return res.status(mainConfig.status.ok).json({
      msg: alreadyOut
        ? "Delivery confirmation email resent"
        : "Order marked as out for delivery",
      data: {
        ...formatOrderDelivery(updated?.get() || orderData),
        deliveryConfirmationLink: confirmLink,
        emailSentTo: customerData.email,
      },
    });
  } catch (error) {
    return errorHandler(res, error);
  }
};
