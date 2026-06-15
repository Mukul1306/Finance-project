const express =
require("express");

const router =
express.Router();

const {

sendSingleNotification,

sendAllMembersNotification,

sendLoanMembersNotification,

sendPendingMembersNotification,

getNotifications,

getMemberNotifications

} = require(
"../../controllers/daily/notificationController"
);

router.post(
"/single",
sendSingleNotification
);

router.post(
"/all",
sendAllMembersNotification
);

router.post(
"/loan-members",
sendLoanMembersNotification
);

router.post(
"/pending-members",
sendPendingMembersNotification
);

router.get(
"/history",
getNotifications
);

router.get(
"/member/:memberId",
getMemberNotifications
);

module.exports =
router;