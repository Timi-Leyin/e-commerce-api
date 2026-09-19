import { DataTypes } from "sequelize";
import db from "../config/db";
import { createId } from "@paralleldrive/cuid2";

export enum orderStatus {
  placed = "order placed",
  paid = "paid",
  pending = "pending confirmation",
  shipped = "shipped",
  out = "out for delivery",
  delivered = "delivered",
}

const Orders = db.define("orders", {
  id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
    unique: true,
    autoIncrement: true,
  },
  uuid: {
    type: DataTypes.STRING,
    unique: true,
    defaultValue: createId(),
    allowNull: false,
  },
  user_id: {
    type: DataTypes.STRING,
  },
  order_data: {
    type: DataTypes.JSON,
  },
  amount: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: orderStatus.placed,
  },
  payment_method: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  delivery_method: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  delivery_address_id: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  order_code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  totalPrice: {
    type: DataTypes.STRING,
  },
  ip: {
    type: DataTypes.STRING,
  },
  dispatched_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  delivered_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
});

export default Orders;
