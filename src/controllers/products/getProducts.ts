import { NextFunction, Response } from "express";
import Product from "../../models/Product";
import { Op } from "sequelize";
import mainConfig from "../../config/main";
import errorHandler from "../../utils/errorHandler";
import Cart from "../../models/Cart";
import { IRequest } from "../../types/express";

const shuffleProducts = <T>(items: T[]) => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }
  return result;
};

export default async (
  req: IRequest | any,
  res: Response,
  next: NextFunction
) => {
  const { by, order, query, limit, page } = req.query;

  if (by && by != "name") {
    return res.status(mainConfig.status.bad).json({
      msg: "'By' Query Parameter must be 'name'",
    });
  }

  const by_filter: string = (by as string) || "name";
  const itemsPerPage = Number(Math.min(limit || 5, mainConfig.MAX_LIMIT));
  const currentPage = Number(page || 1);
  const offset = (currentPage - 1) * itemsPerPage;

  try {
    const products = await Product.findAndCountAll({
      where: {
        [by_filter]: {
          [Op.like]: `${query || ""}%`,
        },
      },
      limit: itemsPerPage,
      offset,
    });

    const totalPages = Math.ceil(products.count / itemsPerPage);

    const productsRow = await Promise.all(
      products.rows.map(async (p) => {
        const pr_data = p.get();

        const cart_info =
          req.user &&
          (await Cart.findOne({
            where: {
              product_id: pr_data.uuid,
              user_id: req.user.uuid,
            },
            attributes: ["quantity"],
          }));

        return {
          uuid: pr_data.uuid,
          seller_id: pr_data.seller_id,
          name: pr_data.name,
          price: pr_data.price,
          currency: pr_data.currency,
          quantity: pr_data.quantity,
          category: pr_data.category,
          thumbnail: pr_data.thumbnail,
          percentage_discount: pr_data.percentage_discount,
          cart: cart_info || null,
        };
      })
    );

    const randomizedProducts = shuffleProducts(productsRow);

    return res.status(mainConfig.status.ok).json({
      msg: "Products Retrieved",
      warning: !req.user && "Invalid Authorization",
      data: {
        limit: itemsPerPage,
        currentPage,
        totalPages,
        totalItems: products.count,
        products: randomizedProducts,
      },
    });
  } catch (error) {
    console.log(error);
    return errorHandler(res, error);
  }
};
