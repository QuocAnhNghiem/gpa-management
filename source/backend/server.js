const dotenv = require("dotenv");
const { validateStartupEnv } = require("./config/env");

// Tải biến môi trường TRƯỚC khi require các module khác
dotenv.config();

validateStartupEnv();

const connectDB = require("./config/db");
const app = require("./app");

const PORT = process.env.PORT || 5000;
const APP_ENV = process.env.APP_ENV || process.env.NODE_ENV || "development";

async function startServer() {
  await connectDB();

  app.listen(PORT, () => {
    console.log(
      `Server Backend đang chạy trên cổng ${PORT} trong môi trường ${APP_ENV}`,
    );
  });
}

startServer();
