import { Request, Response } from "express";
import Product from "../../models/Product";
import mainConfig from "../../config/main";
import errorHandler from "../../utils/errorHandler";
import CloudinaryUploader from "../../config/uploadfly";
export default async (req: Request | any, res: Response) => {
  const {
    name,
    category,
    quantity,
    price,
    old_price,
    currency,
    description_type,
    percentage_discount,
    description,
    productId,
    delivery_regions,
    seller_id,
    is_archived,
    archivedAt,
  } = req.body;

  if (!productId) {
    return res.status(400).json({ msg: "ProductId is Required" });
  }

  try {
    const product = await Product.findOne({
      where: {
        uuid: productId,
      },
    });

    if (!product) {
      return res.status(mainConfig.status.notFound).json({
        msg: "Product not found",
      });
    }

    const thumbnailFiles = req.files && req.files["thumbnail"];
    const otherImageFiles = req.files && req.files["other_images"];

    const updatePayload: Record<string, any> = {};

    if (name !== undefined) updatePayload.name = name;
    if (category !== undefined) updatePayload.category = category;
    if (quantity !== undefined) updatePayload.quantity = quantity;
    if (price !== undefined) updatePayload.price = price;
    if (old_price !== undefined) updatePayload.old_price = old_price;
    if (currency !== undefined) updatePayload.currency = currency;
    if (description_type !== undefined) updatePayload.description_type = description_type;
    if (percentage_discount !== undefined) updatePayload.percentage_discount = percentage_discount;
    if (description !== undefined) updatePayload.description = description;
    if (delivery_regions !== undefined) updatePayload.delivery_regions = delivery_regions;
    if (seller_id !== undefined) updatePayload.seller_id = seller_id;
    if (is_archived !== undefined) {
      updatePayload.is_archived =
        String(is_archived).toLowerCase() === "true" || is_archived === true;
    }
    if (archivedAt !== undefined) updatePayload.archivedAt = archivedAt;

    if (thumbnailFiles && thumbnailFiles.length > 0) {
      const thumbnailFly = await CloudinaryUploader.upload(thumbnailFiles[0]);
      if (thumbnailFly?.secure_url) {
        updatePayload.thumbnail = thumbnailFly.secure_url;
      }
    }

    if (otherImageFiles && otherImageFiles.length > 0) {
      const imageFlies = await CloudinaryUploader.uploadBulk(otherImageFiles);
      if (imageFlies?.length) {
        updatePayload.other_images = imageFlies.join(",");
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      return res.status(mainConfig.status.bad).json({
        msg: "No product fields provided for update",
      });
    }

    await Product.update(updatePayload, {
      where: {
        uuid: productId,
      },
    });

    const updatedProduct = await Product.findOne({
      where: {
        uuid: productId,
      },
    });

    return res.status(mainConfig.status.ok).json({
      msg: "Product updated",
      data: {
        product: updatedProduct,
      },
    });
  } catch (error) {
    console.log(error);
    return errorHandler(res, error);
  }
};
