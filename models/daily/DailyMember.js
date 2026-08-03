const mongoose = require("mongoose");

const dailyMemberSchema = new mongoose.Schema({

  memberId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },

  memberName: {
    type: String,
    required: true,
    trim: true
  },

  fatherName: {
    type: String,
    required: true,
    trim: true
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
    default: ""
  },

  mobile: {
    type: String,
    required: true,
    unique: true,
    match: /^[0-9]{10}$/
  },
  password: {
  type: String,
  required: true
},


  alternateMobile: {
    type: String,
    default: ""
  },

  residentialAddress: {
    type: String,
    required: true
  },

  city: {
    type: String,
    required: true
  },

  district: {
    type: String,
    required: true
  },

  state: {
    type: String,
    required: true
  },

  pincode: {
    type: String,
    required: true
  },

  status: {
    type: String,
    enum: ["ACTIVE", "INACTIVE"],
    default: "ACTIVE"
  }

}, {
  timestamps: true
});

module.exports = mongoose.model(
  "DailyMember",
  dailyMemberSchema
);