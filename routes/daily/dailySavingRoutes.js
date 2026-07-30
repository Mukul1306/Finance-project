const express = require("express");

const router = express.Router();

const {

  createDailySaving,

  getAllDailySavings,

  getDailySaving,

  updateDailySaving,

  closeDailySaving,
  getSavingMemberDetails


} = require("../../controllers/daily/DailySavingController");

/*
=========================================
CREATE DAILY SAVING
=========================================
*/

router.post(
  "/create-saving",
  createDailySaving
);

/*
=========================================
GET ALL SAVING ACCOUNTS
=========================================
*/

router.get(
  "/saving-accounts",
  getAllDailySavings
);
router.get(
  "/saving-member/:memberId",
    getSavingMemberDetails
);
/*
=========================================
GET SINGLE SAVING ACCOUNT
=========================================
*/

router.get(
  "/saving-account/:id",
  getDailySaving
);

/*
=========================================
UPDATE SAVING ACCOUNT
=========================================
*/

router.put(
  "/saving-account/:id",
  updateDailySaving
);

/*
=========================================
CLOSE SAVING ACCOUNT
=========================================
*/


router.put(
  "/close-saving/:id",
  closeDailySaving
);

module.exports = router;