const express = require("express");

const router = express.Router();

const {
  createDailySaving,

  getAllDailySavings,

  getDailySaving,

  updateDailySaving,
  getSavingDetails,
  closeDailySaving,

  terminateDailySaving,

  getSavingMemberDetails,

  getSavingAccounts,

  // ==========================================
  // SAVING REQUEST
  // ==========================================
  createSavingRequest,

  getSavingRequests,

  getSavingRequestsByAgent,

  approveSavingRequest,

  rejectSavingRequest

} = require("../../controllers/daily/DailySavingController");


// ==========================================
// ADMIN DIRECT CREATE DAILY SAVING
// ==========================================

router.post(
  "/create-saving",
  createDailySaving
);


// ==========================================
// AGENT CREATE DAILY SAVING REQUEST
// ==========================================

router.post(
  "/saving-request",
  createSavingRequest
);


// ==========================================
// ADMIN GET PENDING SAVING REQUESTS
// ==========================================

router.get(
  "/saving-requests",
  getSavingRequests
);


// ==========================================
// AGENT GET OWN SAVING REQUESTS
// ==========================================

router.get(
  "/saving-requests/agent/:agentId",
  getSavingRequestsByAgent
);


// ==========================================
// ADMIN APPROVE SAVING REQUEST
// ==========================================

router.put(
  "/saving-request/:id/approve",
  approveSavingRequest
);

router.get(
  "/saving-details/:id",
  getSavingDetails
);
// ==========================================
// ADMIN REJECT SAVING REQUEST
// ==========================================

router.put(
  "/saving-request/:id/reject",
  rejectSavingRequest
);


// ==========================================
// GET ALL ACTIVE / EXISTING SAVINGS
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


// ==========================================
// GET MEMBER DETAILS FOR NEW SAVING
// ==========================================

router.get(
  "/saving-member/:memberId",
  getSavingMemberDetails
);


module.exports = router;