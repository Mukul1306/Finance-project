const mongoose = require("mongoose");

// =====================================================
// PENALTY RULE
// =====================================================

const penaltyRuleSchema = new mongoose.Schema(
  {
    enabled: {
      type: Boolean,
      default: true,
    },

    penaltyType: {
      type: String,
      enum: ["FIXED", "PERCENTAGE"],
      default: "PERCENTAGE",
    },

    penaltyValue: {
      type: Number,
      default: 0,
      min: 0,
    },

    gracePeriod: {
      type: Number,
      default: 0,
      min: 0,
    },

    maxPenalty: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    _id: false,
  }
);

// =====================================================
// MEMBER OVERRIDE
// =====================================================

const memberOverrideSchema = new mongoose.Schema(
  {
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DailyMember",
      required: true,
    },

    appliesTo: {
      type: String,
      enum: ["LOAN", "DAILY_SAVING", "BOTH"],
      required: true,
    },

    enabled: {
      type: Boolean,
      default: true,
    },

    penaltyType: {
      type: String,
      enum: ["FIXED", "PERCENTAGE"],
      default: "PERCENTAGE",
    },

    penaltyValue: {
      type: Number,
      default: 0,
      min: 0,
    },

    gracePeriod: {
      type: Number,
      default: 0,
      min: 0,
    },

    maxPenalty: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// =====================================================
// MAIN POLICY
// =====================================================

const penaltyPolicySchema = new mongoose.Schema(
  {
    // Global Loan policy
    loan: {
      type: penaltyRuleSchema,
      default: () => ({
        enabled: true,
        penaltyType: "PERCENTAGE",
        penaltyValue: 0,
        gracePeriod: 0,
        maxPenalty: 0,
      }),
    },

    // Global Daily Saving policy
    dailySaving: {
      type: penaltyRuleSchema,
      default: () => ({
        enabled: true,
        penaltyType: "PERCENTAGE",
        penaltyValue: 0,
        gracePeriod: 0,
        maxPenalty: 0,
      }),
    },

    // Specific member rules
    memberOverrides: {
      type: [memberOverrideSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.PenaltyPolicy ||
  mongoose.model("PenaltyPolicy", penaltyPolicySchema);