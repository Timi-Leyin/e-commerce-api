import { Request, Response } from "express";
import mainConfig from "../../config/main";
import Orders, { orderStatus } from "../../models/Order";
import Token from "../../models/Token";
import errorHandler from "../../utils/errorHandler";
import {
  canConfirmReceived,
  formatOrderDelivery,
  isDelivered,
} from "../../utils/orderDelivery";

const parseOrderIdFromType = (type: string) => {
  const [prefix, orderId] = type.split(":");
  if (prefix !== "order-received" || !orderId) {
    return null;
  }
  return orderId;
};

const frontendBase = () =>
  String(
    process.env.FRONTEND_BASE_URL || "https://all-star-communications.com",
  ).replace(/\/$/, "");

const redirectResult = (
  res: Response,
  status: "success" | "failed" | "already",
  extras: Record<string, string> = {},
) => {
  const params = new URLSearchParams({ status, ...extras });
  return res.redirect(
    `${frontendBase()}/orders/delivery-confirmed?${params.toString()}`,
  );
};

const wantsRedirect = (req: Request) => {
  if (String(req.query.redirect || "").toLowerCase() === "false") {
    return false;
  }
  const accept = String(req.get("accept") || "");
  // Browser email clicks typically prefer HTML
  return req.method === "GET" && !accept.includes("application/json");
};

const markDelivered = async ({
  orderId,
  userId,
  token,
  type,
}: {
  orderId: string;
  userId?: string;
  token?: string;
  type?: string;
}) => {
  const where: Record<string, any> = { uuid: orderId };
  if (userId) where.user_id = userId;

  const order = await Orders.findOne({ where });

  if (!order) {
    return { error: { status: mainConfig.status.notFound, msg: "Order not found" } };
  }

  const orderData = order.get();

  if (isDelivered(orderData.status)) {
    if (token && type) {
      await Token.destroy({ where: { type, token } });
    }
    return {
      already: true,
      order: formatOrderDelivery(orderData),
    };
  }

  if (!canConfirmReceived(orderData.status)) {
    return {
      error: {
        status: mainConfig.status.bad,
        msg: `Order cannot be confirmed from status "${orderData.status}"`,
        data: formatOrderDelivery(orderData),
      },
    };
  }

  const now = new Date();
  await Orders.update(
    {
      status: orderStatus.delivered,
      delivered_at: now,
    },
    { where: { uuid: orderId } },
  );

  if (token && type) {
    await Token.destroy({ where: { type, token } });
  }

  const updated = await Orders.findOne({ where: { uuid: orderId } });

  return {
    already: false,
    order: formatOrderDelivery(updated?.get() || { ...orderData, status: orderStatus.delivered, delivered_at: now }),
  };
};

/** Public: email / magic-link confirmation (GET redirects to frontend). */
export const confirmOrderReceivedPublic = async (
  req: Request,
  res: Response,
) => {
  try {
    const token = String(req.query.token || req.body?.token || "").trim();
    const type = String(req.query.type || req.body?.type || "").trim();

    if (!token || !type) {
      if (wantsRedirect(req)) {
        return redirectResult(res, "failed", { reason: "missing_params" });
      }
      return res.status(mainConfig.status.bad).json({
        msg: "token and type are required",
      });
    }

    const orderId = parseOrderIdFromType(type);

    if (!orderId) {
      if (wantsRedirect(req)) {
        return redirectResult(res, "failed", { reason: "invalid_type" });
      }
      return res.status(mainConfig.status.bad).json({
        msg: "Invalid confirmation type",
      });
    }

    const tokenRecord = await Token.findOne({
      where: { type, token },
    });

    if (!tokenRecord) {
      if (wantsRedirect(req)) {
        return redirectResult(res, "failed", {
          reason: "invalid_token",
          orderId,
        });
      }
      return res.status(mainConfig.status.gone).json({
        msg: "Confirmation link is invalid or has already been used",
      });
    }

    const tokenData = tokenRecord.get();
    const tokenExpiresOn = new Date(tokenData.expiresOn);

    if (new Date() > tokenExpiresOn) {
      await Token.destroy({ where: { type, token } });
      if (wantsRedirect(req)) {
        return redirectResult(res, "failed", {
          reason: "expired",
          orderId,
        });
      }
      return res.status(mainConfig.status.gone).json({
        msg: "Confirmation link has expired",
      });
    }

    const result = await markDelivered({
      orderId,
      userId: tokenData.user_id,
      token,
      type,
    });

    if (result.error) {
      if (wantsRedirect(req)) {
        return redirectResult(res, "failed", {
          reason: "not_eligible",
          orderId,
        });
      }
      return res.status(result.error.status).json({
        msg: result.error.msg,
        data: result.error.data,
      });
    }

    if (wantsRedirect(req)) {
      return redirectResult(res, result.already ? "already" : "success", {
        orderId,
        orderCode: String(result.order?.order_code || ""),
        status: orderStatus.delivered,
      });
    }

    return res.status(mainConfig.status.ok).json({
      msg: result.already
        ? "Order was already marked as delivered"
        : "Order marked as received",
      data: result.order,
    });
  } catch (error) {
    if (wantsRedirect(req)) {
      return redirectResult(res, "failed", { reason: "server_error" });
    }
    return errorHandler(res, error);
  }
};

/** Authenticated customer confirms from My Orders / tracking page. */
export const confirmOrderReceivedAuth = async (
  req: Request | any,
  res: Response,
) => {
  try {
    const orderId = String(req.params.orderId || "").trim();

    if (!req.user?.uuid) {
      return res.status(mainConfig.status.unauthorized).json({
        msg: "Unauthorized",
      });
    }

    if (!orderId) {
      return res.status(mainConfig.status.bad).json({
        msg: "Order ID is required",
      });
    }

    const result = await markDelivered({
      orderId,
      userId: req.user.uuid,
    });

    if (result.error) {
      return res.status(result.error.status).json({
        msg: result.error.msg,
        data: result.error.data,
      });
    }

    // Invalidate any outstanding email tokens for this order
    await Token.destroy({
      where: { type: `order-received:${orderId}` },
    });

    return res.status(mainConfig.status.ok).json({
      msg: result.already
        ? "Order was already marked as delivered"
        : "Order marked as received",
      data: result.order,
    });
  } catch (error) {
    return errorHandler(res, error);
  }
};

export default confirmOrderReceivedPublic;
