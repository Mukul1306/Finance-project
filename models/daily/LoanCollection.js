const mongoose = require("mongoose");

const loanCollectionSchema = new mongoose.Schema({

  // ==========================================
  // LOAN
  // ==========================================

  loan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "DailyLoan",
    required: true
  },

  member: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "DailyMember",
    required: true
  },

  // ==========================================
  // INSTALLMENT
  // ==========================================

  installmentNo: {
    type: Number,
    required: true
  },

  emiType: {
    type: String,
    enum: [
      "DAILY",
      "WEEKLY",
      "MONTHLY",
      "FIXED_INTEREST",
      "PRINCIPAL"
    ],
    required: true
  },

  dueDate: {
    type: Date
  },

  paymentDate: {
    type: Date,
    default: Date.now
  },

  delayDays: {
    type: Number,
    default: 0
  },

  // ==========================================
  // AMOUNTS
  // ==========================================

  principalAmount: {
    type: Number,
    default: 0
  },

  interestAmount: {
    type: Number,
    default: 0
  },

  penalty: {
    type: Number,
    default: 0
  },

  totalAmount: {
    type: Number,
    required: true
  },

  // ==========================================
  // COLLECTION
  // ==========================================

  collectorType: {
    type: String,
    enum: ["ADMIN", "AGENT"],
    required: true
  },

  collectorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "DailyAgent",
    default: null
  },
dueDate: {
    type: Date
},

delayDays: {
    type: Number,
    default: 0
},
  paymentMethod: {
    type: String,
    enum: [
      "CASH",
      "UPI",
      "BANK_TRANSFER",
      "CHEQUE"
    ],
    default: "CASH"
  },

  receiptNo: {
    type: String,
    unique: true,
    required: true
  },

  // ==========================================
  // STATUS
  // ==========================================

  status: {
    type: String,
    enum: [
      "PAID",
      "PARTIAL",
      "PENDING"
    ],
    default: "PAID"
  },

  remarks: {
    type: String,
    default: ""
  }

}, {
  timestamps: true
});

module.exports =
mongoose.models.LoanCollection ||
mongoose.model(
  "LoanCollection",
  loanCollectionSchema
);