const mongoose = require("mongoose");

const agentSchema = new mongoose.Schema({

  // ===========================
  // PERSONAL DETAILS
  // ===========================

  name: {
    type: String,
    required: true
  },

  fatherName: {
    type: String,
    required: true
  },

  gender: {
    type: String,
    enum: ["Male", "Female", "Other"],
    required: true
  },

  dob: {
    type: Date,
    required: true
  },

  email: {
    type: String,
    required: true,
    lowercase: true
  },

  mobile: {
    type: String,
    required: true,
    unique: true
  },

  alternateMobile: {
    type: String,
    default: ""
  },

  // ===========================
  // DOCUMENT DETAILS
  // ===========================

  aadhaarNumber: {
    type: String,
    required: true
  },

  aadhaarReceived: {
    type: Boolean,
    default: false
  },

  panNumber: {
    type: String,
    required: true
  },

  panReceived: {
    type: Boolean,
    default: false
  },

  stampPaperReceived: {
    type: Boolean,
    default: false
  },

  // ===========================
  // ADDRESS
  // ===========================

  address: {
    type: String,
    required: true
  },

  operationalArea: {
    type: String,
    required: true
  },

  // ===========================
  // LOGIN
  // ===========================

  password: {
    type: String,
    required: true
  },

  // ===========================
  // JOB DETAILS
  // ===========================

  joiningDate: {
    type: Date,
    required: true
  },

  status: {
    type: String,
    enum: ["ACTIVE", "INACTIVE"],
    default: "ACTIVE"
  },

  // ===========================
  // PERFORMANCE
  // ===========================

  totalMembers: {
    type: Number,
    default: 0
  },

  todayCollection: {
    type: Number,
    default: 0
  },

  totalCollection: {
    type: Number,
    default: 0
  },

  totalSubmitted: {
    type: Number,
    default: 0
  },

  pendingAmount: {
    type: Number,
    default: 0
  },

  targetCollection: {
    type: Number,
    default: 10000
  },
todayTarget: {
  type: Number,
  default: 0
},

todayPending: {
  type: Number,
  default: 0
},

// ===========================
// PENDING TILL TODAY
// ===========================

pendingTillToday: {
  type: Number,
  default: 0
},

savingPendingTillToday: {
  type: Number,
  default: 0
},

loanPendingTillToday: {
  type: Number,
  default: 0
},


  efficiency: {
    type: Number,
    default: 0
  }

}, {
  timestamps: true
});

module.exports = mongoose.model(
  "DailyAgent",
  agentSchema
);