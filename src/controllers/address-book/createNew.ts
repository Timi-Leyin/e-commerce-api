import { Request, Response } from "express";
import errorHandler from "../../utils/errorHandler";
import AddressBook from "../../models/AddressBook";
import mainConfig from "../../config/main";
import { nanoid } from "nanoid";

export default async (req: Request | any, res: Response) => {
  try {
    const {
      firstName,
      lastName,
      phone,
      additionalPhone,
      country,
      city,
      region,
    } = req.body;



    const countAll = await AddressBook.findAndCountAll({
        where:{
            user_id: req.user.uuid,
        }
    })

    if(countAll.count >=3){
        return res.status(mainConfig.status.bad).json({
            msg:"Can only create a maximum of 3 Addresses, Please edit one of the previous address"
        })
    }

    const address = await AddressBook.create({
      user_id: req.user.uuid,
      uuid:nanoid(),
      firstName,
      lastName,
      phone,
      additional_phone:additionalPhone,
      city : 'Nigeria',
      country,
      region : "Nigeria",
      isDefault: countAll.count == 0
    });
    address.save();
    return res.status(mainConfig.status.ok).json({
      msg: "Address Created successfully",
      data: {
        id:address.get().id,
        firstName,
        lastName,
        phone,
        additional_phone:additionalPhone,
        city,
        country,
        region,
        isDefault: countAll.count == 0
      },
    });
  } catch (error) {
    return errorHandler(res, error);
  }
};
