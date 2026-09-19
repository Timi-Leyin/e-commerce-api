import { Request, Response } from "express";
import errorHandler from "../../utils/errorHandler";
import Orders from "../../models/Order";
import AddressBook from "../../models/AddressBook";
import mainConfig from "../../config/main";
import { formatOrderDelivery } from "../../utils/orderDelivery";

export default async (req: Request | any, res: Response) => {
  try {
    const { orderId } = req.params;

    if (!req.user?.uuid) {
      return res.status(mainConfig.status.unauthorized).json({
        msg: "Unauthorized",
      });
    }

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
    const isAdmin =
      req.user?.role === "admin" || req.user?.role === "moderator";

    if (!isAdmin && orderData.user_id !== req.user.uuid) {
      return res.status(mainConfig.status.forbidden).json({
        msg: "Unauthorized Access",
      });
    }

    const address = await AddressBook.findOne({
      where: { id: orderData.delivery_address_id },
    });

    return res.status(mainConfig.status.ok).json({
      msg: "Order Retrieved",
      data: formatOrderDelivery(orderData, address?.get()),
    });
  } catch (error) {
    return errorHandler(res, error);
  }
};
