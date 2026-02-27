import { Request, Response } from "express";
import { nanoid } from "nanoid";
import mainConfig from "../../config/main";
import Orders, { orderStatus } from "../../models/Order";
import Token from "../../models/Token";
import User from "../../models/User";
import errorHandler from "../../utils/errorHandler";
import sendEmail from "../../utils/sendEmail";

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

    const customer = await User.findOne({
      where: {
        uuid: orderData.user_id,
      },
      attributes: ["email", "firstName"],
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
      },
      {
        where: {
          uuid: orderData.uuid,
        },
      },
    );

    const backendBaseUrl = String(
      process.env.BACKEND_BASE_URL || `${req.protocol}://${req.get("host")}`,
    ).replace(/\/$/, "");

    const confirmLink = `${backendBaseUrl}/order/confirm-received?token=${tokenValue}&type=${tokenType}`;

    await sendEmail({
      to: customerData.email,
      subject: "Order Update • Out for Delivery",
      path: "src/emails/order-delivery.ejs",
      data: {
        brandName: "Cart Royal",
        name: customerData.firstName || customerData.email.split("@")[0],
        orderCode: orderData.order_code,
        orderId: orderData.uuid,
        confirmLink,
      },
    });

    return res.status(mainConfig.status.ok).json({
      msg: "Order marked as sent for delivery",
      data: {
        orderId: orderData.uuid,
        status: orderStatus.out,
        deliveryConfirmationLink: confirmLink,
      },
    });
  } catch (error) {
    return errorHandler(res, error);
  }
};
