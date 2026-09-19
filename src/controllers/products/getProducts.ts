import { NextFunction, Response } from "express";
import Product from "../../models/Product";
import { Op, WhereOptions } from "sequelize";
import mainConfig from "../../config/main";
import errorHandler from "../../utils/errorHandler";
import Cart from "../../models/Cart";
import { IRequest } from "../../types/express";

const PRODUCT_LIST_ATTRIBUTES = [
  "uuid",
  "seller_id",
  "name",
  "price",
  "currency",
  "quantity",
  "category",
  "thumbnail",
  "percentage_discount",
  "old_price",
  "createdAt",
] as const;

const escapeLike = (value: string) =>
  value.replace(/[\\%_]/g, (char) => `\\${char}`);

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
  next: NextFunction,
) => {
  const { by, query, limit, page, category } = req.query;

  if (by && by !== "name") {
    return res.status(mainConfig.status.bad).json({
      msg: "'By' Query Parameter must be 'name'",
    });
  }

  const search = String(query || "").trim();
  const categoryFilter = String(category || "").trim();
  const itemsPerPage = Math.max(
    1,
    Math.min(Number(limit || 5) || 5, mainConfig.MAX_LIMIT),
  );
  const currentPage = Math.max(1, Number(page || 1) || 1);
  const offset = (currentPage - 1) * itemsPerPage;

  try {
    const where: WhereOptions = {
      is_archived: false,
    };

    // Prefix match stays index-friendly (name%)
    if (search) {
      where.name = {
        [Op.like]: `${escapeLike(search)}%`,
      };
    }

    if (categoryFilter) {
      where.category = {
        [Op.like]: `%${escapeLike(categoryFilter)}%`,
      };
    }

    const products = await Product.findAndCountAll({
      where,
      attributes: [...PRODUCT_LIST_ATTRIBUTES],
      limit: itemsPerPage,
      offset,
      // Stable + fast browse order; search stays relevance-ish by name
      order: search
        ? [["name", "ASC"]]
        : [
            ["createdAt", "DESC"],
            ["id", "DESC"],
          ],
      distinct: true,
    });

    const rows = products.rows.map((p) => p.get({ plain: true }));
    const productIds = rows.map((p) => p.uuid);

    // One cart query for the whole page instead of N+1
    let cartByProductId = new Map<string, { quantity: number }>();
    if (req.user?.uuid && productIds.length > 0) {
      const carts = await Cart.findAll({
        where: {
          user_id: req.user.uuid,
          product_id: { [Op.in]: productIds },
        },
        attributes: ["product_id", "quantity"],
      });

      cartByProductId = new Map(
        carts.map((cart) => {
          const data = cart.get({ plain: true });
          return [data.product_id, { quantity: data.quantity }];
        }),
      );
    }

    const productsRow = rows.map((pr_data) => ({
      uuid: pr_data.uuid,
      seller_id: pr_data.seller_id,
      name: pr_data.name,
      price: pr_data.price,
      currency: pr_data.currency,
      quantity: pr_data.quantity,
      category: pr_data.category,
      thumbnail: pr_data.thumbnail,
      percentage_discount: pr_data.percentage_discount,
      old_price: pr_data.old_price,
      cart: cartByProductId.get(pr_data.uuid) || null,
    }));

    // Only shuffle browse (no search/filter) so search stays fast & stable
    const responseProducts =
      search || categoryFilter
        ? productsRow
        : shuffleProducts(productsRow);

    const totalPages = Math.ceil(products.count / itemsPerPage) || 0;

    return res.status(mainConfig.status.ok).json({
      msg: "Products Retrieved",
      data: {
        limit: itemsPerPage,
        currentPage,
        totalPages,
        totalItems: products.count,
        query: search || null,
        category: categoryFilter || null,
        products: responseProducts,
      },
    });
  } catch (error) {
    console.log(error);
    return errorHandler(res, error);
  }
};
