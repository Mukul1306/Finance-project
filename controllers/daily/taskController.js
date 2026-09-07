const DailyTask = require("../../models/daily/DailyTask");
const AgentTask = require("../../models/daily/AgentTask");
const Agent = require("../../models/daily/Agent");

const ACTIVE_AGENT_STATUSES = ["ACTIVE", "Active", "active"];

const getAgentIdFromRequest = (req) =>
  req.user?._id ||
  req.user?.id ||
  req.query?.agentId ||
  req.body?.agentId ||
  null;

const pad = (n) => String(n).padStart(2, "0");

const dateKey = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const addMonths = (date, months) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

const diffDays = (a, b) =>
  Math.floor(
    (startOfDay(a).getTime() - startOfDay(b).getTime()) /
      (24 * 60 * 60 * 1000)
  );

const setDueTime = (date, dueTime = "18:00") => {
  const d = new Date(date);
  const [hour, minute] = String(dueTime).split(":").map(Number);

  d.setHours(
    Number.isFinite(hour) ? hour : 18,
    Number.isFinite(minute) ? minute : 0,
    0,
    0
  );

  return d;
};

const getMonthOccurrenceDate = (anchor, monthIndex) => {
  const year = anchor.getFullYear();
  const month = anchor.getMonth() + monthIndex;
  const wantedDay = anchor.getDate();

  const first = new Date(year, month, 1);
  const lastDay = new Date(
    first.getFullYear(),
    first.getMonth() + 1,
    0
  ).getDate();

  return new Date(
    first.getFullYear(),
    first.getMonth(),
    Math.min(wantedDay, lastDay)
  );
};

/*
  Returns the occurrence containing the supplied date.
  null means the task has not started yet or the ONCE task is outside its date.
*/
const getOccurrenceForDate = (task, targetDate) => {
  const today = startOfDay(targetDate);
  const anchor = startOfDay(task.startDate);

  if (today < anchor) return null;

  if (task.frequency === "ONCE") {
    if (dateKey(today) !== dateKey(anchor)) return null;

    return {
      occurrenceKey: `ONCE-${dateKey(anchor)}`,
      periodStart: anchor,
      dueDate: setDueTime(anchor, task.dueTime),
    };
  }

  if (task.frequency === "DAILY") {
    return {
      occurrenceKey: dateKey(today),
      periodStart: today,
      dueDate: setDueTime(today, task.dueTime),
    };
  }

  if (task.frequency === "WEEKLY") {
    const daysFromStart = diffDays(today, anchor);
    const weekIndex = Math.floor(daysFromStart / 7);
    const periodStart = addDays(anchor, weekIndex * 7);
    const dueDate = setDueTime(addDays(periodStart, 6), task.dueTime);

    return {
      occurrenceKey: `WEEK-${dateKey(periodStart)}`,
      periodStart,
      dueDate,
    };
  }

  if (task.frequency === "MONTHLY") {
    let monthIndex =
      (today.getFullYear() - anchor.getFullYear()) * 12 +
      (today.getMonth() - anchor.getMonth());

    if (monthIndex < 0) return null;

    let periodStart = getMonthOccurrenceDate(anchor, monthIndex);

    // If the month occurrence day has not arrived yet, current month
    // belongs to the previous occurrence.
    if (today < periodStart) {
      monthIndex -= 1;
      if (monthIndex < 0) return null;
      periodStart = getMonthOccurrenceDate(anchor, monthIndex);
    }

    return {
      occurrenceKey: `MONTH-${dateKey(periodStart)}`,
      periodStart,
      dueDate: setDueTime(periodStart, task.dueTime),
    };
  }

  return null;
};

const getPreviousOccurrenceDate = (task, targetDate) => {
  const current = getOccurrenceForDate(task, targetDate);
  if (!current) return null;

  if (task.frequency === "ONCE") return null;

  if (task.frequency === "DAILY") {
    return addDays(targetDate, -1);
  }

  if (task.frequency === "WEEKLY") {
    return addDays(current.periodStart, -7);
  }

  if (task.frequency === "MONTHLY") {
    return addMonths(current.periodStart, -1);
  }

  return null;
};

const ensureTaskForAgent = async (task, agentId, targetDate) => {
  const occurrences = [];

  const current = getOccurrenceForDate(task, targetDate);
  if (current) occurrences.push(current);

  const previousDate = getPreviousOccurrenceDate(task, targetDate);
  if (previousDate) {
    const previous = getOccurrenceForDate(task, previousDate);
    if (
      previous &&
      !occurrences.some((item) => item.occurrenceKey === previous.occurrenceKey)
    ) {
      occurrences.push(previous);
    }
  }

  const docs = [];

  for (const occurrence of occurrences) {
    const doc = await AgentTask.findOneAndUpdate(
      {
        task: task._id,
        agent: agentId,
        occurrenceKey: occurrence.occurrenceKey,
      },
      {
        $setOnInsert: {
          task: task._id,
          agent: agentId,
          occurrenceKey: occurrence.occurrenceKey,
          periodStart: occurrence.periodStart,
          dueDate: occurrence.dueDate,
          status: "PENDING",
        },
      },
      {
        new: true,
        upsert: true,
      }
    );

    docs.push(doc);
  }

  return docs;
};

