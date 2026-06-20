const dotenv = require("dotenv");
const { validateStartupEnv } = require("./config/env");

dotenv.config();

validateStartupEnv();

const connectDB = require("./config/db");
const { initCronJobs } = require("./services/cronService");

async function startWorker() {
  await connectDB();
  initCronJobs();
}

startWorker();
