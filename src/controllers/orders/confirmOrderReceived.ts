import { Request, Response } from "express";
import mainConfig from "../../config/main";
import Orders, { orderStatus } from "../../models/Order";
import Token from "../../models/Token";
import errorHandler from "../../utils/errorHandler";

const parseOrderIdFromType = (type: string) => {
  const [prefix, orderId] = type.split(":");
  if (prefix !== "order-received" || !orderId) {
    return null;
  }

  return orderId;
};

export default async (req: Request, res: Response) => {
  try {
    const token = String(req.query.token || "").trim();
    const type = String(req.query.type || "").trim();

    if (!token || !type) {
      return res.status(mainConfig.status.bad).json({
        msg: "token and type are required",
      });
    }

    const orderId = parseOrderIdFromType(type);

    if (!orderId) {
      return res.status(mainConfig.status.bad).json({
        msg: "Invalid confirmation type",
      });
    }

    const tokenRecord = await Token.findOne({
      where: {
        type,
        token,
      },
    });

    if (!tokenRecord) {
      return res.status(mainConfig.status.unavailable).json({
        msg: "Token Expired",
      });
    }

    const tokenData = tokenRecord.get();
    const tokenExpiresOn = new Date(tokenData.expiresOn);

    if (new Date() > tokenExpiresOn) {
      await Token.destroy({
        where: {
          type,
          token,
        },
      });

      return res.status(mainConfig.status.unavailable).json({
        msg: "Token has expired",
      });
    }

    const order = await Orders.findOne({
      where: {
        uuid: orderId,
        user_id: tokenData.user_id,
      },
    });

    if (!order) {
      await Token.destroy({
        where: {
          type,
          token,
        },
      });

      return res.status(mainConfig.status.notFound).json({
        msg: "Order not found",
      });
    }

    if (order.get().status !== orderStatus.delivered) {
      await Orders.update(
        {
          status: orderStatus.delivered,
        },
        {
          where: {
            uuid: orderId,
          },
        },
      );
    }

    await Token.destroy({
      where: {
        type,
        token,
      },
    });

    return res.status(mainConfig.status.ok).json({
      msg: "Order marked as received",
      data: {
        orderId,
        status: orderStatus.delivered,
      },
    });
  } catch (error) {
    return errorHandler(res, error);
  }
};
