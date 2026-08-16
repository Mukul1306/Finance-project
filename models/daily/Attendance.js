const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    // ==========================================
    // AGENT
    // ==========================================

    agent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DailyAgent",
      required: true,
      index: true
    },

    // ==========================================
    // ATTENDANCE DATE
    // ==========================================

    attendanceDate: {
      type: Date,
      required: true,
      index: true
    },

    // ==========================================
    // CHECK IN
    // ==========================================

    checkInTime: {
      type: Date,
      required: true
    },

    // ==========================================
    // LOCATION
    // ==========================================

    checkInLocation: {
      latitude: {
        type: Number,
        required: true
      },

      longitude: {
        type: Number,
        required: true
      },

      accuracy: {
        type: Number,
        default: null
      }
    },

    // ==========================================
    // CHECK OUT
    // ==========================================

    checkOutTime: {
      type: Date,
      default: null
    },

    workingMinutes: {
      type: Number,
      default: 0
    },

    // ==========================================
    // STATUS
    // ==========================================

    status: {
      type: String,
      enum: [
        "PRESENT",
        "ABSENT",
        "HALF_DAY",
        "LEAVE"
      ],
      default: "PRESENT"
    },

    remarks: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);


// ==========================================
// ONE ATTENDANCE PER AGENT PER DAY
// ==========================================

attendanceSchema.index(
  {
    agent: 1,
    attendanceDate: 1
  },
  {
    unique: true
  }
);


module.exports = mongoose.model(
  "DailyAttendance",
  attendanceSchema
);