const mongoose = require("mongoose");

const agentSalarySchema = new mongoose.Schema(
  {
    agent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DailyAgent",
      required: true,
      unique: true
    },

    commissionRate: {
      type: Number,
      required: true,
      default: 2
    },

    // Salary eligibility settings
    includeDailySaving: {
      type: Boolean,
      default: true
    },

    includeDailyLoan: {
      type: Boolean,
      default: true
    },

    includeWeeklyLoan: {
      type: Boolean,
      default: true
    },

    excludePenalty: {
      type: Boolean,
      default: true
    },

    excludeMonthlyLoan: {
      type: Boolean,
      default: true
    },

    excludeFixedLoan: {
      type: Boolean,
      default: true
    },

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE"
    },

    effectiveFrom: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model(
  "AgentSalary",
  agentSalarySchema
);