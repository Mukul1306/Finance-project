
const express = require("express");
const router = express.Router();

// ==========================================
// COLLECTION CONTROLLER
// ==========================================
const {
  collectPayment,
  getAllCollections,
  adminSummary,
} = require("../../controllers/daily/collectionController");

// ==========================================
// DAILY SAVING COLLECTION CONTROLLER
// ==========================================
const {
  getPendingDays,
  collectPendingPayment,
  getMemberSaving,
  getCollectionMembers,
  getCollectionSummary,
} = require("../../controllers/daily/DailyCollectionController");

// ==========================================
// ADMIN COLLECTION OPERATIONS
// ==========================================

// Collect a payment
router.post("/collect-payment", collectPayment);

// View all collections
router.get("/collections", getAllCollections);

// Admin collection summary
router.get("/admin-summary", adminSummary);

// ==========================================
// DAILY SAVING PAYMENT OPERATIONS
// ==========================================

// Get pending payment days for a saving account
router.get("/pending-days/:id", getPendingDays);

// Collect pending payment
router.post("/collect-pending", collectPendingPayment);

// Get member saving account
router.get("/member-saving/:id", getMemberSaving);

// Get members available for collection
router.get("/collection-members", getCollectionMembers);

// Collection summary
router.get("/collection-summary", getCollectionSummary);

module.exports = router;