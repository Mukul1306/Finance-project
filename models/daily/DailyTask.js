const mongoose = require("mongoose");

const dailyTaskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },

    assignedType: {
      type: String,
      enum: ["SPECIFIC", "ALL"],
      required: true,
      default: "SPECIFIC",
    },

    assignedAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DailyAgent",
      default: null,
    },

    frequency: {
      type: String,
      enum: ["ONCE", "DAILY", "WEEKLY", "MONTHLY"],
      required: true,
      default: "DAILY",
    },

    startDate: { type: Date, required: true },
    dueTime: { type: String, default: "18:00" },

    status: {
      type: String,
      enum: ["ACTIVE", "PAUSED", "ARCHIVED"],
      default: "ACTIVE",
    },

    createdBy: { type: String, default: "ADMIN" },
  },
  { timestamps: true }
);

dailyTaskSchema.index({ status: 1, frequency: 1 });
dailyTaskSchema.index({ assignedAgent: 1, status: 1 });

module.exports =
  mongoose.models.DailyTask ||
  mongoose.model("DailyTask", dailyTaskSchema);
