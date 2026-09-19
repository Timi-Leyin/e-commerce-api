import { Request, Response } from "express";
import errorHandler from "../../utils/errorHandler";
import AddressBook from "../../models/AddressBook";
import mainConfig from "../../config/main";

export default async (req: Request | any, res: Response) => {
  try {
    const { id } = req.params;

    const address = await AddressBook.findOne({
      where: {
        id,
        user_id: req.user.uuid,
      },
    });

    if (!address) {
      return res.status(mainConfig.status.notFound).json({
        msg: "Address not found",
      });
    }

    const wasDefault = Boolean(address.get().isDefault);

    await AddressBook.destroy({
      where: {
        id,
        user_id: req.user.uuid,
      },
    });

    // If the deleted address was default, promote the most recently updated one
    if (wasDefault) {
      const nextDefault = await AddressBook.findOne({
        where: { user_id: req.user.uuid },
        order: [["updatedAt", "DESC"]],
      });

      if (nextDefault) {
        await AddressBook.update(
          { isDefault: true },
          {
            where: {
              id: nextDefault.get().id,
              user_id: req.user.uuid,
            },
          },
        );
      }
    }

    return res.status(mainConfig.status.ok).json({
      msg: "Address removed successfully",
      data: {
        id: Number(id),
        removed: true,
      },
    });
  } catch (error) {
    return errorHandler(res, error);
  }
};
