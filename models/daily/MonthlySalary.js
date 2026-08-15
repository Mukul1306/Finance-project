const mongoose = require("mongoose");

const monthlySalarySchema = new mongoose.Schema(
  {
    agent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DailyAgent",
      required: true
    },

    month: {
      type: Number,
      required: true
    },

    year: {
      type: Number,
      required: true
    },

    // ==============================
    // COLLECTION BREAKDOWN
    // ==============================

    dailySavingCollection: {
      type: Number,
      default: 0
    },

    dailyLoanCollection: {
      type: Number,
      default: 0
    },

    weeklyLoanCollection: {
      type: Number,
      default: 0
    },

    // ==============================
    // EXCLUDED COLLECTIONS
    // ==============================

    penaltyCollection: {
      type: Number,
      default: 0
    },

    monthlyLoanCollection: {
      type: Number,
      default: 0
    },

    fixedLoanCollection: {
      type: Number,
      default: 0
    },

    // ==============================
    // SALARY
    // ==============================

    eligibleCollection: {
      type: Number,
      default: 0
    },

    commissionRate: {
      type: Number,
      default: 2
    },

    calculatedSalary: {
      type: Number,
      default: 0
    },

    // ==============================
    // PAYMENT
    // ==============================

    paidAmount: {
      type: Number,
      default: 0
    },

    pendingAmount: {
      type: Number,
      default: 0
    },

    paidDate: {
      type: Date,
      default: null
    },

    paymentMode: {
      type: String,
      enum: [
        "CASH",
        "BANK",
        "UPI",
        "OTHER"
      ],
      default: "BANK"
    },

    paymentReference: {
      type: String,
      default: ""
    },

    remarks: {
      type: String,
      default: ""
    },

    status: {
      type: String,
      enum: [
        "PENDING",
        "PARTIAL",
        "PAID"
      ],
      default: "PENDING"
    }
  },
  {
    timestamps: true
  }
);

monthlySalarySchema.index(
  {
    agent: 1,
    month: 1,
    year: 1
  },
  {
    unique: true
  }
);

module.exports = mongoose.model(
  "MonthlySalary",
  monthlySalarySchema
);