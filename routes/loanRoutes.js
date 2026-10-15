const express = require("express");

const router = express.Router();

const {
  getMembersBySociety,
  getMemberDetails,
  createLoan,
  getAllLoans,
  getLoanById,
  closeLoan,
  getPendingEmis,
  collectLoanEmi,
  getLoanHistory,
  loanDashboard,
  addAdditionalPrincipal
} = require("../controllers/loanController");


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
  "/pending-emis/:loanId",
  getPendingEmis
);

router.get(
  "/payment-history/:loanId",
  getLoanHistory
);

router.post(
  "/collect-emi",
  collectLoanEmi
);

router.put(
  "/close/:loanId",
  closeLoan
);


router.post(
  "/:loanId/additional-principal",
  addAdditionalPrincipal
);

// ===========================
// LOAN DASHBOARD
// ===========================

router.get(
  "/dashboard",
  loanDashboard
);



// KEEP THIS LAST
router.get(
  "/:id",
  getLoanById
);



module.exports = router;