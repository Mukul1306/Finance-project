const express = require("express");
const router = express.Router();

const {
  getDashboard,
  getSaving,
  getPassbook,
  getLoan,
  getProfile
} = require(
  "../controllers/memberPortalController"
);

const societyMemberAuth =
  require("../middleware/societyMemberAuth");

router.get(
  "/dashboard",
  societyMemberAuth,
  getDashboard
);
router.get(
  "/saving",
  societyMemberAuth,
  getSaving
);

router.get(
  "/passbook",
  societyMemberAuth,
  getPassbook
);
router.get(
  "/loan",
  societyMemberAuth,
  getLoan
);

router.get(
  "/profile",
  societyMemberAuth,
  getProfile
);

module.exports = router;