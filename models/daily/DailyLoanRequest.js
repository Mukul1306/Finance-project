const mongoose = require("mongoose");


const dailyLoanRequestSchema = new mongoose.Schema(
  {
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DailyMember",
      required: true,
      index: true,
    },
    loan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DailyLoan",
      default: null,
      index: true,
    },
    requestType: {
      type: String,
      enum: ["LOAN", "LOAN_TERMINATION"],
      default: "LOAN",
      index: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
      index: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    approvedAt: { type: Date, default: null },
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    rejectedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: "" },
  },
  {
    timestamps: true,
    strict: false,
  }
);

dailyLoanRequestSchema.index({ requestType: 1, status: 1, createdAt: -1 });

module.exports =
  mongoose.models.DailyLoanRequest ||
  mongoose.model("DailyLoanRequest", dailyLoanRequestSchema);
