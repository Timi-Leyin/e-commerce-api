import { DataTypes } from "sequelize";
import db from "../config/db";
import { createId } from "@paralleldrive/cuid2";
const Product = db.define("products", {
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
  seller_id: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  category: {
    type: DataTypes.STRING,
    defaultValue: "", // seperated by comma
  },
  thumbnail: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  other_images: {
    type: DataTypes.STRING,
    defaultValue: "", //seperated by commas  // max 5
  },

  quantity: {
    type: DataTypes.INTEGER,
  },

  percentage_discount: {
    type: DataTypes.STRING, // must include the percentage sign
  },

  price: {
    type: DataTypes.STRING,
  },

  old_price: {
    type: DataTypes.STRING, // to be undelined
  },
  currency: {
    type: DataTypes.STRING,
    defaultValue: "NGN", // USD
  },

  description_type: {
    type: DataTypes.STRING,
    // MD, HTML, TEXT
  },

  description: {
    type: DataTypes.STRING,
    allowNull: false, // supports md
  },

  is_archived: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },

  archivedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },

  delivery_regions: {
    type: DataTypes.TEXT("long"),
    // seperated by *** // sends array from frontend,
  },
}, {
  indexes: [
    { fields: ["name"] },
    { fields: ["category"] },
    { fields: ["is_archived"] },
    { fields: ["is_archived", "name"] },
    { fields: ["createdAt"] },
  ],
});

export default Product;
