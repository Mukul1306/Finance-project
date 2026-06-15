const express =
require("express");

const router =
express.Router();

const {

savePenaltySettings,
getPenaltySettings

} = require(
"../../controllers/daily/penaltyController"
);

router.post(
"/penalty-settings",
savePenaltySettings
);

router.get(
"/penalty-settings",
getPenaltySettings
);

module.exports =
router;