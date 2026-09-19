import { Response } from "express";
import errorHandler from "../../utils/errorHandler";
import Product from "../../models/Product";
import Seller from "../../models/Seller";
import Cart from "../../models/Cart";
import mainConfig from "../../config/main";
import { IRequest } from "../../types/express";

export default async (req: IRequest | any, res: Response) => {
  const { uuid } = req.params;
  try {
    const product = await Product.findOne({
      where: {
        uuid,
      },
      // attributes:["uuid", "seller_id", "name", "category", "thumnail", 'other_images', "quantity", "price", "old_price", "currency", "description", "delivery_regions", "createdAt", "is_archived", ]
    });

    if (!product) {
      return res
        .status(404)
        .json({ msg: "Product not found or has been deleted" });
    }

    const seller = await Seller.findOne({
      where: {
        uuid: product?.get().seller_id,
      },
      attributes: [
        "shop_icon",
        "shop_category",
        "phone",
        "shop_name",
        "region",
        "delivery_zone",
        "verified",
      ],
    });

    const cart =
      req.user &&
      (await Cart.findOne({
        where: {
          product_id: uuid,
          user_id: req.user.uuid,
        },
        attributes: ["uuid", "quantity"],
      }));

    return res.status(mainConfig.status.ok).json({
      msg: "Retrived Product",
      data: {
        ...product?.get(),
        seller_info: seller && seller.get(),
        cart_info: req.user && cart && cart.get(),
      },
    });
  } catch (error) {
    return errorHandler(res, error);
  }
};
