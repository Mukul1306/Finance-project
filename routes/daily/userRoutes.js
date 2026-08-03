const express = require("express");

const router = express.Router();

const {

memberLogin,

dashboard,

profile,

savingDetails,

passbook,

loanDetails,

loanHistory,

changePassword,

logout

} = require("../../controllers/daily/userController");

router.post(

"/login",

memberLogin

);

router.get(

"/dashboard/:memberId",

dashboard

);

router.get(

"/profile/:memberId",

profile

);

router.get(

"/saving/:memberId",

savingDetails

);

router.get(

"/passbook/:memberId",

passbook

);

router.get(

"/loan/:memberId",

loanDetails

);

router.get(

"/loan-history/:memberId",

loanHistory

);

router.put(

"/change-password",

changePassword

);

router.post(

"/logout",

logout

);

module.exports = router;