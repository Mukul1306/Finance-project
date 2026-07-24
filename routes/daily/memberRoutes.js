const express = require("express");

const router = express.Router();

const {

  createMember,

  getMembers,

  getMemberProfile,

  updateMember,

  deleteMember

} = require("../../controllers/daily/DailyMemberController");

/*
====================================
CREATE MEMBER
====================================
*/

router.post(
  "/create-member",
  createMember
);

/*
====================================
GET ALL MEMBERS
====================================
*/

router.get(
  "/members",
  getMembers
);

/*
====================================
GET SINGLE MEMBER
====================================
*/

router.get(
  "/member/:id",
  getMemberProfile
);

/*
====================================
UPDATE MEMBER
====================================
*/

router.put(
  "/member/:id",
  updateMember
);

/*
====================================
DELETE MEMBER
====================================
*/

router.delete(
  "/member/:id",
  deleteMember
);

module.exports = router;