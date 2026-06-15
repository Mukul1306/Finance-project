const express =
require("express");

const router =
express.Router();

const {

dashboardReport,
dailyCollectionReport,
loanReport,
pendingLoanReport,
areaWiseReport

} = require(
"../../controllers/daily/reportController"
);

router.get(
"/dashboard",
dashboardReport
);

router.get(
"/daily-collection",
dailyCollectionReport
);

router.get(
"/loan-report",
loanReport
);

router.get(
"/pending-loans",
pendingLoanReport
);
router.get(
"/area-wise",
areaWiseReport
);
module.exports =
router;