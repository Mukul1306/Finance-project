const express = require("express");

const router = express.Router();

const {
    addAgentToSalary,
    getSalaryAgents,
    getMonthlySalary,
    paySalary
} = require(
    "../../controllers/daily/salaryController"
);


// Add staff to salary management
router.post(
    "/add-agent",
    addAgentToSalary
);


// Salary enabled staff
router.get(
    "/agents",
    getSalaryAgents
);


// Monthly salary table
// ?month=8&year=2026
router.get(
    "/monthly",
    getMonthlySalary
);


// Pay salary
router.post(
    "/pay",
    paySalary
);


module.exports = router;