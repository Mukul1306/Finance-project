const express = require("express");

const router = express.Router();

const {
  createTask,
  getTasks,
  getTaskDetails,
  updateTaskStatus,
  getAgentTasks,
  getAgentTaskHistory,
  startAgentTask,
  completeAgentTask,
} = require("../../controllers/daily/taskController");

// ==========================================
// ADMIN TASK MANAGEMENT
// ==========================================

router.post("/tasks", createTask);
router.get("/tasks", getTasks);
router.get("/tasks/:id", getTaskDetails);
router.put("/tasks/:id/status", updateTaskStatus);

// ==========================================
// AGENT TASK MANAGEMENT
// ==========================================

router.get("/agent/tasks", getAgentTasks);
router.get("/agent/tasks/history", getAgentTaskHistory);

router.put("/agent/tasks/:id/start", startAgentTask);
router.put("/agent/tasks/:id/complete", completeAgentTask);

module.exports = router;