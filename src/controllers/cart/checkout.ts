import { Request, Response } from "express";
import errorHandler from "../../utils/errorHandler";
import OPay from "../../config/opay";
import mainConfig from "../../config/main";
import Cart from "../../models/Cart";
import { fetchCart } from "../../utils/carts";
import Product from "../../models/Product";
import getProducts from "../products/getProducts";
import { nanoid } from "nanoid";
import Orders from "../../models/Order";
import { randomID } from "../../utils/numbers";
import AddressBook from "../../models/AddressBook";

export default async (req: Request | any, res: Response) => {
  try {
    const carts = await fetchCart(req, "all");

    if (!carts || carts.length == 0) {
      return res.status(mainConfig.status.bad).json({
        msg: "Cart is Empty",
      });
    }

    let cart_details_str = "";
    // get all carts information and calculate total price
    const cart_items = carts.map(async (cart) => {
      let totalPrice = 0;
      const cart_details = cart.get();
      const get_product = await Product.findOne({
        where: {
          uuid: cart_details.product_id,
        },
      });

      if (get_product) {
        const product_details = get_product?.get();
        totalPrice += Number(product_details.price) * cart_details.quantity;
        cart_details_str += `${cart_details.quantity} ${product_details.name} for ${product_details.currency} ${totalPrice}, `;
        return {
          product_id: cart_details.product_id,
          seller_id: product_details.seller_id,
          product_name: product_details.name,
          product_image: product_details.thumbnail,
          quantity: cart_details.quantity,
          confirmed: false,
          ready: false,
          totalPrice,
          singlePrice: Number(product_details.price),
          currency: product_details.currency,
        };
      }
    });

    const all_cart = await Promise.all(cart_items.map((e) => e));
    let all_cart_sum = 0;
    // confirms quantity before checkout
    for (const carts of all_cart) {
      // calculate all product sum
      // @Todo: calculate price based on product currency and checkout currency
      if (!carts) {
        return res.status(mainConfig.status.bad).json({
          msg: `Could not verify some Products or Product does not exists`,
        });
      }
      const { product_id, quantity, totalPrice, currency } = carts;
      all_cart_sum += Number(totalPrice);


      const check_products = await Product.findOne({
        where: {
          uuid: product_id,
        },
      });

      if (!check_products) {
        return res.status(mainConfig.status.bad).json({
          msg: "Could not verify some Products or Product does not exists",
        });
      }

      if (Number(check_products?.get().quantity) >= Number(quantity)) {
        console.log("Enough Quantity :", check_products?.get().name);
      } else {
        console.log("Not Enough Quantity for: ", check_products?.get().name);
        return res.status(mainConfig.status.bad).json({
          msg: `Not Enough Quantity for: ${check_products?.get().name}`,
        });
      }
    }
    // sum all carts

    const UID = nanoid(30);
    // create order in db
    // Bank Payment
    if (req.body.payment_method.toLowerCase() === "bank") {
      const pay_link = await OPay.PaymentLink({
        user_id: req.user.uuid,
        uuid: UID,
        amount: String(all_cart_sum),
        currency: req.body.currency,
        meta: {
          user_id: req.user.uuid,
          user_avatar: req.user.avatar,
          summary: cart_details_str,
          // cart details
        },
        customer: {
          email: req.user.email,
          phone: req.user.phone,
          name: req.user.firstName,
        },
      });
      if (pay_link) {
        // create a order in db with payment status of pending;
        const getDefaultAddress = await AddressBook.findOne({
          where: {
            user_id: req.user.uuid,
            isDefault: true,
          },
          attributes: ["id"],
        });

        const getAddressById =
          req.body.address_id &&
          (await AddressBook.findOne({
            where: {
              user_id: req.user.uuid,
              id: req.body.address_id,
            },
            attributes: ["id"],
          }));

        // console.log(getDefaultAddress, getAddressById)
        if (!getAddressById && !getDefaultAddress) {
          return res.status(mainConfig.status.bad).json({
            msg: "Default Address not Found, select an address to use or set a default address in Address Book",
          });
        }

        const new_order = await Orders.create({
          uuid: UID,
          user_id: req.user.uuid,
          order_data: all_cart,
          amount: String(all_cart_sum),
          payment_method: req.body.payment_method,
          delivery_method: String(req.body.delivery_method || "")
            .toLowerCase()
            .trim(),
          delivery_address_id:
            (getAddressById && getAddressById.get().id) ||
            (getDefaultAddress && getDefaultAddress.get().id),
          order_code: `${nanoid(6)}-${randomID()}`,
        });
        await new_order.save();
        // send notification to seller
        return res.status(mainConfig.status.ok).json({
          msg: "Payment Link Created",
          data: {
            // default_address:!!getDefaultAddress,
            address_id: (getDefaultAddress || getAddressById).id,
            link: pay_link.data.link,
            order: UID,
          },
        });
      }

      return res.status(mainConfig.status.bad).json({
        msg: "Could not create payment link",
      });
    } else if (req.body.payment_method.toLowerCase() === "pay on delivery") {
      return res.status(mainConfig.status.ok).json({
        msg: "Payment on Delivery is not Available Yet",
      });
    }

    return res.status(mainConfig.status.bad).json({
      msg: "Could not Checkout",
    });
  } catch (error) {
    console.log(error);
    return errorHandler(res, error);
  }
};
