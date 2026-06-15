const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
{
  title: {
    type: String,
    required: true
  },

  category: {
    type: String,
    required: true
  },

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

  expenseDate: {
    type: Date,
    default: Date.now
  }
},
{
  timestamps: true
});

module.exports = mongoose.model(
  "DailyExpense",
  expenseSchema
);