const markPastTasksMissed = async (docs) => {
  const now = new Date();

  for (const item of docs) {
    if (
      item.status === "PENDING" &&
      new Date(item.dueDate).getTime() < now.getTime()
    ) {
      item.status = "MISSED";
      await item.save();
    }
  }
};

const populateTask = (query) =>
  query
    .populate({
      path: "task",
      select:
        "title description assignedType assignedAgent frequency startDate dueTime status createdAt",
    })
    .populate({
      path: "agent",
      select: "name email mobile status",
    });

/* =========================================================
   ADMIN: CREATE TASK
   ========================================================= */
exports.createTask = async (req, res) => {
  try {
    const {
      title,
      description = "",
      assignedType = "SPECIFIC",
      assignedAgent = null,
      frequency = "DAILY",
      startDate,
      dueTime = "18:00",
    } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Task title is required",
      });
    }

    if (!["SPECIFIC", "ALL"].includes(assignedType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid assignment type",
      });
    }

    if (!["ONCE", "DAILY", "WEEKLY", "MONTHLY"].includes(frequency)) {
      return res.status(400).json({
        success: false,
        message: "Invalid frequency",
      });
    }

    if (!startDate || Number.isNaN(new Date(startDate).getTime())) {
      return res.status(400).json({
        success: false,
        message: "Valid start date is required",
      });
    }

    let agent = null;

    if (assignedType === "SPECIFIC") {
      if (!assignedAgent) {
        return res.status(400).json({
          success: false,
          message: "Please select an agent",
        });
      }

      agent = await Agent.findById(assignedAgent);

      if (!agent) {
        return res.status(404).json({
          success: false,
          message: "Agent not found",
        });
      }
    }

    const task = await DailyTask.create({
      title: title.trim(),
      description: description.trim(),
      assignedType,
      assignedAgent:
        assignedType === "SPECIFIC" ? assignedAgent : null,
      frequency,
      startDate: new Date(startDate),
      dueTime: /^\d{2}:\d{2}$/.test(dueTime)
        ? dueTime
        : "18:00",
      status: "ACTIVE",
      createdBy: "ADMIN",
    });

    // Create the current occurrence immediately so it appears
    // without waiting for cron.
    const agents =
      assignedType === "ALL"
        ? await Agent.find({
            status: { $in: ACTIVE_AGENT_STATUSES },
          }).select("_id")
        : [{ _id: assignedAgent }];

    for (const currentAgent of agents) {
      await ensureTaskForAgent(
        task,
        currentAgent._id,
        new Date()
      );
    }

    return res.status(201).json({
      success: true,
      message: "Task created successfully",
      task,
    });
  } catch (error) {
    console.error("CREATE TASK ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================================================
   ADMIN: GET TASKS + CURRENT AGENT STATUS
   ========================================================= */
exports.getTasks = async (req, res) => {
  try {
    const tasks = await DailyTask.find({
      status: { $ne: "ARCHIVED" },
    })
      .populate("assignedAgent", "name email mobile status")
      .sort({ createdAt: -1 });

    const result = [];

    for (const task of tasks) {
      const agents =
        task.assignedType === "ALL"
          ? await Agent.find({
              status: { $in: ACTIVE_AGENT_STATUSES },
            }).select("_id name email mobile status")
          : task.assignedAgent
          ? [task.assignedAgent]
          : [];

      const agentStatuses = [];

      for (const agent of agents) {
        const docs = await ensureTaskForAgent(
          task,
          agent._id,
          new Date()
        );

        await markPastTasksMissed(docs);

        const currentOccurrence =
          getOccurrenceForDate(task, new Date());

        const currentDoc = currentOccurrence
          ? await AgentTask.findOne({
              task: task._id,
              agent: agent._id,
              occurrenceKey: currentOccurrence.occurrenceKey,
            })
          : null;

        agentStatuses.push({
          agent,
          status: currentDoc?.status || "PENDING",
          dueDate: currentDoc?.dueDate || null,
          completedAt: currentDoc?.completedAt || null,
          completionNote: currentDoc?.completionNote || "",
          agentTaskId: currentDoc?._id || null,
        });
      }

      result.push({
        ...task.toObject(),
        agentStatuses,
      });
    }

    return res.json({
      success: true,
      tasks: result,
    });
  } catch (error) {
    console.error("GET TASKS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================================================
   ADMIN: GET TASK DETAILS / HISTORY
   ========================================================= */
exports.getTaskDetails = async (req, res) => {
  try {
    const task = await DailyTask.findById(req.params.id)
      .populate("assignedAgent", "name email mobile status");

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const assignments = await populateTask(
      AgentTask.find({ task: task._id }).sort({
        periodStart: -1,
        dueDate: -1,
      })
    );

    return res.json({
      success: true,
      task,
      assignments,
    });
  } catch (error) {
    console.error("GET TASK DETAILS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================================================
   ADMIN: PAUSE / ACTIVATE / ARCHIVE
   ========================================================= */
exports.updateTaskStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["ACTIVE", "PAUSED", "ARCHIVED"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task status",
      });
    }

    const task = await DailyTask.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    return res.json({
      success: true,
      message: `Task ${status.toLowerCase()} successfully`,
      task,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================================================
   AGENT: MY TASKS
   ========================================================= */
exports.getAgentTasks = async (req, res) => {
  try {
    const agentId = getAgentIdFromRequest(req);

    if (!agentId) {
      return res.status(400).json({
        success: false,
        message: "Agent ID is required",
      });
    }

    const agent = await Agent.findById(agentId).select(
      "_id name email mobile status"
    );

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: "Agent not found",
      });
    }

    const tasks = await DailyTask.find({
      status: "ACTIVE",
      $or: [
        { assignedType: "ALL" },
        { assignedType: "SPECIFIC", assignedAgent: agentId },
      ],
    }).sort({ createdAt: -1 });

    const assignments = [];

    for (const task of tasks) {
      const docs = await ensureTaskForAgent(
        task,
        agentId,
        new Date()
      );

      await markPastTasksMissed(docs);

      const current = getOccurrenceForDate(task, new Date());

      if (!current) continue;

      let currentDoc = await AgentTask.findOne({
        task: task._id,
        agent: agentId,
        occurrenceKey: current.occurrenceKey,
      });

      if (!currentDoc) continue;

      currentDoc = await populateTask(
        AgentTask.findById(currentDoc._id)
      );

      assignments.push(currentDoc);
    }

    return res.json({
      success: true,
      agent,
      tasks: assignments,
    });
  } catch (error) {
    console.error("GET AGENT TASKS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================================================
   AGENT: START TASK
   ========================================================= */
exports.startAgentTask = async (req, res) => {
  try {
    const agentId = getAgentIdFromRequest(req);

    if (!agentId) {
      return res.status(400).json({
        success: false,
        message: "Agent ID is required",
      });
    }

    const item = await AgentTask.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Task assignment not found",
      });
    }

    if (String(item.agent) !== String(agentId)) {
      return res.status(403).json({
        success: false,
        message: "This task is not assigned to you",
      });
    }

    if (item.status === "COMPLETED") {
      return res.status(400).json({
        success: false,
        message: "Task is already completed",
      });
    }

    if (item.status === "MISSED") {
      return res.status(400).json({
        success: false,
        message: "This task has already been missed",
      });
    }

    item.status = "IN_PROGRESS";
    item.startedAt = new Date();

    await item.save();

    return res.json({
      success: true,
      message: "Task started",
      assignment: item,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================================================
   AGENT: COMPLETE TASK
   ========================================================= */
exports.completeAgentTask = async (req, res) => {
  try {
    const agentId = getAgentIdFromRequest(req);
    const { completionNote = "" } = req.body;

    if (!agentId) {
      return res.status(400).json({
        success: false,
        message: "Agent ID is required",
      });
    }

    const item = await AgentTask.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Task assignment not found",
      });
    }

    if (String(item.agent) !== String(agentId)) {
      return res.status(403).json({
        success: false,
        message: "This task is not assigned to you",
      });
    }

    if (item.status === "MISSED") {
      return res.status(400).json({
        success: false,
        message: "This task is already missed",
      });
    }

    if (item.status === "COMPLETED") {
      return res.status(400).json({
        success: false,
        message: "Task is already completed",
      });
    }

    item.status = "COMPLETED";
    item.completedAt = new Date();
    item.completionNote = String(completionNote || "").trim();

    await item.save();

    return res.json({
      success: true,
      message: "Task completed successfully",
      assignment: item,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getAgentTaskHistory = async (req, res) => {
  try {
    const agentId = getAgentIdFromRequest(req);

    if (!agentId) {
      return res.status(400).json({
        success: false,
        message: "Agent ID is required",
      });
    }

    const assignments = await populateTask(
      AgentTask.find({ agent: agentId }).sort({
        dueDate: -1,
      })
    );

    return res.json({
      success: true,
      tasks: assignments,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
