import { DataTypes } from "sequelize";
import db from "../config/db";
import { createId } from "@paralleldrive/cuid2";

const Cart = db.define("carts", {
  id: {
    autoIncrement: true,
    primaryKey: true,
    unique: true,
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  uuid: {
    type: DataTypes.STRING,
    unique: true,
    defaultValue: createId(),
    allowNull: false,
  },
  user_id: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  product_id: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  totalprice: {
    type: DataTypes.STRING,
  },
  price: {
    type: DataTypes.STRING,
  },
}, {
  indexes: [
    { fields: ["user_id"] },
    { fields: ["product_id"] },
    { fields: ["user_id", "product_id"] },
  ],
});

export default Cart;
