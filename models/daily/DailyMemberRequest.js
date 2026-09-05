const mongoose = require("mongoose");

const dailyMemberRequestSchema = new mongoose.Schema(
  {
    // =========================
    // MEMBER INFORMATION
    // =========================

    memberId: {
      type: String,
      required: true,
      trim: true
    },

    memberName: {
      type: String,
      required: true,
      trim: true
    },

    fatherName: {
      type: String,
      required: true,
      trim: true
    },

    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      required: true
    },

    dob: {
      type: Date,
      required: true
    },

    email: {
      type: String,
      default: ""
    },

    mobile: {
      type: String,
      required: true,
      match: /^[0-9]{10}$/
    },

    password: {
      type: String,
      required: true
    },

    alternateMobile: {
      type: String,
      default: ""
    },

    residentialAddress: {
      type: String,
      required: true
    },

    city: {
      type: String,
      required: true
    },

    district: {
      type: String,
      required: true
    },

    state: {
      type: String,
      required: true
    },

    pincode: {
      type: String,
      required: true
    },

    // =========================
    // REQUEST INFORMATION
    // =========================

    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DailyAgent",
      required: true
    },

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

// Fast Admin pending-request search
dailyMemberRequestSchema.index({
  status: 1,
  createdAt: -1
});

// Fast Agent's own request search
dailyMemberRequestSchema.index({
  requestedBy: 1,
  status: 1,
  createdAt: -1
});

module.exports = mongoose.model(
  "DailyMemberRequest",
  dailyMemberRequestSchema
);