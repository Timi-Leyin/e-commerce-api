import { Request, Response } from "express";
import errorHandler from "../../utils/errorHandler";
import Transactions from "../../models/Transactions";
import { flw } from "../../utils/flutterwaveTransfer";
import Orders, { orderStatus } from "../../models/Order";
import User from "../../models/User";
import sendWhatsAppText from "../../utils/sendWhatsAppImage";

const SUCCESS_REDIRECT_URL =
  process.env.FLUTTERWAVE_SUCCESS_REDIRECT_URL ||
  "https://all-star-communications.com/success";
const FAILED_REDIRECT_URL =
  process.env.FLUTTERWAVE_FAILED_REDIRECT_URL ||
  "https://all-star-communications.com/failed";

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

    const existingStatus = String(transactionDetails.get().status || "").toLowerCase();
    if (
      existingStatus === "successful" ||
      existingStatus === "completed" ||
      existingStatus === "paid"
    ) {
      return res.redirect(SUCCESS_REDIRECT_URL);
    }

    let flw_verify;
    try {
      flw_verify = await flw.Transaction.verify({
        id: req.query.transaction_id,
      });
    } catch (verifyError: any) {
      const rawMessage =
        verifyError?.response?.data?.message ||
        verifyError?.response?.data?.msg ||
        verifyError?.message ||
        "";
      const normalizedMessage = String(rawMessage).toLowerCase();

      if (normalizedMessage.includes("already verified")) {
        return res.redirect(SUCCESS_REDIRECT_URL);
      }

      throw verifyError;
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

    // Fetch buyer info
    const userProfile = await User.findOne({
      where: { uuid: transactionDetails.get().user_id },
      attributes: ["email"],
    });

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
    const itemsDescription = orderData
      .map((item: any, index: number) => {
        return `${index + 1}. ${item.product_name} | Qty: ${
          item.quantity
        } | ₦${item.price}`;
      })
      .join("\n");

    const adminMessage = `
              🛒 NEW STORE ORDER

              Customer: ${userProfile?.get().email}
              Order ID: ${transactionDetails.get().uuid}
              Amount Paid: ₦${flw_verify.data.amount}

              Items:
              ${itemsDescription}

              Please process this order.
`;

    // Send WhatsApp notification to admin
    try {
      await sendWhatsAppText(adminMessage);
    } catch (err) {
      console.error("WhatsApp admin notification failed:", err);
    }

    return res.redirect(SUCCESS_REDIRECT_URL);
  } catch (error) {
    console.error(error);
    return res.redirect(FAILED_REDIRECT_URL);
  }
};
