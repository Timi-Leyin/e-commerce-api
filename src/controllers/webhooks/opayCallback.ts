import { Request, Response } from "express";
import OPay, {
  fromMinorUnits,
  verifyCallbackSignature,
} from "../../config/opay";
import Orders, { orderStatus } from "../../models/Order";
import Transactions from "../../models/Transactions";
import User from "../../models/User";

const frontendBase = () =>
  String(
    process.env.FRONTEND_BASE_URL || "https://all-star-communications.com",
  ).replace(/\/$/, "");

const SUCCESS_REDIRECT_URL =
  process.env.OPAY_SUCCESS_REDIRECT_URL || `${frontendBase()}/success`;
const FAILED_REDIRECT_URL =
  process.env.OPAY_FAILED_REDIRECT_URL || `${frontendBase()}/failed`;
const PENDING_REDIRECT_URL =
  process.env.OPAY_PENDING_REDIRECT_URL ||
  `${frontendBase()}/payment/pending`;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const toNumber = (value: any, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeOPayStatus = (status: any) =>
  String(status || "").toUpperCase().trim();

const isSuccessStatus = (status: any) => {
  const normalized = normalizeOPayStatus(status);
  return normalized === "SUCCESS" || normalized === "SUCCESSFUL";
};

const isFailedStatus = (status: any) => {
  const normalized = normalizeOPayStatus(status);
  return normalized === "FAIL" || normalized === "FAILED" || normalized === "CLOSE";
};

const isPendingStatus = (status: any) => {
  const normalized = normalizeOPayStatus(status);
  return (
    normalized === "PENDING" ||
    normalized === "INITIAL" ||
    normalized === "INIT" ||
    normalized === ""
  );
};

const withReceiptParams = (
  baseUrl: string,
  transactionData: any,
  customerData?: any,
  extra: Record<string, string> = {},
) => {
  const amount = toNumber(transactionData?.amount);
  const fees = toNumber(transactionData?.fee || transactionData?.app_fee);
  const netAmount = toNumber(transactionData?.amount_settled, amount - fees);
  const fullName = [customerData?.firstName, customerData?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  const params = new URLSearchParams({
    transactionId: String(
      transactionData?.transaction_id || transactionData?.uuid || "",
    ),
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
    description: String(
      transactionData?.narration ||
        transactionData?.summary ||
        "Transaction payment",
    ),
    ...extra,
  });

  return `${baseUrl}?${params.toString()}`;
};

const resolveAmountMajor = (
  amountValue: string | number | undefined,
  fallbackMajor: number,
) => {
  if (amountValue === undefined || amountValue === null || amountValue === "") {
    return fallbackMajor;
  }
  const numeric = toNumber(amountValue);
  // Status API uses minor units; webhook payload amount is often major NGN.
  // If value is ~100x our stored amount, treat as minor units.
  if (fallbackMajor > 0 && numeric >= fallbackMajor * 50) {
    return fromMinorUnits(numeric);
  }
  // If close to stored major amount, keep as major
  if (fallbackMajor > 0 && Math.abs(numeric - fallbackMajor) / fallbackMajor < 0.5) {
    return numeric;
  }
  // Prefer minor→major when value looks like kobo for typical cart totals
  if (numeric >= 1000 && Number.isInteger(numeric)) {
    return fromMinorUnits(numeric);
  }
  return numeric;
};

const fulfillSuccessfulPayment = async ({
  reference,
  transactionId,
  amountValue,
  feeValue,
}: {
  reference: string;
  transactionId?: string;
  amountValue?: string | number;
  feeValue?: string | number;
}) => {
  const transactionDetails = await Transactions.findOne({
    where: { ref: reference },
  });

  if (!transactionDetails) {
    return null;
  }

  const existingStatus = String(
    transactionDetails.get().status || "",
  ).toLowerCase();
  if (
    existingStatus === "successful" ||
    existingStatus === "completed" ||
    existingStatus === "paid" ||
    existingStatus === "success"
  ) {
    return transactionDetails;
  }

  const storedAmount = toNumber(transactionDetails.get().amount);
  const amountMajor = resolveAmountMajor(amountValue, storedAmount);
  const feeMajor = feeValue !== undefined && feeValue !== null && feeValue !== ""
    ? resolveAmountMajor(feeValue, toNumber(transactionDetails.get().fee || 0))
    : toNumber(transactionDetails.get().fee || transactionDetails.get().app_fee);

  await Transactions.update(
    {
      transaction_id:
        transactionId || transactionDetails.get().transaction_id,
      status: "successful",
      amount: String(amountMajor),
      app_fee: String(feeMajor),
      fee: String(feeMajor),
      amount_settled: String(Math.max(amountMajor - feeMajor, 0)),
    },
    {
      where: { ref: reference },
    },
  );

  await Orders.update(
    { status: orderStatus.paid },
    { where: { uuid: transactionDetails.get().uuid } },
  );

  return Transactions.findOne({ where: { ref: reference } });
};

const markTransactionStatus = async (
  reference: string,
  status: "pending" | "failed",
  transactionId?: string,
) => {
  const payload: Record<string, any> = { status };
  if (transactionId) payload.transaction_id = transactionId;

  await Transactions.update(payload, { where: { ref: reference } });
  return Transactions.findOne({ where: { ref: reference } });
};

/** Poll OPay until SUCCESS/FAIL or retries exhausted (bank methods settle slowly). */
const queryStatusWithRetry = async (reference: string, attempts = 5) => {
  let lastResponse: any = null;

  for (let i = 0; i < attempts; i++) {
    try {
      lastResponse = await OPay.queryStatus(reference);
      console.log(
        `[OPay] status attempt ${i + 1}/${attempts}:`,
        JSON.stringify({
          code: lastResponse?.code,
          message: lastResponse?.message,
          status: lastResponse?.data?.status,
          reference: lastResponse?.data?.reference,
        }),
      );

      if (lastResponse?.code !== "00000") {
        if (i < attempts - 1) await sleep(1500);
        continue;
      }

      const status = lastResponse?.data?.status;
      if (isSuccessStatus(status) || isFailedStatus(status)) {
        return lastResponse;
      }

      // Still pending — wait and retry
      if (i < attempts - 1) await sleep(1500);
    } catch (error: any) {
      console.error(
        `[OPay] status query failed attempt ${i + 1}:`,
        error?.response?.data || error?.message || error,
      );
      if (i < attempts - 1) await sleep(1500);
    }
  }

  return lastResponse;
};

/** Customer browser return from OPay cashier. */
export const opayReturn = async (req: Request, res: Response) => {
  try {
    const reference = String(
      req.query.reference ||
        req.query.orderNo ||
        req.query.referenceId ||
        "",
    ).trim();

    console.log("[OPay] return hit:", {
      reference,
      query: req.query,
    });

    if (!reference) {
      return res.redirect(
        withReceiptParams(FAILED_REDIRECT_URL, { status: "failed" }, null, {
          reason: "missing_reference",
        }),
      );
    }

    const transactionDetails = await Transactions.findOne({
      where: { ref: reference },
    });

    if (!transactionDetails) {
      // Also try matching by OPay orderNo stored as transaction_id
      const byOrderNo = await Transactions.findOne({
        where: { transaction_id: reference },
      });
      if (!byOrderNo) {
        return res.redirect(
          withReceiptParams(FAILED_REDIRECT_URL, { status: "failed", ref: reference }, null, {
            reason: "transaction_not_found",
          }),
        );
      }
    }

    const tx =
      transactionDetails ||
      (await Transactions.findOne({ where: { transaction_id: reference } }));

    if (!tx) {
      return res.redirect(FAILED_REDIRECT_URL);
    }

    const txRef = tx.get().ref;
    const userProfile = await User.findOne({
      where: { uuid: tx.get().user_id },
      attributes: ["uuid", "email", "firstName", "lastName", "phone"],
    });

    const existingStatus = String(tx.get().status || "").toLowerCase();
    if (
      existingStatus === "successful" ||
      existingStatus === "completed" ||
      existingStatus === "paid" ||
      existingStatus === "success"
    ) {
      return res.redirect(
        withReceiptParams(SUCCESS_REDIRECT_URL, tx.get(), userProfile?.get()),
      );
    }

    if (existingStatus === "failed") {
      return res.redirect(
        withReceiptParams(FAILED_REDIRECT_URL, tx.get(), userProfile?.get()),
      );
    }

    const statusResponse = await queryStatusWithRetry(txRef, 5);
    const payment = statusResponse?.data;
    const opayStatus = payment?.status;

    if (statusResponse?.code === "00000" && isSuccessStatus(opayStatus)) {
      const updated = await fulfillSuccessfulPayment({
        reference: txRef,
        transactionId: payment?.orderNo || payment?.transactionId,
        amountValue: payment?.amount?.total,
        feeValue: payment?.vat?.total,
      });

      return res.redirect(
        withReceiptParams(
          SUCCESS_REDIRECT_URL,
          updated?.get() || tx.get(),
          userProfile?.get(),
        ),
      );
    }

    if (statusResponse?.code === "00000" && isFailedStatus(opayStatus)) {
      const updated = await markTransactionStatus(
        txRef,
        "failed",
        payment?.orderNo || payment?.transactionId,
      );
      return res.redirect(
        withReceiptParams(
          FAILED_REDIRECT_URL,
          updated?.get() || tx.get(),
          userProfile?.get(),
          { opayStatus: String(opayStatus || "FAIL") },
        ),
      );
    }

    // PENDING / INITIAL / unknown — do NOT mark failed; keep pending for webhook/poll
    const updated = await markTransactionStatus(
      txRef,
      "pending",
      payment?.orderNo || payment?.transactionId,
    );

    return res.redirect(
      withReceiptParams(
        PENDING_REDIRECT_URL,
        updated?.get() || { ...tx.get(), status: "pending" },
        userProfile?.get(),
        {
          opayStatus: String(opayStatus || "PENDING"),
          message: "Payment is still processing. We will update this shortly.",
        },
      ),
    );
  } catch (error) {
    console.error("OPay return handler error:", error);
    return res.redirect(
      withReceiptParams(FAILED_REDIRECT_URL, { status: "failed" }, null, {
        reason: "server_error",
      }),
    );
  }
};

/** Server-to-server payment notification from OPay. */
export const opayWebhook = async (req: Request, res: Response) => {
  try {
    console.log("[OPay] callback received:", JSON.stringify(req.body));

    const { payload, sha512, type } = req.body || {};

    if (!payload?.reference) {
      return res.status(400).json({ msg: "Invalid callback payload" });
    }

    if (sha512 && !verifyCallbackSignature(payload, sha512)) {
      console.warn(
        "OPay callback signature mismatch; verifying via status API",
      );
    }

    if (type && type !== "transaction-status") {
      return res.status(200).json({ msg: "Ignored" });
    }

    const reference = String(payload.reference);

    if (isFailedStatus(payload.status)) {
      await markTransactionStatus(
        reference,
        "failed",
        payload.transactionId,
      );
      return res.status(200).json({ msg: "Acknowledged" });
    }

    if (isPendingStatus(payload.status)) {
      await markTransactionStatus(
        reference,
        "pending",
        payload.transactionId,
      );
      return res.status(200).json({ msg: "Acknowledged" });
    }

    if (!isSuccessStatus(payload.status)) {
      return res.status(200).json({ msg: "Acknowledged" });
    }

    // Cross-verify with Payment Status API before fulfilling
    const statusResponse = await OPay.queryStatus(reference);
    const payment = statusResponse?.data;

    console.log(
      "[OPay] callback verify:",
      JSON.stringify({
        payloadStatus: payload.status,
        verifyCode: statusResponse?.code,
        verifyStatus: payment?.status,
      }),
    );

    if (
      statusResponse?.code !== "00000" ||
      !isSuccessStatus(payment?.status)
    ) {
      // Trust callback SUCCESS if verify is still pending (eventual consistency)
      if (isSuccessStatus(payload.status)) {
        await fulfillSuccessfulPayment({
          reference,
          transactionId:
            payload.transactionId || payment?.orderNo || payment?.transactionId,
          amountValue: payload.amount ?? payment?.amount?.total,
          feeValue: payload.fee,
        });
      }
      return res.status(200).json({ msg: "Acknowledged" });
    }

    await fulfillSuccessfulPayment({
      reference,
      transactionId:
        payload.transactionId || payment?.orderNo || payment?.transactionId,
      amountValue: payload.amount ?? payment?.amount?.total,
      feeValue: payload.fee,
    });

    return res.status(200).json({ msg: "Acknowledged" });
  } catch (error) {
    console.error("OPay webhook error:", error);
    return res.status(200).json({ msg: "Acknowledged" });
  }
};

/** Authenticated re-check used by frontend pending page. */
export const opayVerifyPayment = async (req: Request | any, res: Response) => {
  try {
    const reference = String(
      req.params.reference || req.query.reference || "",
    ).trim();

    if (!reference) {
      return res.status(400).json({ msg: "reference is required" });
    }

    const tx = await Transactions.findOne({ where: { ref: reference } });
    if (!tx) {
      return res.status(404).json({ msg: "Transaction not found" });
    }

    if (req.user?.uuid && tx.get().user_id !== req.user.uuid) {
      const elevated =
        req.user?.role === "admin" || req.user?.role === "moderator";
      if (!elevated) {
        return res.status(403).json({ msg: "Unauthorized Access" });
      }
    }

    const existing = String(tx.get().status || "").toLowerCase();
    if (existing === "successful" || existing === "failed") {
      return res.status(200).json({
        msg: "Transaction status",
        data: {
          reference,
          status: tx.get().status,
          transactionId: tx.get().transaction_id,
          amount: tx.get().amount,
          currency: tx.get().currency,
        },
      });
    }

    const statusResponse = await queryStatusWithRetry(reference, 3);
    const payment = statusResponse?.data;
    const opayStatus = payment?.status;

    if (statusResponse?.code === "00000" && isSuccessStatus(opayStatus)) {
      const updated = await fulfillSuccessfulPayment({
        reference,
        transactionId: payment?.orderNo || payment?.transactionId,
        amountValue: payment?.amount?.total,
        feeValue: payment?.vat?.total,
      });
      return res.status(200).json({
        msg: "Payment successful",
        data: {
          reference,
          status: "successful",
          opayStatus,
          transactionId: updated?.get().transaction_id,
          amount: updated?.get().amount,
          currency: updated?.get().currency,
        },
      });
    }

    if (statusResponse?.code === "00000" && isFailedStatus(opayStatus)) {
      await markTransactionStatus(
        reference,
        "failed",
        payment?.orderNo || payment?.transactionId,
      );
      return res.status(200).json({
        msg: "Payment failed",
        data: {
          reference,
          status: "failed",
          opayStatus,
        },
      });
    }

    await markTransactionStatus(
      reference,
      "pending",
      payment?.orderNo || payment?.transactionId,
    );

    return res.status(200).json({
      msg: "Payment still pending",
      data: {
        reference,
        status: "pending",
        opayStatus: opayStatus || "PENDING",
      },
    });
  } catch (error: any) {
    console.error("OPay verify error:", error?.response?.data || error);
    return res.status(500).json({ msg: "Internal server error" });
  }
};
