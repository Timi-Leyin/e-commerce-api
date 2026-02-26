import { Request, Response } from "express";
import errorHandler from "../../utils/errorHandler";
import Orders from "../../models/Order";
import mainConfig from "../../config/main";

export default async (req: Request, res: Response) => {
  try {
    const itemsPerPage = Number(
      Math.min(Number(req.query.limit || 10), mainConfig.MAX_LIMIT),
    );
    const currentPage = Math.max(Number(req.query.page || 1), 1);
    const offset = (currentPage - 1) * itemsPerPage;

    const orders = await Orders.findAndCountAll({
      order: [["createdAt", "DESC"]],
      limit: itemsPerPage,
      offset,
    });

    const totalPages = Math.ceil(orders.count / itemsPerPage);

    return res.status(200).json({
      msg: "Orders Retrieved",
      data: {
        limit: itemsPerPage,
        currentPage,
        totalPages,
        totalItems: orders.count,
        orders: orders.rows,
      },
    });
  } catch (error) {
    return errorHandler(res, error);
  }
};
