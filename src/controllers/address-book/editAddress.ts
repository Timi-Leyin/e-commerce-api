import { Request, Response } from "express";
import errorHandler from "../../utils/errorHandler";
import AddressBook from "../../models/AddressBook";
import mainConfig from "../../config/main";
import {
  formatAddress,
  normalizePhone,
} from "../../utils/formatAddress";

export default async (req: Request | any, res: Response) => {
  try {
    const { id } = req.params;
    const {
      firstName,
      lastName,
      phone,
      additionalPhone,
      country,
      city,
      region,
      street,
      landmark,
      label,
      isDefault,
      setAsDefault,
    } = req.body;

    const existing = await AddressBook.findOne({
      where: {
        id,
        user_id: req.user.uuid,
      },
    });

    if (!existing) {
      return res.status(mainConfig.status.notFound).json({
        msg: "Address not found",
      });
    }

    const makeDefault = Boolean(isDefault) || Boolean(setAsDefault);

    if (makeDefault) {
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

    const payload: Record<string, any> = {};

    if (firstName !== undefined) payload.firstName = String(firstName).trim();
    if (lastName !== undefined) payload.lastName = String(lastName).trim();
    if (phone !== undefined) payload.phone = normalizePhone(phone);
    if (additionalPhone !== undefined) {
      payload.additional_phone = additionalPhone
        ? normalizePhone(additionalPhone)
        : null;
    }
    if (country !== undefined) payload.country = String(country).trim();
    if (city !== undefined) payload.city = String(city).trim();
    if (region !== undefined) payload.region = String(region).trim();
    if (street !== undefined) {
      payload.street = street ? String(street).trim() : null;
    }
    if (landmark !== undefined) {
      payload.landmark = landmark ? String(landmark).trim() : null;
    }
    if (label !== undefined) {
      payload.label = label ? String(label).trim() : null;
    }
    if (makeDefault) payload.isDefault = true;

    await AddressBook.update(payload, {
      where: {
        id,
        user_id: req.user.uuid,
      },
    });

    const updated = await AddressBook.findOne({
      where: {
        id,
        user_id: req.user.uuid,
      },
    });

    return res.status(mainConfig.status.ok).json({
      msg: "Address updated successfully",
      data: formatAddress(updated),
    });
  } catch (error) {
    return errorHandler(res, error);
  }
};
