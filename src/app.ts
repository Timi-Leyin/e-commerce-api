import { record } from "@logdrop/node";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import path from "path";
import morgan from "morgan";
import mainConfig from "./config/main";
import authRoutes from "./routes/authRoutes";
import errors from "./middlewares/errors";
import userRoutes from "./routes/userRoutes";
import session from "express-session";
import passport from "passport";

// main code logic
const app = express();

const logDrop = record(process.env.LOGDROP_API_KEY as string);

// middlewares
app.use(cors({ origin: mainConfig.origin }));
app.disable("x-powered-by");
app.use(express.static(path.join(__dirname, "../public")));
app.use(helmet());
app.use(
  express.urlencoded({
    extended: true,
    limit: mainConfig.limit,
    parameterLimit: mainConfig.parameterLimit,
  })
);
app.use(express.json({ limit: mainConfig.limit }));
process.env.NODE_ENV == "production" && app.use(logDrop);

app.use(morgan("dev"));
// passport JS
app.use(
  session({
    secret: process.env.SESSION_SECRET as string,
    resave: true,
    saveUninitialized: true,
  })
);
app.use(passport.initialize());
app.use(passport.session());
import "./config/google-passport";
import sellerRoute from "./routes/sellerRoute";
import productRoutes from "./routes/productRoutes";
import cartRoutes from "./routes/cartRoutes";
import webhooksRoutes from "./routes/webhooks";
import generalRoutes from "./routes/generalRoutes";
import addressBookRoutes from "./routes/addressBookRoutes";
import addWaitlist from "./controllers/waitlist";
import { validationError, waitlistValidator } from "./middlewares/validator";
import adminRoutes from "./routes/adminRoute";
import { generateRandomProducts } from "./edge-cases/products";
import verifyAdmin from "./middlewares/verifyAdmin";
import verifyToken from "./middlewares/verifyToken";
import ordersRoutes from "./routes/ordersRoutes";
import transactionsRoutes from "./routes/transactionsRoutes";
import confirmOrderReceived from "./controllers/orders/confirmOrderReceived";

app.get("/", (_, res) => {
  res.send("Welcome to All Stars solutions 😁");
});
// generateRandomProducts()
app.post("/waitlist", waitlistValidator, validationError, addWaitlist);
app.use("/others/", generalRoutes);
app.use("/address/", addressBookRoutes);
app.use("/auth/", authRoutes);
app.use("/user/", userRoutes);
app.get("/order/confirm-received", confirmOrderReceived);
app.use("/order", verifyToken, ordersRoutes);
app.use("/admin", verifyToken, verifyAdmin, adminRoutes);
app.use("/product", productRoutes);
app.use("/cart", cartRoutes);
app.use("/webhooks", webhooksRoutes);
app.use("/api/v1/transactions", transactionsRoutes);
// error rotes
app.use(errors);
export default app;
