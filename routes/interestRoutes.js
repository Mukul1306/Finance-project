const express =
require("express");

const router =
express.Router();

const {

 collectInterest,

 getInterestHistory,

 getPendingInterest

}
=
require(
"../controllers/interestController"
);

router.post(
"/collect",
collectInterest
);

router.get(
"/history/:loanId",
getInterestHistory
);

router.get(
"/pending/:loanId",
getPendingInterest
);

module.exports =
router;