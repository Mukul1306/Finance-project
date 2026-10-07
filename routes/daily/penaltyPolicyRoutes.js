const express = require("express");

const router = express.Router();

const {
  getPenaltyControl,
  getPenaltyMembers,
  getEffectivePenalty,
  applyPenaltyPolicy,
} = require(
  "../../controllers/daily/penaltyPolicyController"
);

// =====================================================
// GET CENTRAL POLICY
// GET /api/daily/penalty-control
// =====================================================

router.get(
  "/penalty-control",
  getPenaltyControl
);

// =====================================================
// GET MEMBERS
// GET /api/daily/penalty-control/members
// =====================================================

router.get(
  "/penalty-control/members",
  getPenaltyMembers
);

// =====================================================
// GET EFFECTIVE MEMBER POLICY
// GET /api/daily/penalty-control/effective/:memberId/:type
// =====================================================

router.get(
  "/penalty-control/effective/:memberId/:type",
  getEffectivePenalty
);

// =====================================================
// APPLY POLICY
// POST /api/daily/penalty-control
// =====================================================

router.post(
  "/penalty-control",
  applyPenaltyPolicy
);

module.exports = router;