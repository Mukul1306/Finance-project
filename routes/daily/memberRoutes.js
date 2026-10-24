
const express = require("express");
const router = express.Router();

const {
  createMember,
  getMembers,
  getMemberProfile,
  updateMember,
  deleteMember,
  memberLogin,
  getMemberLoan,
} = require("../../controllers/daily/DailyMemberController");

// ==========================================
// MEMBER MANAGEMENT — ADMIN
// ==========================================

router.post("/create-member", createMember);
router.get("/members", getMembers);
router.get("/member/:id", getMemberProfile);
router.put("/member/:id", updateMember);
router.delete("/member/:id", deleteMember);
router.get("/member-loan/:memberId", getMemberLoan);

// ==========================================
// MEMBER LOGIN
// ==========================================

router.post("/login", memberLogin);

module.exports = router;
