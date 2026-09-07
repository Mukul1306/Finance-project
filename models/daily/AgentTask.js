const mongoose = require("mongoose");

const agentTaskSchema = new mongoose.Schema(
  {
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DailyTask",
      required: true,
    },

    agent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DailyAgent",
      required: true,
    },

    occurrenceKey: {
      type: String,
      required: true,
    },

    periodStart: {
      type: Date,
      required: true,
    },

    dueDate: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "IN_PROGRESS", "COMPLETED", "MISSED"],
      default: "PENDING",
    },

    startedAt: Date,
    completedAt: Date,

    completionNote: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

agentTaskSchema.index(
  { task: 1, agent: 1, occurrenceKey: 1 },
  { unique: true }
);

agentTaskSchema.index({ agent: 1, dueDate: 1, status: 1 });

module.exports =
  mongoose.models.AgentTask ||
  mongoose.model("AgentTask", agentTaskSchema);
