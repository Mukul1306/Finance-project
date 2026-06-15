const express = require("express");

const router = express.Router();

const {
  createMember,
  getMembers,
  getMemberById
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

module.exports = router;