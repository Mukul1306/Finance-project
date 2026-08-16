const express = require("express");

const router = express.Router();

const {
  markAttendance,
  getTodayAttendance,
  checkOut,
  getAttendance,
  getMonthlyAttendance
} = require(
  "../../controllers/daily/attendanceController"
);


// =====================================================
// AGENT
// =====================================================

// Mark today's attendance
router.post(
  "/mark",
  markAttendance
);


// Get today's attendance
router.get(
  "/today/:agentId",
  getTodayAttendance
);


// Check out
router.post(
  "/check-out",
  checkOut
);


// =====================================================
// ADMIN
// =====================================================

// All attendance
router.get(
  "/all",
  getAttendance
);

router.get(
  "/monthly",
  getMonthlyAttendance
);

module.exports = router;