const mongoose = require("mongoose");

const businessFundSchema = new mongoose.Schema({

  amount: {
    type: Number,
    required: true
  },

  paymentMethod: {
    type: String,
    enum: ["CASH", "UPI", "BANK"],
    default: "CASH"
  },

  note: {
    type: String,
    default: ""
  },

  fundDate: {
    type: Date,
    default: Date.now
  }

},{
  timestamps:true
});

module.exports = mongoose.model(
  "BusinessFund",
  businessFundSchema
);