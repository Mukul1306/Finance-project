
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
  collectAdvancePayment,
} = require("../../controllers/daily/DailySavingController");

// Savings — Admin
router.post("/create-saving", createDailySaving);
router.get("/saving-accounts", getAllDailySavings);
router.get("/saving/:id", getDailySaving);
router.get("/saving-details/:id", getSavingDetails);
router.put("/saving/:id", updateDailySaving);
router.put("/close-saving/:id", closeDailySaving);
router.put("/saving/:id/terminate", terminateDailySaving);
router.get("/saving-member/:memberId", getSavingMemberDetails);

// Saving payments
router.post("/collect-advance", collectAdvancePayment);

module.exports = router;