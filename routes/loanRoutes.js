const express = require("express");

const router = express.Router();

const {
  getMembersBySociety,
  getMemberDetails,
  createLoan,
  getAllLoans,
  getLoanById,
  closeLoan,
} = require("../controllers/loanController");

/*
GET ACTIVE MEMBERS OF SOCIETY
*/
router.get(
  "/members/:societyId",
  getMembersBySociety
);

/*
GET MEMBER DETAILS
*/
router.get(
  "/member/:memberId",
  getMemberDetails
);

/*
CREATE LOAN
*/
router.post(
  "/create",
  createLoan
);

/*
GET ALL LOANS
*/
router.get(
  "/list",
  getAllLoans
);

/*
GET SINGLE LOAN
*/
router.get(
  "/:id",
  getLoanById
);

/*
CLOSE LOAN
*/
router.put(
  "/close/:loanId",
  closeLoan
);

module.exports = router;