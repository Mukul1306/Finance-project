const express =
require("express");

const router =
express.Router();

const {

collectPayment,
getAllCollections,
getAgentCollections,
agentDashboard,
getAgentHistory,
adminSummary,

}=require(

"../../controllers/daily/collectionController"

);

const {

getPendingDays,
collectPendingPayment,
getMemberSaving,
getCollectionMembers,
getAgentCollectionMembers,
getCollectionSummary,
getAgentMonthlyCollection

} = require("../../controllers/daily/DailyCollectionController");


router.post(
"/collect-payment",
collectPayment
);

router.get(
"/collections",
getAllCollections
);

router.get(
"/agent-collections/:agentId",
getAgentCollections
);

router.get(
"/agent-dashboard/:agentId",
agentDashboard
);
router.get(
"/agent-history/:agentId",
getAgentHistory
);

router.get(
"/admin-summary",
adminSummary
);
router.get(

"/pending-days/:id",

getPendingDays

);
router.post(
"/collect-pending",
collectPendingPayment
);
router.get(
"/member-saving/:id",
getMemberSaving
);

// ==============================
// ADMIN COLLECTION MEMBERS
// ==============================

router.get(
"/collection-members",
getCollectionMembers
);
router.get(
  "/agent-monthly-collection",
  getAgentMonthlyCollection
);

// ==============================
// AGENT COLLECTION MEMBERS
// ==============================

router.get(
"/agent-collection-members/:agentId",
getAgentCollectionMembers
);

router.get(
  "/collection-summary",
  getCollectionSummary
);

module.exports =
router;