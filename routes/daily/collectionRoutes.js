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
adminSummary

}=require(

"../../controllers/daily/collectionController"

);

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

module.exports =
router;