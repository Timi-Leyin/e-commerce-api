import { Request, Response } from "express";
import errorHandler from "../../utils/errorHandler";
import Orders from "../../models/Order";
import AddressBook from "../../models/AddressBook";
import mainConfig from "../../config/main";
import { formatOrderDelivery } from "../../utils/orderDelivery";

const enrichOrders = async (rows: any[]) => {
  const addressIds = Array.from(
    new Set(
      rows
        .map((row) => {
          const data = typeof row?.get === "function" ? row.get() : row;
          return data?.delivery_address_id;
        })
        .filter(Boolean)
        .map((id) => String(id)),
    ),
  );

  const addresses = addressIds.length
    ? await AddressBook.findAll({
        where: { id: addressIds },
      })
    : [];

  const addressMap = new Map(
    addresses.map((addr) => {
      const data = addr.get();
      return [String(data.id), data];
    }),
  );

  return rows.map((row) => {
    const data = typeof row?.get === "function" ? row.get() : row;
    return formatOrderDelivery(
      data,
      addressMap.get(String(data.delivery_address_id)),
    );
  });
};

export default async (req: Request | any, res: Response) => {
  try {
    const itemsPerPage = Number(
      Math.min(Number(req.query.limit || 10), mainConfig.MAX_LIMIT),
    );
    const currentPage = Math.max(Number(req.query.page || 1), 1);
    const offset = (currentPage - 1) * itemsPerPage;

    const orders = await Orders.findAndCountAll({
      where: {
        user_id: req.user?.uuid,
      },
      order: [
        ["id", "DESC"],
        ["createdAt", "DESC"],
      ],
      limit: itemsPerPage,
      offset,
    });

    const totalPages = Math.ceil(orders.count / itemsPerPage);
    const enriched = await enrichOrders(orders.rows);

    return res.status(mainConfig.status.ok).json({
      msg: "Orders Retrieved",
      data: {
        limit: itemsPerPage,
        currentPage,
        totalPages,
        totalItems: orders.count,
        orders: enriched,
      },
    });
  } catch (error) {
    return errorHandler(res, error);
  }
};
