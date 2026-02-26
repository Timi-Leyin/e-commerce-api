import { Request, Response } from "express";
import errorHandler from "../../utils/errorHandler";
import Transactions from "../../models/Transactions";
import { flw } from "../../utils/flutterwaveTransfer";
import Orders, { orderStatus } from "../../models/Order";
import User from "../../models/User";
import sendWhatsAppText from "../../utils/sendWhatsAppImage";

const SUCCESS_REDIRECT_URL =
  process.env.FLUTTERWAVE_SUCCESS_REDIRECT_URL ||
  `${String(process.env.FRONTEND_BASE_URL || "https://all-star-communications.com").replace(/\/$/, "")}/success`;
const FAILED_REDIRECT_URL =
  process.env.FLUTTERWAVE_FAILED_REDIRECT_URL ||
  `${String(process.env.FRONTEND_BASE_URL || "https://all-star-communications.com").replace(/\/$/, "")}/failed`;

const toNumber = (value: any, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const naira = (value: number) => `₦${toNumber(value).toLocaleString("en-NG")}`;

const toAbsoluteUrl = (url: string) => {
  const value = String(url || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;

  const backendBaseUrl = String(process.env.BACKEND_BASE_URL || "").replace(/\/$/, "");
  if (!backendBaseUrl) return "";

  return `${backendBaseUrl}${value.startsWith("/") ? "" : "/"}${value}`;
};

const withReceiptParams = (
  baseUrl: string,
  transactionData: any,
  customerData?: any,
) => {
  const amount = toNumber(transactionData?.amount);
  const fees = toNumber(transactionData?.fee || transactionData?.app_fee);
  const netAmount = toNumber(transactionData?.amount_settled, amount - fees);
  const fullName = [customerData?.firstName, customerData?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  const params = new URLSearchParams({
    transactionId: String(transactionData?.transaction_id || transactionData?.uuid || ""),
    reference: String(transactionData?.ref || ""),
    amount: String(amount),
    currency: String(transactionData?.currency || ""),
    status: String(transactionData?.status || ""),
    paymentMethod: String(transactionData?.type || ""),
    paymentChannel: String(transactionData?.type || ""),
    fees: String(fees),
    netAmount: String(netAmount),
    paidAt: String(transactionData?.updatedAt || ""),
    customerEmail: String(customerData?.email || ""),
    customerName: fullName,
    customerPhone: String(customerData?.phone || ""),
    description: String(transactionData?.narration || transactionData?.summary || "Transaction payment"),
  });

  return `${baseUrl}?${params.toString()}`;
};

export default async (req: Request, res: Response) => {
  try {
    if (req.query.status !== "completed" && req.query.status !== "successful") {
      return res.redirect(FAILED_REDIRECT_URL);
    }

    const transactionDetails = await Transactions.findOne({
      where: { ref: req.query.tx_ref },
    });

    if (!transactionDetails) {
      return res.redirect(FAILED_REDIRECT_URL);
    }

    const userProfile = await User.findOne({
      where: { uuid: transactionDetails.get().user_id },
      attributes: ["uuid", "email", "firstName", "lastName", "phone"],
    });

    const existingStatus = String(transactionDetails.get().status || "").toLowerCase();
    if (
      existingStatus === "successful" ||
      existingStatus === "completed" ||
      existingStatus === "paid"
    ) {
      return res.redirect(
        withReceiptParams(SUCCESS_REDIRECT_URL, transactionDetails.get(), userProfile?.get()),
      );
    }

    let flw_verify;
    try {
      flw_verify = await flw.Transaction.verify({
        id: req.query.transaction_id,
      });
    } catch (verifyError: any) {
      const responseStatus = Number(verifyError?.response?.status || 0);
      const rawMessage =
        verifyError?.response?.data?.message ||
        verifyError?.response?.data?.msg ||
        verifyError?.message ||
        "";
      const normalizedMessage = String(rawMessage).toLowerCase();

      if (normalizedMessage.includes("already verified")) {
        const latestTransaction = await Transactions.findOne({
          where: { ref: req.query.tx_ref },
        });
        return res.redirect(
          withReceiptParams(
            SUCCESS_REDIRECT_URL,
            latestTransaction?.get() || transactionDetails.get(),
            userProfile?.get(),
          ),
        );
      }

      if (responseStatus >= 500) {
        flw_verify = {
          status: "success",
          data: {
            id: req.query.transaction_id,
            status: String(req.query.status || "successful"),
            amount: transactionDetails.get().amount,
            app_fee: transactionDetails.get().app_fee,
            amount_settled: transactionDetails.get().amount_settled,
            ip: transactionDetails.get().ip,
          },
        };
      } else {
        throw verifyError;
      }
    }

    if (flw_verify.status !== "success") {
      return res.redirect(FAILED_REDIRECT_URL);
    }

    // Update transaction
    await Transactions.update(
      {
        transaction_id: flw_verify.data.id,
        status: flw_verify.data.status,
        amount: flw_verify.data.amount,
        app_fee: flw_verify.data.app_fee,
        amount_settled: flw_verify.data.amount_settled,
        ip: flw_verify.data.ip,
      },
      {
        where: { ref: req.query.tx_ref },
      },
    );

    // Update order status
    await Orders.update(
      { status: orderStatus.paid },
      { where: { uuid: transactionDetails.get().uuid } },
    );

    // Fetch order
    const order = await Orders.findOne({
      where: { uuid: transactionDetails.get().uuid },
    });

    const rawOrderData = order?.get().order_data;
    const orderData =
      typeof rawOrderData === "string"
        ? JSON.parse(rawOrderData)
        : rawOrderData;

    // Build admin message
    const itemsDescription = (Array.isArray(orderData) ? orderData : [])
      .map((item: any, index: number) => {
        const quantity = Number(item?.quantity || 1);
        const singlePrice = toNumber(item?.singlePrice, Number.NaN);
        const totalPrice = toNumber(item?.totalPrice, Number.NaN);
        const fallbackPrice = quantity > 0 ? totalPrice / quantity : totalPrice;
        const displayPrice = Number.isFinite(singlePrice)
          ? singlePrice
          : Number.isFinite(fallbackPrice)
            ? fallbackPrice
            : 0;
        const lineTotal = Number.isFinite(totalPrice)
          ? totalPrice
          : displayPrice * quantity;

        return `${index + 1}) ${item.product_name}\n   Qty: ${quantity} × ${naira(displayPrice)} = ${naira(lineTotal)}`;
      })
      .join("\n");

    const productImageUrls = Array.from(
      new Set(
        (Array.isArray(orderData) ? orderData : [])
          .map((item: any) => toAbsoluteUrl(item?.product_image || ""))
          .filter(Boolean),
      ),
    );

    const adminMessage = [
      "🛒 *NEW STORE ORDER*",
      "",
      `👤 Customer: ${userProfile?.get().email || "N/A"}`,
      `🧾 Order ID: ${transactionDetails.get().uuid}`,
      `💳 Amount Paid: ${naira(Number(flw_verify.data.amount || 0))}`,
      "",
      "📦 *Items*",
      itemsDescription || "No items found",
      "",
      "✅ Please process this order.",
    ].join("\n");

    const templateVariables = {
      "1": transactionDetails.get().uuid,
      "2": `${naira(Number(flw_verify.data.amount || 0))} | ${
        Array.isArray(orderData) ? orderData.length : 0
      } item(s)`,
      "3": userProfile?.get().email || "N/A",
      "4": itemsDescription || "No items found",
    };

    // Send WhatsApp notification to admin
    try {
      await sendWhatsAppText(adminMessage, productImageUrls, templateVariables);
    } catch (err) {
      console.error("WhatsApp admin notification failed:", err);
    }

    const updatedTransaction = await Transactions.findOne({
      where: { ref: req.query.tx_ref },
    });

    return res.redirect(
      withReceiptParams(
        SUCCESS_REDIRECT_URL,
        updatedTransaction?.get() || transactionDetails.get(),
        userProfile?.get(),
      ),
    );
  } catch (error) {
    console.error(error);
    return res.redirect(FAILED_REDIRECT_URL);
  }
};
