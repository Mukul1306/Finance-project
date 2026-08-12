const express = require("express");

const router = express.Router();

const {
    savePenaltySettings,
    getPenaltySettings
} = require("../../controllers/daily/penaltyController");

const {
    getPenaltyManagement
} = require("../../controllers/daily/penaltyManagementController");


// ==========================================
// PENALTY MANAGEMENT
// ==========================================

router.get(
    "/management",
    getPenaltyManagement
);


// ==========================================
// PENALTY SETTINGS
// ==========================================

router.post(
    "/penalty-settings",
    savePenaltySettings
);

router.get(
    "/penalty-settings",
    getPenaltySettings
);


module.exports = router;