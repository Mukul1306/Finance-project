const express =
require("express");

const router =
express.Router();
const {
  createLoan,
  getLoans,
  getLoan,
  getLoanDetails,
  collectEmi,
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
  getAgentLoans,
  getAgentsByArea,

  // Loan Request
  createLoanRequest,
  getLoanRequests,
  getLoanRequestsByAgent,
  approveLoanRequest,
  rejectLoanRequest
} = require("../../controllers/daily/loanController");

const {
  sendSingleNotification,
  sendAllMembersNotification,
  sendLoanMembersNotification,
  sendPendingMembersNotification
} = require(
  "../../controllers/daily/notificationController"
);
router.post(
"/create-loan",
createLoan
);
// Search Member
router.get(
"/loan-search/:keyword",
searchLoanMembers
);

// Member Details
router.get(
"/loan-member/:memberId",
getLoanMemberDetails
);

// Loan Calculator
router.post(
"/calculate-loan",
calculateLoan
);


router.get(
"/loans",
getLoans
);
router.get(
"/loan/:id",
getLoan
);

router.get(
"/loan-history/:loanId",
getLoanHistory
);

router.get(
"/loan-dashboard",
loanDashboard
);

router.get(
    "/agents-by-area/:areaId",
    getAgentsByArea
);
router.get(
"/loan-details/:id",
getLoanDetails  
);
router.put("/loan/:id", updateLoan);
router.post(
"/collect-emi",
collectEmi
);
router.post(
"/collect-principal",
collectPrincipal
);

router.get(
"/areas",
getAreas
);
router.get(
  "/pending-installments/:loanId",
  getPendingInstallments
);
router.get(
"/members-by-area/:areaId",
getMembersByArea
);

router.get(
"/member-details/:id",
getMember
);

router.get(
  "/agent-loans/:agentId",
  getAgentLoans
);
router.put(
  "/close-loan/:id",
  closeLoan
);

router.post(
  "/notification/member",
  sendSingleNotification
);

router.post(
  "/notification/all-members",
  sendAllMembersNotification
);

router.post(
  "/notification/loan-members",
  sendLoanMembersNotification
);

router.post(
  "/notification/pending-members",
  sendPendingMembersNotification
);
// ==========================================================
// LOAN REQUESTS
// ==========================================================

// Agent → Create loan request
router.post(
  "/loan-request",
  createLoanRequest
);

// Admin → Get all loan requests
router.get(
  "/loan-requests",
  getLoanRequests
);

// Agent → Get own loan requests
router.get(
  "/loan-requests/agent/:agentId",
  getLoanRequestsByAgent
);

// Admin → Approve loan request
router.put(
  "/loan-request/:id/approve",
  approveLoanRequest
);

// Admin → Reject loan request
router.put(
  "/loan-request/:id/reject",
  rejectLoanRequest
);

module.exports =
router;