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

  // =========================
  // MEMBER REQUEST
  // =========================
createMemberRequest,
getMemberRequests,
getMemberRequestsByAgent,
approveMemberRequest,
rejectMemberRequest

} = require("../../controllers/daily/DailyMemberController");


/*
====================================
DIRECT CREATE MEMBER
====================================
*/

router.post(
  "/create-member",
  createMember
);


/*
====================================
AGENT CREATE MEMBER REQUEST
====================================
*/

router.post(
  "/member-request",
  createMemberRequest
);


/*
====================================
ADMIN GET PENDING MEMBER REQUESTS
====================================
*/

router.get(
  "/member-requests",
  getMemberRequests
);

router.get(
  "/member-requests/agent/:agentId",
  getMemberRequestsByAgent
);
/*
====================================
ADMIN APPROVE MEMBER REQUEST
====================================
*/

router.put(
  "/member-request/:id/approve",
  approveMemberRequest
);


/*
====================================
ADMIN REJECT MEMBER REQUEST
====================================
*/

router.put(
  "/member-request/:id/reject",
  rejectMemberRequest
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
GET MEMBER LOAN
====================================
*/

router.get(
  "/member-loan/:memberId",
  getMemberLoan
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


/*
====================================
MEMBER LOGIN
====================================
*/

router.post(
  "/login",
  memberLogin
);


module.exports = router;