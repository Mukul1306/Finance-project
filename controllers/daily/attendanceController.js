const DailyAttendance = require(
  "../../models/daily/Attendance"
);

const DailyAgent = require(
  "../../models/daily/Agent"
);


// =====================================================
// HELPER — START OF TODAY
// =====================================================

const getTodayRange = () => {

  const start = new Date();

  start.setHours(0, 0, 0, 0);


  const end = new Date(start);

  end.setDate(
    end.getDate() + 1
  );


  return {
    start,
    end
  };

};


// =====================================================
// MARK ATTENDANCE
// =====================================================

exports.markAttendance = async (req, res) => {

  try {

    const {
      agentId,
      latitude,
      longitude,
      accuracy
    } = req.body;


    // ==========================================
    // VALIDATION
    // ==========================================

    if (!agentId) {

      return res.status(400).json({

        success: false,

        message: "Agent ID is required"

      });

    }


    if (
      latitude === undefined ||
      longitude === undefined
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Location is required to mark attendance"

      });

    }


    const lat = Number(latitude);
    const lng = Number(longitude);


    if (
      Number.isNaN(lat) ||
      Number.isNaN(lng)
    ) {

      return res.status(400).json({

        success: false,

        message: "Invalid location"

      });

    }


    // ==========================================
    // CHECK AGENT
    // ==========================================

    const agent =
      await DailyAgent.findById(agentId);


    if (!agent) {

      return res.status(404).json({

        success: false,

        message: "Agent not found"

      });

    }


    if (
      agent.status &&
      agent.status !== "ACTIVE"
    ) {

      return res.status(403).json({

        success: false,

        message:
          "Inactive agent cannot mark attendance"

      });

    }


    // ==========================================
    // TODAY
    // ==========================================

    const {
      start,
      end
    } = getTodayRange();


    // ==========================================
    // CHECK EXISTING ATTENDANCE
    // ==========================================

    const existing =
      await DailyAttendance.findOne({

        agent: agentId,

        attendanceDate: {
          $gte: start,
          $lt: end
        }

      });


    if (existing) {

      return res.status(400).json({

        success: false,

        message:
          "Today's attendance is already marked",

        attendance: existing

      });

    }


    // ==========================================
    // CREATE ATTENDANCE
    // ==========================================

    const attendance =
      await DailyAttendance.create({

        agent: agentId,

        attendanceDate: start,

        checkInTime: new Date(),

        checkInLocation: {

          latitude: lat,

          longitude: lng,

          accuracy:
            accuracy !== undefined
              ? Number(accuracy)
              : null

        },

        status: "PRESENT"

      });


    // ==========================================
    // RESPONSE
    // ==========================================

    res.status(201).json({

      success: true,

      message:
        "Attendance marked successfully",

      attendance

    });

  } catch (error) {

    console.error(
      "MARK ATTENDANCE ERROR:",
      error
    );


    // Duplicate index protection
    if (error.code === 11000) {

      return res.status(400).json({

        success: false,

        message:
          "Today's attendance is already marked"

      });

    }


    res.status(500).json({

      success: false,

      message: error.message

    });

  }

};


// =====================================================
// GET TODAY ATTENDANCE
// =====================================================

exports.getTodayAttendance = async (
  req,
  res
) => {

  try {

    const {
      agentId
    } = req.params;


    const {
      start,
      end
    } = getTodayRange();


    const attendance =
      await DailyAttendance.findOne({

        agent: agentId,

        attendanceDate: {
          $gte: start,
          $lt: end
        }

      }).populate(
        "agent",
        "name mobile operationalArea"
      );


    res.json({

      success: true,

      attendance

    });

  } catch (error) {

    console.error(
      "GET TODAY ATTENDANCE ERROR:",
      error
    );


    res.status(500).json({

      success: false,

      message: error.message

    });

  }

};


// =====================================================
// CHECK OUT
// =====================================================

exports.checkOut = async (
  req,
  res
) => {

  try {

    const {
      agentId
    } = req.body;


    if (!agentId) {

      return res.status(400).json({

        success: false,

        message:
          "Agent ID is required"

      });

    }


    const {
      start,
      end
    } = getTodayRange();


    const attendance =
      await DailyAttendance.findOne({

        agent: agentId,

        attendanceDate: {
          $gte: start,
          $lt: end
        }

      });


    if (!attendance) {

      return res.status(404).json({

        success: false,

        message:
          "Please mark attendance first"

      });

    }


    if (attendance.checkOutTime) {

      return res.status(400).json({

        success: false,

        message:
          "You have already checked out"

      });

    }


    const checkOutTime =
      new Date();


    attendance.checkOutTime =
      checkOutTime;


    // ==========================================
    // WORKING MINUTES
    // ==========================================

    const difference =
      checkOutTime -
      attendance.checkInTime;


    attendance.workingMinutes =
      Math.max(
        0,
        Math.floor(
          difference / 60000
        )
      );


    await attendance.save();


    res.json({

      success: true,

      message:
        "Checked out successfully",

      attendance

    });

  } catch (error) {

    console.error(
      "CHECK OUT ERROR:",
      error
    );


    res.status(500).json({

      success: false,

      message: error.message

    });

  }

};


// =====================================================
// ADMIN — GET ATTENDANCE
// =====================================================

exports.getAttendance = async (
  req,
  res
) => {

  try {

    const {
      date,
      month,
      year,
      agentId
    } = req.query;


    let filter = {};


    // ==========================================
    // SPECIFIC AGENT
    // ==========================================

    if (agentId) {

      filter.agent = agentId;

    }


    // ==========================================
    // SPECIFIC DATE
    // ==========================================

    if (date) {

      const start =
        new Date(date);

      start.setHours(
        0,
        0,
        0,
        0
      );


      const end =
        new Date(start);

      end.setDate(
        end.getDate() + 1
      );


      filter.attendanceDate = {

        $gte: start,

        $lt: end

      };

    }


    // ==========================================
    // MONTH + YEAR
    // ==========================================

    else if (
      month &&
      year
    ) {

      const start =
        new Date(
          Number(year),
          Number(month) - 1,
          1
        );


      const end =
        new Date(
          Number(year),
          Number(month),
          1
        );


      filter.attendanceDate = {

        $gte: start,

        $lt: end

      };

    }


    const attendance =
      await DailyAttendance.find(
        filter
      )
      .populate(
        "agent",
        "name mobile operationalArea status"
      )
      .sort({
        attendanceDate: -1,
        checkInTime: -1
      });


    res.json({

      success: true,

      attendance

    });

  } catch (error) {

    console.error(
      "GET ATTENDANCE ERROR:",
      error
    );


    res.status(500).json({

      success: false,

      message: error.message

    });

  }

};