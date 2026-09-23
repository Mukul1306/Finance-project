const mongoose = require("mongoose");

const dailySavingRequestSchema = new mongoose.Schema(
  {
    // =====================================================
    // REQUEST TYPE
    // =====================================================
    // CREATE       = New saving account request
    // TERMINATION  = Agent wants to terminate saving account
    // =====================================================

    requestType: {
      type: String,
      enum: ["CREATE", "TERMINATION"],
      default: "CREATE",
      index: true
    },

    // =====================================================
    // MEMBER
    // =====================================================

    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DailyMember",
      required: true
    },

    // =====================================================
    // SAVING ACCOUNT
    // =====================================================
    // Required only for TERMINATION requests
    // =====================================================

    savingAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DailySaving",
      default: null
    },

    // =====================================================
    // NOMINEE
    // =====================================================

    nomineeName: {
      type: String,
      default: ""
    },

    nomineeMobile: {
      type: String,
      default: ""
    },

    // =====================================================
    // AREA
    // =====================================================

    areaGroup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AreaGroup",
      required: true
    },

    // =====================================================
    // AGENT WHO CREATED REQUEST
    // =====================================================

    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DailyAgent",
      required: true
    },

    // =====================================================
    // TERMINATION REASON
    // =====================================================

    terminationReason: {
      type: String,
      default: ""
    },

    // =====================================================
    // SAVING PLAN DETAILS
    // =====================================================

    collectionType: {
      type: String,
      enum: ["FIXED", "FLEXIBLE"],
      required: function () {
        return this.requestType === "CREATE";
      }
    },

    fixedAmount: {
      type: Number,
      default: 0
    },

    durationDays: {
      type: Number,
      required: function () {
        return this.requestType === "CREATE";
      }
    },

    startDate: {
      type: Date,
      required: function () {
        return this.requestType === "CREATE";
      }
    },

    endDate: {
      type: Date,
      required: function () {
        return this.requestType === "CREATE";
      }
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

    // =====================================================
    // REQUEST STATUS
    // =====================================================

    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
      index: true
    },

    // =====================================================
    // APPROVAL
    // =====================================================

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },

    approvedAt: {
      type: Date,
      default: null
    },

    // =====================================================
    // REJECTION
    // =====================================================

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

// =====================================================
// INDEXES
// =====================================================

dailySavingRequestSchema.index({
  status: 1,
  createdAt: -1
});

dailySavingRequestSchema.index({
  requestType: 1,
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

dailySavingRequestSchema.index({
  savingAccount: 1,
  status: 1
});

module.exports = mongoose.model(
  "DailySavingRequest",
  dailySavingRequestSchema
);