const express =
require("express");

const router =
express.Router();

const {

collectPayment

}
=
require(
"../controllers/paymentController"
);

router.post(
"/collect",
collectPayment
);

module.exports =
router;