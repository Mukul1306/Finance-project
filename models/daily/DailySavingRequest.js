const mongoose = require("mongoose");

const dailySavingRequestSchema = new mongoose.Schema(
  {
    // =========================
    // MEMBER
    // =========================
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DailyMember",
      required: true
    },

    // =========================
    // NOMINEE
    // =========================
    nomineeName: {
      type: String,
      default: ""
    },

    nomineeMobile: {
      type: String,
      default: ""
    },

    // =========================
    // AREA
    // =========================
    areaGroup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AreaGroup",
      required: true
    },

    // =========================
    // AGENT
    // =========================
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DailyAgent",
      required: true
    },

    // =========================
    // SAVING DETAILS
    // =========================
    collectionType: {
      type: String,
      enum: ["FIXED", "FLEXIBLE"],
      required: true
    },

    fixedAmount: {
      type: Number,
      default: 0
    },

    durationDays: {
      type: Number,
      required: true
    },

    startDate: {
      type: Date,
      required: true
    },

    endDate: {
      type: Date,
      required: true
    },

    graceDays: {
      type: Number,
      default: 0
    },

    penaltyType: {
      type: String,
      enum: ["PERCENTAGE", "FIXED"],
      default: "PERCENTAGE"
    },

    penaltyValue: {
      type: Number,
      default: 0
    },

    // =========================
    // APPROVAL STATUS
    // =========================
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING"
    },

    // =========================
    // ADMIN APPROVAL
    // =========================
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },

    approvedAt: {
      type: Date,
      default: null
    },

    // =========================
    // ADMIN REJECTION
    // =========================
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },

    rejectedAt: {
      type: Date,
      default: null
    },

    rejectionReason: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);


// =========================
// INDEXES
// =========================

dailySavingRequestSchema.index({
  status: 1,
  createdAt: -1
});

dailySavingRequestSchema.index({
  requestedBy: 1,
  status: 1,
  createdAt: -1
});

dailySavingRequestSchema.index({
  member: 1,
  status: 1
});


module.exports = mongoose.model(
  "DailySavingRequest",
  dailySavingRequestSchema
);