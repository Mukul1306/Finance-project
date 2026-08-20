const express = require("express");

const router = express.Router();

const {
  createMember,
  getMembers,
  getMemberById,
  updateMember,
  deleteMember,
  getMemberPaymentHistory
} = require("../controllers/memberController");

router.post(
  "/create",
  createMember
);

router.get(
  "/all",
  getMembers
);

router.get(
  "/:id",
  getMemberById
);

router.get(
  "/:id/history",
  getMemberPaymentHistory
);


router.put("/update/:id", updateMember);

router.delete("/delete/:id", deleteMember);

module.exports = router;