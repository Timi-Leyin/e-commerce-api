import { DataTypes } from "sequelize";
import db from "../config/db";
import { createId } from "@paralleldrive/cuid2";

const AddressBook = db.define("address-book", {
  id: {
    autoIncrement: true,
    primaryKey: true,
    unique: true,
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  uuid: {
    type: DataTypes.STRING,
    defaultValue: createId(),
    unique: true,
    allowNull: false,
  },
  user_id: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  additional_phone: {
    type: DataTypes.STRING,
  },
  country: {
    type: DataTypes.STRING,
    defaultValue: "Nigeria",
  },
  region: {
    // also state
    type: DataTypes.STRING,
    allowNull: false,
  },
  city: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  street: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  landmark: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  label: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  isDefault: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
});

export default AddressBook;
