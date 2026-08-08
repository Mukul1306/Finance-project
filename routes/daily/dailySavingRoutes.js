const express = require("express");

const router = express.Router();

const {
  createDailySaving,
  getAllDailySavings,
  getDailySaving,
  updateDailySaving,
  closeDailySaving,
  terminateDailySaving,
  getSavingMemberDetails,
  getSavingAccounts
} = require("../../controllers/daily/DailySavingController");


// ==========================================
// CREATE DAILY SAVING
// ==========================================

router.post(
  "/create-saving",
  createDailySaving
);


// ==========================================
// GET ALL SAVING ACCOUNTS
// ==========================================

router.get(
  "/saving-accounts",
  getSavingAccounts
);


// ==========================================
// GET SINGLE SAVING ACCOUNT
// ==========================================

router.get(
  "/saving/:id",
  getDailySaving
);


// ==========================================
// UPDATE SAVING ACCOUNT
// ==========================================

router.put(
  "/saving/:id",
  updateDailySaving
);


// ==========================================
// TERMINATE SAVING ACCOUNT
// ==========================================

router.put(
  "/saving/:id/terminate",
  terminateDailySaving
);


// ==========================================
// CLOSE SAVING ACCOUNT
// ==========================================

router.put(
  "/close-saving/:id",
  closeDailySaving
);


module.exports = router;