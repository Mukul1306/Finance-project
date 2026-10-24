
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const cron = require("node-cron");

dotenv.config();

const connectDB = require("./config/db");
connectDB();

const app = express();

// ==========================================
// 1. GLOBAL MIDDLEWARE
// ==========================================
app.use(cors());
app.use(express.json());

// ==========================================
// 2. CORE SOCIETY ROUTES
// ==========================================
const authRoutes = require("./routes/authRoutes");
const societyRoutes = require("./routes/societyRoutes");
const memberRoutes = require("./routes/memberRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const reportRoutes = require("./routes/reportRoutes");
const loanRoutes = require("./routes/loanRoutes");
const interestRoutes = require("./routes/interestRoutes");
const societyExpenseRoutes = require("./routes/expenseRoutes");
const societyProfitLossRoutes = require("./routes/profitLossRoutes");

// ==========================================
// 3. DAILY FINANCE ROUTES
// ==========================================
const areaGroupRoutes = require("./routes/daily/areaGroupRoutes");
const dailyMemberRoutes = require("./routes/daily/memberRoutes");
const collectionRoutes = require("./routes/daily/collectionRoutes");
const penaltyRoutes = require("./routes/daily/penaltyRoutes");
const dailyLoanRoutes = require("./routes/daily/loanRoutes");

const dailyReportRoutes = require("./routes/daily/reportRoutes");
const dashboardRoutes = require("./routes/daily/dashboardRoutes");
const dailyExpenseRoutes = require("./routes/daily/expenseRoutes");
const dailyProfitLossRoutes = require("./routes/daily/profitLossRoutes");
const dailySavingRoutes = require("./routes/daily/dailySavingRoutes");
const businessFundRoutes = require("./routes/daily/businessFundRoutes");

const userRoutes = require("./routes/daily/userRoutes");
const memberPortalRoutes = require("./routes/memberPortalRoutes");

const penaltyPolicyRoutes = require("./routes/daily/penaltyPolicyRoutes");




// ==========================================
// 4. SOCIETY API MOUNTS
// ==========================================
app.use("/api/auth", authRoutes);
app.use("/api/society", societyRoutes);
app.use("/api/member", memberRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/loans", loanRoutes);
app.use("/api/interest", interestRoutes);
app.use("/api/expenses", societyExpenseRoutes);
app.use("/api/profit-loss", societyProfitLossRoutes);

// ==========================================
// 5. ADMIN + USER DAILY FINANCE API MOUNTS
// ==========================================

app.use("/api/daily", areaGroupRoutes);
app.use("/api/daily", dailyMemberRoutes);
app.use("/api/daily", collectionRoutes);
app.use("/api/daily", dailyLoanRoutes);
app.use("/api/daily", dailySavingRoutes);
app.use("/api/daily", penaltyPolicyRoutes);

app.use("/api/daily/penalty", penaltyRoutes);

app.use("/api/daily-reports", dailyReportRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/daily/expenses", dailyExpenseRoutes);
app.use("/api/daily/profit-loss", dailyProfitLossRoutes);
app.use("/api/daily/business-fund", businessFundRoutes);
app.use("/api/daily/user", userRoutes);
app.use("/api/member-portal", memberPortalRoutes);

// ==========================================
// 6. TEST ENDPOINT
// ==========================================
app.post("/test", (req, res) => {
  console.log("Telemetry Payload:", req.body);

  res.json({
    success: true,
    received: req.body,
  });
});

// ==========================================
// 7. ROOT HEALTH CHECK
// ==========================================
app.get("/", (req, res) => {
  res.send("SRM Finance Backend Running Successfully");
});


// ==========================================
// 9. START SERVER
// ==========================================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("=================================");
  console.log(`SRM Finance backend running on port ${PORT}`);
  console.log("=================================");
});