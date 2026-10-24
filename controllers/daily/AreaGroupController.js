
const AreaGroup = require("../../models/daily/AreaGroup");

// CREATE AREA GROUP
exports.createAreaGroup = async (req, res) => {
  try {
    const {
      areaName,
      duration,
      durationType,
      maxMembers,
      startDate,
    } = req.body;

    // Validate required fields
    if (
      !areaName ||
      !duration ||
      !durationType ||
      !maxMembers ||
      !startDate
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const validDurationTypes = ["DAYS", "MONTHS", "YEARS"];

    if (!validDurationTypes.includes(durationType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid duration type",
      });
    }

    const parsedDuration = Number(duration);
    const parsedMaxMembers = Number(maxMembers);
    const parsedStartDate = new Date(startDate);

    if (
      !Number.isFinite(parsedDuration) ||
      parsedDuration <= 0 ||
      !Number.isInteger(parsedDuration) ||
      !Number.isFinite(parsedMaxMembers) ||
      parsedMaxMembers <= 0 ||
      !Number.isInteger(parsedMaxMembers) ||
      Number.isNaN(parsedStartDate.getTime())
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid duration, capacity, and start date",
      });
    }

    const endDate = new Date(parsedStartDate);

    if (durationType === "DAYS") {
      endDate.setDate(endDate.getDate() + parsedDuration);
    } else if (durationType === "MONTHS") {
      endDate.setMonth(endDate.getMonth() + parsedDuration);
    } else if (durationType === "YEARS") {
      endDate.setFullYear(endDate.getFullYear() + parsedDuration);
    }

    const group = await AreaGroup.create({
      areaName: areaName.trim(),
      duration: parsedDuration,
      durationType,
      maxMembers: parsedMaxMembers,
      startDate: parsedStartDate,
      endDate,
    });

    return res.status(201).json({
      success: true,
      message: "Area Group Created",
      group,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET ALL AREA GROUPS
exports.getAreaGroups = async (req, res) => {
  try {
    const groups = await AreaGroup.find().sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      groups,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET SINGLE AREA GROUP
exports.getAreaGroup = async (req, res) => {
  try {
    const group = await AreaGroup.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Area Group Not Found",
      });
    }

    return res.status(200).json({
      success: true,
      group,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// UPDATE AREA GROUP
exports.updateAreaGroup = async (req, res) => {
  try {
    const group = await AreaGroup.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Area Group Not Found",
      });
    }

    const {
      areaName,
      duration,
      durationType,
      maxMembers,
      startDate,
    } = req.body;

    // Update only supported fields
    if (areaName !== undefined) {
      if (typeof areaName !== "string" || !areaName.trim()) {
        return res.status(400).json({
          success: false,
          message: "Area name is required",
        });
      }

      group.areaName = areaName.trim();
    }

    if (duration !== undefined) {
      const parsedDuration = Number(duration);

      if (
        !Number.isInteger(parsedDuration) ||
        parsedDuration <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Duration must be a positive integer",
        });
      }

      group.duration = parsedDuration;
    }

    if (durationType !== undefined) {
      if (!["DAYS", "MONTHS", "YEARS"].includes(durationType)) {
        return res.status(400).json({
          success: false,
          message: "Invalid duration type",
        });
      }

      group.durationType = durationType;
    }

    if (maxMembers !== undefined) {
      const parsedMaxMembers = Number(maxMembers);

      if (
        !Number.isInteger(parsedMaxMembers) ||
        parsedMaxMembers <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Maximum members must be a positive integer",
        });
      }

      group.maxMembers = parsedMaxMembers;
    }

    if (startDate !== undefined) {
      const parsedStartDate = new Date(startDate);

      if (Number.isNaN(parsedStartDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid start date",
        });
      }

      group.startDate = parsedStartDate;
    }

    // Recalculate end date whenever duration settings change
    const endDate = new Date(group.startDate);

    if (group.durationType === "DAYS") {
      endDate.setDate(endDate.getDate() + Number(group.duration));
    } else if (group.durationType === "MONTHS") {
      endDate.setMonth(endDate.getMonth() + Number(group.duration));
    } else if (group.durationType === "YEARS") {
      endDate.setFullYear(endDate.getFullYear() + Number(group.duration));
    }

    group.endDate = endDate;

    await group.save();

    return res.status(200).json({
      success: true,
      message: "Area Group Updated",
      group,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// DELETE AREA GROUP
exports.deleteAreaGroup = async (req, res) => {
  try {
    const group = await AreaGroup.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Area Group Not Found",
      });
    }

    await group.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Area Deleted",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
