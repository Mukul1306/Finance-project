const mongoose = require("mongoose");

const agentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },

  mobile: {
    type: String,
    required: true,
    unique: true
  },

  address: {
    type: String,
    required: true
  },

  password: {
    type: String,
    required: true
  },

  status: {
    type: String,
    default: "ACTIVE"
  },

  totalMembers: {
    type: Number,
    default: 0
  },

  todayCollection: {
    type: Number,
    default: 0
  },

  targetCollection: {
    type: Number,
    default: 10000
  },

  efficiency: {
    type: Number,
    default: 0
  }
},{
  timestamps:true
});

module.exports =
mongoose.model(
  "DailyAgent",
  agentSchema
);