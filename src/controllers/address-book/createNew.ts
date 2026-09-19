import { Request, Response } from "express";
import errorHandler from "../../utils/errorHandler";
import AddressBook from "../../models/AddressBook";
import mainConfig from "../../config/main";
import { nanoid } from "nanoid";
import {
  formatAddress,
  normalizePhone,
} from "../../utils/formatAddress";

const MAX_ADDRESSES = 3;

export default async (req: Request | any, res: Response) => {
  try {
    const {
      firstName,
      lastName,
      phone,
      additionalPhone,
      country = "Nigeria",
      city,
      region,
      street,
      landmark,
      label,
      isDefault,
      setAsDefault,
    } = req.body;

    const countAll = await AddressBook.count({
      where: {
        user_id: req.user.uuid,
      },
    });

    if (countAll >= MAX_ADDRESSES) {
      return res.status(mainConfig.status.bad).json({
        msg: "You can save up to 3 addresses. Edit or remove an existing one to continue.",
        data: {
          maxAddresses: MAX_ADDRESSES,
          currentCount: countAll,
        },
      });
    }

    const makeDefault =
      countAll === 0 ||
      Boolean(isDefault) ||
      Boolean(setAsDefault);

    if (makeDefault && countAll > 0) {
      await AddressBook.update(
        { isDefault: false },
        {
          where: {
            user_id: req.user.uuid,
            isDefault: true,
          },
        },
      );
    }

    const address = await AddressBook.create({
      user_id: req.user.uuid,
      uuid: nanoid(),
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      phone: normalizePhone(phone),
      additional_phone: additionalPhone
        ? normalizePhone(additionalPhone)
        : null,
      country: String(country || "Nigeria").trim(),
      region: String(region).trim(),
      city: String(city).trim(),
      street: street ? String(street).trim() : null,
      landmark: landmark ? String(landmark).trim() : null,
      label: label ? String(label).trim() : null,
      isDefault: makeDefault,
    });

    return res.status(mainConfig.status.created).json({
      msg: "Address saved successfully",
      data: formatAddress(address),
    });
  } catch (error) {
    return errorHandler(res, error);
  }
};
