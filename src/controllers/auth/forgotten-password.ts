import { Request, Response } from "express";
import User from "../../models/User";
import mainConfig from "../../config/main";
import Token from "../../models/Token";
import sendEmail from "../../utils/sendEmail";
import { nanoid } from "nanoid";
import errorHandler from "../../utils/errorHandler";

const forgottenPassword = async (req: Request, res: Response) => {
  const { email } = req.body;
  try {
    const email_ex = await User.findOne({
      where: {
        email,
      },
    });

    if (!email_ex) {
      return res.status(mainConfig.status.notFound).json({
        msg: "No Account with Associated Email",
      });
    }

    await Token.destroy({
      where: {
        user_id: email_ex.get().uuid,
        type: "reset",
      },
    });

    //   generate token
    const token = nanoid(30);
    const tk = await Token.create({
      uuid:nanoid(35),
      type: "reset",
      token,
      user_id: email_ex.get().uuid,
    });

    const tk_db = tk.get();
    const LINK = `${process.env.FRONTEND_BASE_URL}/auth/verify?token=${tk_db.token}&type=${tk_db.type}`;
    await sendEmail({
      to: email_ex.get().email,
      subject: "Reset Your Password",
      path: "src/emails/reset-password.ejs",
      data: {
        URL: process.env.BACKEND_BASE_URL,
        LINK,
        name: email_ex.get().email.split("@")[0],
      },
    }).catch(() => console.log("NODEMAILER ERROR"));

    return res.status(mainConfig.status.ok).json({
      msg: "Link Sent to Email",
    });
  } catch (error) {
    return errorHandler(res, error);
  }
};

export default forgottenPassword;
