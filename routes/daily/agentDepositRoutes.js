const express = require("express");

const router = express.Router();

const {

  receiveMoney,

  getAgentCashSummary,

  getDepositHistory

} = require("../../controllers/daily/agentDepositController");

router.post(
  "/receive-money",
  receiveMoney
);

router.get(
  "/cash-summary/:agentId",
  getAgentCashSummary
);

router.get(
  "/deposit-history/:agentId",
  getDepositHistory
);

module.exports = router;