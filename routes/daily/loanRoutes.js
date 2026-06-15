const express =
require("express");

const router =
express.Router();
const {

createLoan,
getLoans,
getLoan,
getLoanDetails,
collectEmi,
getAreas,
getMembersByArea,
getMember,
closeLoan


} = require(
"../../controllers/daily/loanController"
);

const {
  sendSingleNotification,
  sendAllMembersNotification,
  sendLoanMembersNotification,
  sendPendingMembersNotification
} = require(
  "../../controllers/daily/notificationController"
);
router.post(
"/create-loan",
createLoan
);

router.get(
"/loans",
getLoans
);

router.get(
"/loan-details/:id",
getLoanDetails  
);

router.post(
"/collect-emi",
collectEmi
);
router.get(
"/areas",
getAreas
);

router.get(
"/members-by-area/:areaId",
getMembersByArea
);

router.get(
"/member-details/:id",
getMember
);


router.put(
  "/close-loan/:id",
  closeLoan
);

router.post(
  "/notification/member",
  sendSingleNotification
);

router.post(
  "/notification/all-members",
  sendAllMembersNotification
);

router.post(
  "/notification/loan-members",
  sendLoanMembersNotification
);

router.post(
  "/notification/pending-members",
  sendPendingMembersNotification
);


module.exports =
router;