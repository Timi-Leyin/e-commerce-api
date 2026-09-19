import { NextFunction, Request, Response } from "express";
import errorHandler from "../utils/errorHandler";
import multer from "multer";
import path from "path";
import mainConfig from "../config/main";

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(process.cwd(), "/uploads"));
  },
  filename: (_req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

export const productImages = upload.fields([
  { name: "thumbnail", maxCount: 1 },
  { name: "other_images", maxCount: 4 },
]);

export const newProductMulterHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    productImages(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ msg: "File Error: " + err.message });
      } else if (err) {
        return errorHandler(res, err);
      }
      return next();
    });
  } catch (error) {
    return errorHandler(res, error);
  }
};
