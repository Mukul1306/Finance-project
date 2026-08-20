const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

// ==========================================
// 1. SYSTEM CONFIGURATION & DATABASE CORNER
// ==========================================
dotenv.config();

const connectDB = require("./config/db");
connectDB();

const app = express();

// ==========================================
// 2. GLOBAL APPLICATION MIDDLEWARE
// ==========================================
app.use(cors());
app.use(express.json());

// ==========================================
// 3. CORE ROUTE IMPORT ATTEMPT ROUTING
// ==========================================
const authRoutes = require("./routes/authRoutes");
const societyRoutes = require("./routes/societyRoutes");
const memberRoutes = require("./routes/memberRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const reportRoutes = require("./routes/reportRoutes");
const loanRoutes =require("./routes/loanRoutes");
const interestRoutes =require("./routes/interestRoutes"
);
const agentRoutes =
require(
"./routes/daily/agentRoutes"
);
const areaGroupRoutes =
require(
"./routes/daily/areaGroupRoutes"
);
const dailyMemberRoutes =
require(
"./routes/daily/memberRoutes"
);

const collectionRoutes =
require(
"./routes/daily/collectionRoutes"
);
const penaltyRoutes =
require(
"./routes/daily/penaltyRoutes"
);
const dailyLoanRoutes =
require("./routes/daily/loanRoutes");


const notificationRoutes =
require(
"./routes/daily/notificationRoutes"
);
const dailyReportRoutes =
require("./routes/daily/reportRoutes");
const dashboardRoutes =
require("./routes/daily/dashboardRoutes");
const dailyExpenseRoutes =
require("./routes/daily/expenseRoutes");

const dailyProfitLossRoutes =
require("./routes/daily/profitLossRoutes");
const dailySavingRoutes =
require("./routes/daily/dailySavingRoutes");
const societyExpenseRoutes =
require("./routes/expenseRoutes");
const agentDepositRoutes = require("./routes/daily/agentDepositRoutes");
const businessFundRoutes = require("./routes/daily/businessFundRoutes");
const salaryRoutes =
    require("./routes/daily/salaryRoutes");
const societyProfitLossRoutes =
require("./routes/profitLossRoutes");
// const dashboardRoutes = require("./routes/dashboardRoutes");
const attendanceRoutes =
require("./routes/daily/attendanceRoutes");
const userRoutes =
require("./routes/daily/userRoutes");
const memberPortalRoutes =
  require("./routes/memberPortalRoutes");
// ==========================================
// 4. API ROUTE DECLARATION CORNER
// ==========================================
app.use("/api/auth", authRoutes);
app.use("/api/society", societyRoutes);
app.use("/api/member", memberRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/loans", loanRoutes);
app.use("/api/interest", interestRoutes);
app.use(
"/api/daily",
agentRoutes
);
app.use(
"/api/daily",
areaGroupRoutes
);
app.use(
"/api/daily",
dailyMemberRoutes
);
app.use(
"/api/daily",
collectionRoutes
);

app.use(
  "/api/daily/penalty",
  penaltyRoutes
);
app.use(
  "/api/daily",
  dailyLoanRoutes
);
app.use(
    "/api/daily/salary",
    salaryRoutes
);
app.use(
  "/api/daily/attendance",
  attendanceRoutes
);
app.use(
"/api/notifications",
notificationRoutes
);

app.use(
"/api/daily-reports",
dailyReportRoutes
);
app.use(
  "/api/member-portal",
  memberPortalRoutes
);
app.use(
  "/api/dashboard",
  dashboardRoutes
);

app.use(
  "/api/daily/expenses",
  dailyExpenseRoutes
);

app.use(
  "/api/daily/profit-loss",
  dailyProfitLossRoutes
);

app.use(
  "/api/expenses",
  societyExpenseRoutes
);app.use(
  "/api/daily/business-fund",
  businessFundRoutes
);

app.use(
"/api/daily/user",
userRoutes
);


app.use(
  "/api/profit-loss",
  societyProfitLossRoutes
);
app.use(
"/api/daily",
dailySavingRoutes
);
app.use("/api/daily", agentDepositRoutes);
// app.use("/api/dashboard", dashboardRoutes);

// ==========================================
// 5. DIAGNOSTIC & TELEMETRY TEST ENDPOINT
// ==========================================
app.post("/test", (req, res) => {
    console.log("Telemetry Payload:", req.body);
    res.json({
        success: true,
        received: req.body
    });
});

// ==========================================
// 6. APPLICATION BOOTSTRAP OVER OVERLAY
// ==========================================
const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.send("SRM Finance Backend Running Successfully 🚀");
});

app.listen(PORT, () => {
    console.log(`=================================`);
    console.log(`🚀 CORE ENGINE RUNNING ON PORT: ${PORT}`);
    console.log(`=================================`);
});


app.get("/", (req, res) => {
  res.send("SRM Finance Backend Running Successfully 🚀");
});
