const express = require("express");

const router = express.Router();

const {

  createDailySaving,

  getAllDailySavings,

  getDailySaving,

  updateDailySaving,

  closeDailySaving


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