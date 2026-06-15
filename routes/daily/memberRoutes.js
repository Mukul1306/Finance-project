const express =
require("express");

const router =
express.Router();

const {

createMember,
getMembers ,
getAgentMembers,
getMemberProfile,
getMemberTransactions

} = require(
"../../controllers/daily/DailyMemberController"
);

router.post(
"/create-member",
createMember
);

router.get(
"/members",
getMembers
);

router.get(
"/member/:id",
getMemberProfile
);
router.get(
  "/member-transactions/:id",
  getMemberTransactions
);

router.get(
"/agent-members/:agentId",
getAgentMembers
);

module.exports =
router;