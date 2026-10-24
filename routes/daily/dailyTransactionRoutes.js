
const express = require("express");
const router = express.Router();

const {
  collectPayment,
} = require("../../controllers/daily/DailyTransactionController");

// ==========================================
// DAILY TRANSACTION COLLECTION
// ==========================================

// Admin collects a daily saving payment
router.post("/collect-payment", collectPayment);

module.exports = router;
