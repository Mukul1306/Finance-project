const express = require("express");
const router = express.Router();

const {
  getDashboard,
  getSaving,
  getPassbook
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


module.exports = router;