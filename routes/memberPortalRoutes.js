const express = require("express");
const router = express.Router();

const {
  getDashboard
} = require("../controllers/memberPortalController");

const societyMemberAuth =
  require("../middleware/societyMemberAuth");

router.get(
  "/dashboard",
  societyMemberAuth,
  getDashboard
);

module.exports = router;