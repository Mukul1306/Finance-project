const express = require("express");

const router = express.Router();

const {
  collectPayment,
  getPaymentSummary,
  getPendingInstallments,
  getPaymentHistory
} = require("../controllers/paymentController");

// Collect Payment
router.post(
  "/collect",
  collectPayment
);

// Payment Summary
router.get(
  "/summary",
  getPaymentSummary
);

// Pending Installments
router.get(
  "/pending/:memberId",
  getPendingInstallments
);
router.get(
  "/history/:memberId",
  getPaymentHistory
);
module.exports = router;