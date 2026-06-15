const express = require("express");

const router = express.Router();

const {
  getProfitLoss
} = require(
  "../../controllers/daily/profitLossController"
);

router.get("/", getProfitLoss);

module.exports = router;