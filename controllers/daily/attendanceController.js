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
// =====================================================
// MONTHLY ATTENDANCE REPORT
// =====================================================

exports.getMonthlyAttendance = async (req, res) => {

  try {

    const {
      month,
      year,
      agentId
    } = req.query;


    // ==========================================
    // VALIDATION
    // ==========================================

    if (!month || !year) {

      return res.status(400).json({

        success: false,

        message:
          "Month and year are required"

      });

    }


    const selectedMonth =
      Number(month);

    const selectedYear =
      Number(year);


    if (
      selectedMonth < 1 ||
      selectedMonth > 12
    ) {

      return res.status(400).json({

        success: false,

        message: "Invalid month"

      });

    }


    // ==========================================
    // MONTH RANGE
    // ==========================================

    const start =
      new Date(
        selectedYear,
        selectedMonth - 1,
        1
      );

    const end =
      new Date(
        selectedYear,
        selectedMonth,
        1
      );


    // ==========================================
    // FILTER
    // ==========================================

    const filter = {

      attendanceDate: {
        $gte: start,
        $lt: end
      }

    };


    // ==========================================
    // SPECIFIC AGENT
    // ==========================================

    if (agentId) {

      filter.agent = agentId;

    }


    // ==========================================
    // GET ATTENDANCE
    // ==========================================

    const attendance =
      await DailyAttendance.find(
        filter
      )
      .populate(
        "agent",
        "name mobile operationalArea status"
      )
      .sort({
        attendanceDate: 1,
        checkInTime: 1
      });


    // ==========================================
    // GROUP BY AGENT
    // ==========================================

    const agentMap = {};


    attendance.forEach(
      record => {

        if (!record.agent) {
          return;
        }


        const id =
          record.agent._id.toString();


        if (!agentMap[id]) {

          agentMap[id] = {

            agent: record.agent,

            attendance: [],

            present: 0,

            absent: 0,

            halfDay: 0,

            totalWorkingMinutes: 0

          };

        }


        agentMap[id].attendance.push(
          record
        );


        if (
          record.status ===
          "PRESENT"
        ) {

          agentMap[id].present++;

        }


        if (
          record.status ===
          "ABSENT"
        ) {

          agentMap[id].absent++;

        }


        if (
          record.status ===
          "HALF_DAY"
        ) {

          agentMap[id].halfDay++;

        }


        agentMap[id].totalWorkingMinutes +=
          record.workingMinutes || 0;

      }
    );


    // ==========================================
    // FINAL MONTHLY REPORT
    // ==========================================

    const report =
      Object.values(
        agentMap
      ).map(item => {

        const totalRecords =
          item.attendance.length;


        const attendanceRate =
          totalRecords > 0

            ? (
                (
                  item.present +
                  item.halfDay * 0.5
                ) /
                totalRecords
              ) * 100

            : 0;


        return {

          agent:
            item.agent,

          present:
            item.present,

          absent:
            item.absent,

          halfDay:
            item.halfDay,

          totalRecords,

          attendanceRate:
            Number(
              attendanceRate.toFixed(2)
            ),

          totalWorkingMinutes:
            item.totalWorkingMinutes,

          attendance:
            item.attendance

        };

      });


    // ==========================================
    // RESPONSE
    // ==========================================

    res.json({

      success: true,

      month: selectedMonth,

      year: selectedYear,

      totalAgents:
        report.length,

      report

    });

  } catch (error) {

    console.error(
      "MONTHLY ATTENDANCE ERROR:",
      error
    );


    res.status(500).json({

      success: false,

      message: error.message

    });

  }

};