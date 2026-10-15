
const mongoose = require("mongoose");

const loanAdditionalPrincipalSchema = new mongoose.Schema(
  {
    loanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Loan",
      required: true,
      index: true,
    },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Members",
      default: null,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    disbursementDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    effectiveFrom: {
      type: Date,
      required: true,
    },
    paymentMode: {
      type: String,
      enum: ["Cash", "Bank Transfer", "UPI", "Cheque"],
      required: true,
    },
    remarks: {
      type: String,
      trim: true,
      default: "",
    },
    principalBefore: {
      type: Number,
      required: true,
    },
    principalAfter: {
      type: Number,
      required: true,
    },
    monthlyInterestBefore: {
      type: Number,
      required: true,
    },
    monthlyInterestAfter: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "LoanAdditionalPrincipal",
  loanAdditionalPrincipalSchema
);
