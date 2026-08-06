const mongoose = require("mongoose");

const areaGroupSchema = new mongoose.Schema({

  areaName: {
    type: String,
    required: true
  },

  // Duration Value
  duration: {
    type: Number,
    required: true
  },

  // NEW FIELD
  durationType: {
    type: String,
    enum: ["DAYS", "MONTHS", "YEARS"],
    default: "DAYS"
  },

  maxMembers: {
    type: Number,
    required: true
  },

  startDate: {
    type: Date,
    required: true
  },

  // NEW FIELD
  endDate: {
    type: Date
  },

  assignedAgent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "DailyAgent",
    required: true
  },

  secondaryAgent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "DailyAgent",
    default: null
  },

  status: {
    type: String,
    default: "ACTIVE"
  },

  totalMembers: {
    type: Number,
    default: 0
  },

  totalCollection: {
    type: Number,
    default: 0
  }

}, {
  timestamps: true
});

module.exports = mongoose.model(
  "AreaGroup",
  areaGroupSchema
);