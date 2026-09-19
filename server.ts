import dotenv from "dotenv";
dotenv.config();

import app from "./src/app";
import db from "./src/config/db";

/*
DATABSE CONNECTION
*/

db.sync({ force: false })
  .then(() => console.log("Synced 😎"))
  .catch((err: any) => console.log(err));

const { PORT = "5000" } = process.env;
app.listen(Number(PORT), "0.0.0.0", () =>
  console.log(`Server is running on port ${PORT}`),
);

