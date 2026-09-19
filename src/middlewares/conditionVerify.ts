import { NextFunction, Response } from "express";
import { IRequest } from "../types/express";
import { verify } from "../utils/token";
import User from "../models/User";

/**
 * Optional auth: attaches req.user when a valid token is present.
 * Never blocks the request — invalid/expired/missing tokens just continue anonymously.
 */
export default async (
  req: IRequest | any,
  res: Response,
  next: NextFunction,
) => {
  try {
    const AuthHeader = req.headers.authorization;
    if (!AuthHeader) {
      return next();
    }

    const [bearer, token] = AuthHeader.split(" ");
    if (!bearer || !token || bearer.toLowerCase() !== "bearer") {
      return next();
    }

    let jwt: any = null;
    try {
      jwt = await verify(token);
    } catch {
      return next();
    }

    if (!jwt?._id) {
      return next();
    }

    const user = await User.findOne({
      where: {
        uuid: jwt._id,
      },
    });

    if (!user) {
      return next();
    }

    const data = user.get();
    req.user = {
      username: data.username,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      email: data.email,
      _2FA: data._2FA,
      locale: data.locale,
      avatar: !data.avatarId
        ? process.env.BACKEND_BASE_URL + data.avatar
        : data.avatar,
      lastLogin: data.lastLogin,
      createdAt: data.createdAt,
      verified: data.verified,
      isSeller: data.isSeller,
      uuid: data.uuid,
    };

    return next();
  } catch {
    // Public routes must never fail because of auth parsing
    return next();
  }
};
