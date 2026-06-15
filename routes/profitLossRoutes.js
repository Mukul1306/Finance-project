const express = require("express");

const router = express.Router();

const {
  getProfitLoss
} = require("../controllers/profitLossController");

router.get("/", getProfitLoss);

module.exports = router;