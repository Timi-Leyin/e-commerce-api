import { Sequelize } from "sequelize";

const { env } = process;

// const dialectOptions =
//   process.env.NODE_ENV == "production"
//     ? {
//         ssl: {
//           rejectUnauthorized: true,
//         },
//       }
//     : undefined;

const db = new Sequelize(env.DB_URL as string, {
  dialect: "mysql",
  logging: false,
  // dialectOptions,
});

export default db;
