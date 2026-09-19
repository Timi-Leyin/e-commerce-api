import { Request, Response } from "express";
import errorHandler from "../../utils/errorHandler";
import AddressBook from "../../models/AddressBook";
import mainConfig from "../../config/main";
import { formatAddressList } from "../../utils/formatAddress";

export default async (req: Request | any, res: Response) => {
  try {
    const addresses = await AddressBook.findAll({
      where: {
        user_id: req.user.uuid,
      },
      attributes: [
        "id",
        "firstName",
        "lastName",
        "phone",
        "additional_phone",
        "country",
        "region",
        "city",
        "street",
        "landmark",
        "label",
        "isDefault",
        "updatedAt",
        "createdAt",
      ],
      order: [
        ["isDefault", "DESC"],
        ["updatedAt", "DESC"],
      ],
    });

    const data = formatAddressList(addresses);
    const defaultAddress = data.find((item) => item.isDefault) || null;

    return res.status(mainConfig.status.ok).json({
      msg:
        data.length > 0
          ? "Addresses fetched successfully"
          : "No addresses saved yet",
      data: {
        addresses: data,
        defaultAddress,
        count: data.length,
        maxAddresses: 3,
        canAddMore: data.length < 3,
      },
    });
  } catch (error) {
    return errorHandler(res, error);
  }
};
