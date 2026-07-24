const mongoose = require("mongoose");

const agentDepositSchema = new mongoose.Schema({

  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "DailyAgent",
    required: true
  },

  amount: {
    type: Number,
    required: true
  },

  paymentMode: {
    type: String,
    enum: ["CASH", "UPI", "BANK"],
    default: "CASH"
  },

  remark: {
    type: String,
    default: ""
  },

  receivedBy: {
    type: String,
    default: "ADMIN"
  },

  depositDate: {
    type: Date,
    default: Date.now
  }

}, {
  timestamps: true
});

module.exports = mongoose.model(
  "AgentDeposit",
  agentDepositSchema
);