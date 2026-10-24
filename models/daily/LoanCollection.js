const mongoose = require("mongoose");

const loanCollectionSchema = new mongoose.Schema(
  {
    loan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DailyLoan",
      required: true,
    },
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DailyMember",
      required: true,
    },
    installmentNo: {
      type: Number,
      required: true,
      min: 0,
    },
    emiType: {
      type: String,
      enum: ["DAILY", "WEEKLY", "MONTHLY", "FIXED_INTEREST", "PRINCIPAL"],
      required: true,
    },
    dueDate: Date,
    paymentDate: {
      type: Date,
      default: Date.now,
    },
    delayDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    principalAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    interestAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    penalty: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    // Keep AGENT in the enum so legacy historical records remain readable.
    // This Admin-only controller creates new collections as ADMIN.
    collectorType: {
      type: String,
      enum: ["ADMIN", "AGENT"],
      default: "ADMIN",
      required: true,
    },
    // No DailyAgent ref: agent functionality is being retired.
    // Retained as an ObjectId field for compatibility with older records.
    collectorId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    paymentMethod: {
      type: String,
      enum: ["CASH", "UPI", "BANK_TRANSFER", "CHEQUE"],
      default: "CASH",
    },
    receiptNo: {
      type: String,
      unique: true,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["PAID", "PARTIAL", "PENDING"],
      default: "PAID",
    },
    remarks: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

loanCollectionSchema.index({ loan: 1, installmentNo: 1 });
loanCollectionSchema.index({ member: 1, paymentDate: -1 });

module.exports =
  mongoose.models.LoanCollection ||
  mongoose.model("LoanCollection", loanCollectionSchema);
