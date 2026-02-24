import { Request, Response } from "express";
import mainConfig from "../../config/main";
import Transactions from "../../models/Transactions";
import User from "../../models/User";
import errorHandler from "../../utils/errorHandler";

const toNumber = (value: any, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeStatus = (status: any) => String(status || "").toLowerCase();

const canAccessTransaction = (req: Request | any, userId: string) => {
  const requesterId = req.user?.uuid;
  const requesterRole = req.user?.role;
  const elevatedRole = requesterRole === "admin" || requesterRole === "moderator";
  return elevatedRole || requesterId === userId;
};

const formatTransactionResponse = (txData: any, customer: any) => {
  const amount = toNumber(txData.amount);
  const fees = toNumber(txData.fee || txData.app_fee);
  const netAmount = toNumber(txData.amount_settled, amount - fees);
  const status = normalizeStatus(txData.status);
  const paidAt =
    status === "successful" || status === "completed" || status === "paid"
      ? txData.updatedAt
      : null;

  return {
    transactionId: txData.transaction_id || txData.uuid,
    reference: txData.ref,
    amount,
    currency: txData.currency,
    status: txData.status,
    paymentChannel: txData.type,
    fees,
    netAmount,
    customerEmail: customer?.email || null,
    customer: {
      uuid: customer?.uuid || null,
      firstName: customer?.firstName || null,
      lastName: customer?.lastName || null,
      phone: customer?.phone || null,
      email: customer?.email || null,
    },
    description: txData.narration || txData.summary || "Transaction payment",
    createdAt: txData.createdAt,
    paidAt,
  };
};

const getTransactionByFilter = async (
  req: Request | any,
  res: Response,
  where: Record<string, any>,
) => {
  try {
    if (!req.user?.uuid) {
      return res.status(mainConfig.status.unauthorized).json({
        msg: "Unauthorized",
      });
    }

    const transaction = await Transactions.findOne({ where });

    if (!transaction) {
      return res.status(mainConfig.status.notFound).json({
        msg: "Transaction not found",
      });
    }

    const txData = transaction.get();

    if (!canAccessTransaction(req, txData.user_id)) {
      return res.status(mainConfig.status.forbidden).json({
        msg: "Unauthorized Access",
      });
    }

    const customer = await User.findOne({
      where: { uuid: txData.user_id },
      attributes: ["uuid", "firstName", "lastName", "phone", "email"],
    });

    const payload = formatTransactionResponse(txData, customer?.get());

    return res.status(mainConfig.status.ok).json({
      msg:
        normalizeStatus(txData.status) === "failed"
          ? "Transaction Retrieved (Failed)"
          : "Transaction Retrieved",
      data: payload,
    });
  } catch (error) {
    return errorHandler(res, error);
  }
};

export const getTransactionById = async (req: Request | any, res: Response) => {
  const { transactionId } = req.params;

  return getTransactionByFilter(req, res, {
    transaction_id: transactionId,
  });
};

export const getTransactionByReference = async (req: Request | any, res: Response) => {
  const { reference } = req.params;

  return getTransactionByFilter(req, res, {
    ref: reference,
  });
};
