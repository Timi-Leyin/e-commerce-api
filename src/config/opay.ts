import axios from "axios";
import crypto from "crypto";
import { nanoid } from "nanoid";
import Transactions from "../models/Transactions";
import { PaymentLinkType } from "../types/config";

const getBaseUrl = () => {
  if (process.env.OPAY_BASE_URL) {
    return process.env.OPAY_BASE_URL.replace(/\/$/, "");
  }

  return String(process.env.OPAY_ENV || "sandbox").toLowerCase() === "live"
    ? "https://liveapi.opaycheckout.com"
    : "https://testapi.opaycheckout.com";
};

/** OPay expects amount in minor units (kobo for NGN). */
export const toMinorUnits = (amount: string | number) =>
  Math.round(Number(amount) * 100);

export const fromMinorUnits = (amount: string | number) =>
  Number(amount) / 100;

export const signRequestBody = (payloadJson: string) =>
  crypto
    .createHmac("sha512", String(process.env.OPAY_SECRET_KEY || ""))
    .update(payloadJson)
    .digest("hex");

export const verifyCallbackSignature = (
  payload: Record<string, any>,
  sha512: string,
) => {
  const secret = String(process.env.OPAY_SECRET_KEY || "");
  if (!secret || !sha512) return false;

  const payloadJson = JSON.stringify(payload);
  const expected = crypto
    .createHmac("sha3-512", secret)
    .update(payloadJson)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(String(sha512)),
    );
  } catch {
    return expected === String(sha512);
  }
};

class OPay {
  static async PaymentLink({
    tx_ref = nanoid(40),
    amount,
    currency,
    meta,
    uuid,
    customer,
    user_id,
  }: PaymentLinkType) {
    try {
      const merchantId = process.env.OPAY_MERCHANT_ID;
      const publicKey = process.env.OPAY_PUBLIC_KEY;
      const backendBase = String(process.env.BACKEND_BASE_URL || "").replace(
        /\/$/,
        "",
      );
      const frontendBase = String(
        process.env.FRONTEND_BASE_URL || "https://all-star-communications.com",
      ).replace(/\/$/, "");

      if (!merchantId || !publicKey) {
        console.error("Missing OPay merchant configuration.");
        return;
      }

      const body = {
        country: "NG",
        reference: tx_ref,
        amount: {
          total: toMinorUnits(amount),
          currency: currency || "NGN",
        },
        returnUrl: `${backendBase}/webhooks/opay/return?reference=${encodeURIComponent(
          tx_ref,
        )}`,
        callbackUrl: `${backendBase}/webhooks/opay/callback`,
        cancelUrl:
          process.env.OPAY_FAILED_REDIRECT_URL || `${frontendBase}/failed`,
        customerVisitSource: "BROWSER",
        expireAt: 30,
        userInfo: {
          userEmail: customer?.email,
          userId: String(user_id || ""),
          userMobile: customer?.phone,
          userName: customer?.name,
        },
        product: {
          name: "Order Payment",
          description: String(meta?.summary || "Checkout payment").slice(0, 120),
        },
      };

      const response = await axios.post(
        `${getBaseUrl()}/api/v1/international/cashier/create`,
        body,
        {
          headers: {
            Authorization: `Bearer ${publicKey}`,
            MerchantId: merchantId,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.data?.code === "00000" && response.data?.data?.cashierUrl) {
        const tx = await Transactions.create({
          user_id,
          uuid,
          type: "opay",
          amount,
          summary: meta?.summary,
          currency,
          ref: tx_ref,
          transaction_id: response.data.data.orderNo,
          status: "pending",
        });
        await tx.save();

        return {
          data: {
            link: response.data.data.cashierUrl,
            orderNo: response.data.data.orderNo,
            reference: response.data.data.reference,
            status: response.data.data.status,
          },
        };
      }

      console.error("OPay create payment failed:", response.data);
      return;
    } catch (error: any) {
      console.error(
        "OPay PaymentLink error:",
        error?.response?.data || error?.message || error,
      );
      return;
    }
  }

  static async queryStatus(reference: string) {
    const merchantId = process.env.OPAY_MERCHANT_ID;
    const secretKey = process.env.OPAY_SECRET_KEY;

    if (!merchantId || !secretKey) {
      throw new Error("Missing OPay status query configuration.");
    }

    const body = {
      country: "NG",
      reference,
    };
    const payloadJson = JSON.stringify(body);
    const signature = signRequestBody(payloadJson);

    const response = await axios.post(
      `${getBaseUrl()}/api/v1/international/cashier/status`,
      body,
      {
        headers: {
          Authorization: `Bearer ${signature}`,
          MerchantId: merchantId,
          "Content-Type": "application/json",
        },
      },
    );

    return response.data;
  }
}

export default OPay;
