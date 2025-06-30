import { Request, Response } from "express";
import errorHandler from "../../utils/errorHandler";
import Transactions from "../../models/Transactions";
import { flw } from "../../utils/flutterwaveTransfer";
import mainConfig from "../../config/main";
import Orders, { orderStatus } from "../../models/Order";
import sendNotification from "../../utils/sendNotification";
import { NotificationType } from "../../models/Notification";
import User from "../../models/User";

export default async (req: Request, res: Response) => {
  try {
    if (req.query.status === "completed" || req.query.status == "successful") {
      const transactionDetails = await Transactions.findOne({
        where: {
          ref: req.query.tx_ref,
        },
      });

      if (!transactionDetails) {
        return res.status(mainConfig.status.notFound).json({
          msg: "Transaction not Found | Checkout Again",
        });
      }
      if (transactionDetails.get().status == "successful") {
        return res.status(mainConfig.status.conflict).json({
          msg: "Transaction already verified",
        });
      }

      // console.log(transactionDetails.get())

      const flw_verify = await flw.Transaction.verify({
        id: req.query.transaction_id,
      });
      if (flw_verify.status == "success") {
        // console.log(flw_verify)
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
            where: {
              ref: req.query.tx_ref,
            },
          }
        );
        console.log(transactionDetails.get().uuid);
        // update order status
        await Orders.update(
          {
            status: orderStatus.paid, //pending confirmation
          },
          {
            where: {
              uuid: transactionDetails.get().uuid,
            },
          }
        );
        // send notification to seller

        const userProfile = await User.findOne({
          where: {
            uuid: transactionDetails.get().user_id,
          },
          attributes: ["email", "uuid"],
        });

        // get order details
        const orders = await Orders.findOne({
          where: {
            uuid: transactionDetails.get().uuid,
          },
        });

        const raw_order_data = orders?.get().order_data;

        const order_data =
          typeof raw_order_data == "string"
            ? JSON.parse(raw_order_data)
            : raw_order_data;

        // sending notification start
        order_data.forEach(async (data) => {
          await sendNotification({
            type: NotificationType.transaction,
            title: "A new Transaction has been made",
            body: `${
              userProfile?.get().email
            } Transaction for an Order is Successful`,
            ref: {
              transaction_id: transactionDetails.get().uuid,
              user_id: userProfile?.get().uuid,
            },
            to: data.seller_id,
          });
        });

        // sending notification end

        return res.status(mainConfig.status.ok).json({
          msg: "Transaction Completed",
        });
      }
      console.log(flw_verify);
      return res.status(mainConfig.status.bad).json({
        msg: "Transaction could not be completed",
      });
    }
    res.redirect("https://all-star-communications.com/failed")
    // res.end();
  } catch (error) {
    console.log(error);
    return errorHandler(res, error);
  }
};
