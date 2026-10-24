
const express = require("express");
const router = express.Router();

const {
  createLoan,
  getLoans,
  getLoan,
  getLoanDetails,
  collectEmi,
  advanceEmiPreview,
  collectAdvanceEmi,
  collectPrincipal,
  getAreas,
  getMembersByArea,
  getMember,
  searchLoanMembers,
  getLoanMemberDetails,
  calculateLoan,
  getLoanHistory,
  loanDashboard,
  closeLoan,
  updateLoan,
  getPendingInstallments,
  collectFixedInterestPrincipal,
  giveMoreLoan,

  // Loan applications
  createLoanRequest,
  getLoanRequests,
  approveLoanRequest,
  rejectLoanRequest,

  // Loan termination requests
  getLoanTerminationRequests,
  approveLoanTermination,
  rejectLoanTermination,
} = require("../../controllers/daily/loanController");

// ==========================================
// MEMBER SEARCH AND DETAILS
// ==========================================

router.get("/loan-search/:keyword", searchLoanMembers);
router.get("/loan-member/:memberId", getLoanMemberDetails);
router.get("/member-details/:id", getMember);
router.get("/members-by-area/:areaId", getMembersByArea);
router.get("/areas", getAreas);

// ==========================================
// LOAN CALCULATOR
// ==========================================

router.post("/calculate-loan", calculateLoan);

// ==========================================
// ADMIN LOAN MANAGEMENT
// ==========================================

router.post("/create-loan", createLoan);
router.get("/loans", getLoans);
router.get("/loan-dashboard", loanDashboard);
router.get("/loan/:id", getLoan);
router.get("/loan-details/:id", getLoanDetails);
router.get("/loan-history/:loanId", getLoanHistory);
router.put("/loan/:id", updateLoan);
router.put("/close-loan/:id", closeLoan);
router.post("/give-more-loan", giveMoreLoan);

// ==========================================
// EMI AND PRINCIPAL COLLECTION
// ==========================================

router.post("/collect-emi", collectEmi);
router.get(
  "/loan/:loanId/advance-preview",
  advanceEmiPreview
);
router.post("/collect-advance-loan", collectAdvanceEmi);
router.post(
  "/collect-fixed-interest-principal",
  collectFixedInterestPrincipal
);
router.post("/collect-principal", collectPrincipal);
router.get(
  "/pending-installments/:loanId",
  getPendingInstallments
);

// ==========================================
// USER LOAN APPLICATION + ADMIN REVIEW
// ==========================================

router.post("/loan-request", createLoanRequest);
router.get("/loan-requests", getLoanRequests);
router.put(
  "/loan-request/:id/approve",
  approveLoanRequest
);
router.put(
  "/loan-request/:id/reject",
  rejectLoanRequest
);

// ==========================================
// LOAN TERMINATION — ADMIN
// ==========================================

router.get(
  "/loan-termination-requests",
  getLoanTerminationRequests
);
router.put(
  "/loan-termination-request/:id/approve",
  approveLoanTermination
);
router.put(
  "/loan-termination-request/:id/reject",
  rejectLoanTermination
);

module.exports = router;
