import mainConfig from "../../config/main";
import { Request, Response } from "express";
import errorHandler from "../../utils/errorHandler";
import User, { ROLE } from "../../models/User";

const getAllUsers = async (req: any, res: Response) => {
  try {
    const itemsPerPage = Number(
      Math.min(Number(req.query.limit || 10), mainConfig.MAX_LIMIT),
    );
    const currentPage = Math.max(Number(req.query.page || 1), 1);
    const offset = (currentPage - 1) * itemsPerPage;

    const users = await User.findAndCountAll({
      where: {
        role: ROLE.user,
      },
      attributes: [
        "uuid",
        "username",
        "firstName",
        "lastName",
        "phone",
        "email",
        "role",
        "restricted",
        "lastLogin",
        "avatar",
        "verified",
      ],
      limit: itemsPerPage,
      offset,
      order: [["createdAt", "DESC"]],
    });

    const usersData = users.rows.map((user) => {
      const userData = user.get();
      return {
        ...userData,
        role: userData.role === ROLE.user ? "USER" : "ADMIN",
      };
    });

    const totalPages = Math.ceil(users.count / itemsPerPage);

    return res.status(mainConfig.status.ok).json({
      msg: "users Rerieved",
      data: {
        limit: itemsPerPage,
        currentPage,
        totalPages,
        totalItems: users.count,
        users: usersData,
      },
    });
  } catch (error) {
    return errorHandler(res, error);
  }
};

export default getAllUsers;
