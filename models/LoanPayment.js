const mongoose = require("mongoose");

const loanPaymentSchema = new mongoose.Schema({

  loanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Loan",
    required: true
  },

  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Member",
    required: true
  },

  emiNo: {
    type: Number,
    required: true
  },

  month: {
    type: String,
    required: true
  },

  year: {
    type: Number,
    required: true
  },

  dueDate: {
    type: Date,
    required: true
  },

  interestAmount: {
    type: Number,
    required: true
  },

  penaltyAmount: {
    type: Number,
    default: 0
  },

  totalReceived: {
    type: Number,
    required: true
  },

  paymentMode: {
    type: String,
    enum: ["Cash", "UPI", "Bank"],
    default: "Cash"
  },

  paymentDate: {
    type: Date,
    default: Date.now
  },

  remarks: {
    type: String,
    default: ""
  }

}, {
  timestamps: true
});

module.exports = mongoose.model("LoanPayment", loanPaymentSchema);