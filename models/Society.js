const mongoose = require("mongoose");

const societySchema = new mongoose.Schema({

  societyName: {
    type: String,
    required: true
  },

  startDate: {
    type: Date,
    required: true
  },

  durationMonths: {
    type: Number,
    required: true
  },

  maxMembers: {
    type: Number,
    required: true
  },

  currentMembers: {
    type: Number,
    default: 0
  },

  status: {
    type: String,
    default: "Active"
  }


},


{
  timestamps: true
});

module.exports =
mongoose.model(
  "Society",
  societySchema
);