const express =
require("express");

const router =
express.Router();

const {

collectPayment

} = require(
"../../controllers/daily/DailyTransactionController"
);

router.post(
"/collect-payment",
collectPayment
);

module.exports =
router;