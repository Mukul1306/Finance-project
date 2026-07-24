const express = require("express");

const router = express.Router();

const {
  addBusinessFund,
  getBusinessFunds,
  deleteBusinessFund
} = require("../../controllers/daily/businessFundController");

// ==========================================
// BUSINESS FUND ROUTES
// ==========================================

// Add Business Fund
router.post("/", addBusinessFund);

// Get All Business Funds
router.get("/", getBusinessFunds);

// Delete Business Fund
router.delete("/:id", deleteBusinessFund);

module.exports = router;