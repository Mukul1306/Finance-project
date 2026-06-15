const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema({
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
    default: "Cash"
  },

  note: {
    type: String,
    default: ""
  }
},{
  timestamps:true
});

// models/Expense.js

module.exports = mongoose.model(
  "SocietyExpense",
  expenseSchema
);