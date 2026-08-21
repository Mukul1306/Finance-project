// controllers/daily/attendanceController.js

const DailyAttendance = require(
  "../../models/daily/Attendance"
);

const DailyAgent = require(
  "../../models/daily/Agent"
);


// =====================================================
// CONFIGURATION
// =====================================================

const CHECK_IN_START = 9 * 60 + 30;   // 09:30
const FULL_DAY_CHECK_IN_LIMIT = 10 * 60; // 10:00
const ABSENT_CUTOFF = 13 * 60;        // 13:00

const FULL_DAY_CHECK_OUT_START = 18 * 60; // 18:00
const CHECK_OUT_END = 18 * 60 + 30;       // 18:30


// =====================================================
// TODAY RANGE
// =====================================================

const getTodayRange = () => {
  const now = new Date();

  const ist = getISTParts(now);

  const start = new Date(
    Date.UTC(
      ist.year,
      ist.month - 1,
      ist.day,
      0,
      0,
      0,
      0
    ) - (5 * 60 + 30) * 60 * 1000
  );

  const end = new Date(
    start.getTime() +
    24 * 60 * 60 * 1000
  );

  return {
    start,
    end
  };
};


// =====================================================
// TIME -> MINUTES
// =====================================================

const getISTParts = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);

  const values = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] = Number(part.value);
    }
  }

  return values;
};


const getMinutesFromDate = (
  date = new Date()
) => {
  const ist = getISTParts(date);

  return (
    ist.hour * 60 +
    ist.minute
  );
};

// =====================================================
// CHECK-IN STATUS
// =====================================================

const getCheckInStatus = (
  checkInTime
) => {

  const minutes =
    getMinutesFromDate(
      checkInTime
    );

  if (
    minutes >= CHECK_IN_START &&
    minutes < FULL_DAY_CHECK_IN_LIMIT
  ) {

    return "PRESENT";

  }


  if (
    minutes >= FULL_DAY_CHECK_IN_LIMIT &&
    minutes < ABSENT_CUTOFF
  ) {

    return "HALF_DAY";

  }


  return "ABSENT";
};


// =====================================================
// FINAL STATUS AT CHECKOUT
// =====================================================

const getFinalStatus = ({
  checkInTime,
  checkOutTime
}) => {

  const checkInMinutes =
    getMinutesFromDate(
      checkInTime
    );

  const checkOutMinutes =
    getMinutesFromDate(
      checkOutTime
    );


  // Late check-in can never become full day
  if (
    checkInMinutes >=
    ABSENT_CUTOFF
  ) {

    return "ABSENT";

  }


  // Checkout before 6 PM = half day
  if (
    checkOutMinutes <
    FULL_DAY_CHECK_OUT_START
  ) {

    return "HALF_DAY";

  }


  // 6:00 PM - 6:30 PM
  if (
    checkOutMinutes >=
      FULL_DAY_CHECK_OUT_START &&
    checkOutMinutes <=
      CHECK_OUT_END
  ) {

    // Only an on-time check-in can receive full day
    if (
      checkInMinutes >= CHECK_IN_START &&
      checkInMinutes < FULL_DAY_CHECK_IN_LIMIT
    ) {

      return "PRESENT";

    }

    return "HALF_DAY";

  }


  return "INVALID";
};


// =====================================================
// MARK ATTENDANCE
// =====================================================

exports.markAttendance = async (
  req,
  res
) => {

  try {

    const {
      agentId,
      latitude,
      longitude,
      accuracy
    } = req.body;


    // ================================================
    // VALIDATION
    // ================================================

    if (!agentId) {

      return res.status(400).json({

        success: false,

        message:
          "Agent ID is required"

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


    const lat =
      Number(latitude);

    const lng =
      Number(longitude);


    if (
      Number.isNaN(lat) ||
      Number.isNaN(lng)
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Invalid location"

      });

    }


    // ================================================
    // SERVER TIME
    // ================================================

    const now =
      new Date();

    const currentMinutes =
      getMinutesFromDate(
        now
      );


    // ================================================
    // CHECK-IN TIME WINDOW
    // ================================================

    if (
      currentMinutes <
      CHECK_IN_START
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Attendance can be marked from 9:30 AM"

      });

    }


    if (
      currentMinutes >=
      ABSENT_CUTOFF
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Attendance time is over. You are absent for today."

      });

    }


    // ================================================
    // CHECK AGENT
    // ================================================

    const agent =
      await DailyAgent.findById(
        agentId
      );


    if (!agent) {

      return res.status(404).json({

        success: false,

        message:
          "Agent not found"

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


    // ================================================
    // TODAY
    // ================================================

    const {
      start,
      end
    } = getTodayRange();


    // ================================================
    // CHECK EXISTING ATTENDANCE
    // ================================================

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

        attendance:
          existing

      });

    }


    // ================================================
    // INITIAL STATUS
    // ================================================

    const initialStatus =
      getCheckInStatus(
        now
      );


    // ================================================
    // CREATE ATTENDANCE
    // GPS IS KEPT
    // ================================================

    const attendance =
      await DailyAttendance.create({

        agent:
          agentId,

        attendanceDate:
          start,

        checkInTime:
          now,

        checkInLocation: {

          latitude:
            lat,

          longitude:
            lng,

          accuracy:
            accuracy !== undefined
              ? Number(accuracy)
              : null

        },

        status:
          initialStatus

      });


    // ================================================
    // RESPONSE
    // ================================================

    return res.status(201).json({

      success: true,

      message:
        initialStatus === "PRESENT"
          ? "Attendance marked successfully"
          : "Half-day attendance marked successfully",

      attendance

    });

  } catch (error) {

    console.error(
      "MARK ATTENDANCE ERROR:",
      error
    );


    if (
      error.code === 11000
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Today's attendance is already marked"

      });

    }


    return res.status(500).json({

      success: false,

      message:
        error.message

    });

  }

};


// =====================================================
// GET TODAY ATTENDANCE
// =====================================================

exports.getTodayAttendance =
async (
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

        agent:
          agentId,

        attendanceDate: {
          $gte: start,
          $lt: end
        }

      }).populate(
        "agent",
        "name mobile operationalArea status"
      );


    return res.json({

      success: true,

      attendance

    });

  } catch (error) {

    console.error(
      "GET TODAY ATTENDANCE ERROR:",
      error
    );


    return res.status(500).json({

      success: false,

      message:
        error.message

    });

  }

};


// =====================================================
// CHECK OUT
// =====================================================

exports.checkOut =
async (
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


    // ================================================
    // SERVER TIME
    // ================================================

    const now =
      new Date();

    const currentMinutes =
      getMinutesFromDate(
        now
      );


    // ================================================
    // CHECKOUT WINDOW
    // ================================================

    if (
      currentMinutes <
      CHECK_IN_START
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Checkout is not available yet"

      });

    }


    if (
      currentMinutes >
      CHECK_OUT_END
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Checkout is allowed only until 6:30 PM"

      });

    }


    // ================================================
    // TODAY
    // ================================================

    const {
      start,
      end
    } = getTodayRange();


    const attendance =
      await DailyAttendance.findOne({

        agent:
          agentId,

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


    if (
      attendance.checkOutTime
    ) {

      return res.status(400).json({

        success: false,

        message:
          "You have already checked out"

      });

    }


    // ================================================
    // CHECKOUT
    // ================================================

    const checkOutTime =
      now;


    attendance.checkOutTime =
      checkOutTime;


    // ================================================
    // WORKING MINUTES
    // ================================================

    const difference =
      checkOutTime -
      attendance.checkInTime;


    attendance.workingMinutes =
      Math.max(
        0,
        Math.floor(
          difference /
          60000
        )
      );


    // ================================================
    // FINAL STATUS
    // ================================================

    const finalStatus =
      getFinalStatus({

        checkInTime:
          attendance.checkInTime,

        checkOutTime:
          checkOutTime

      });


    if (
      finalStatus ===
      "INVALID"
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Invalid checkout time"

      });

    }


    attendance.status =
      finalStatus;


    await attendance.save();


    // ================================================
    // RESPONSE
    // ================================================

    return res.json({

      success: true,

      message:
        finalStatus === "PRESENT"
          ? "Full-day attendance completed"
          : "Half-day attendance completed",

      attendance

    });

  } catch (error) {

    console.error(
      "CHECK OUT ERROR:",
      error
    );


    return res.status(500).json({

      success: false,

      message:
        error.message

    });

  }

};


// =====================================================
// ADMIN — GET ATTENDANCE
// =====================================================

exports.getAttendance =
async (
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


    // ================================================
    // AGENT FILTER
    // ================================================

    if (agentId) {

      filter.agent =
        agentId;

    }


   if (date) {

  // -----------------------------------------------
  // ADMIN DATE IS INDIA DATE
  // -----------------------------------------------

  const [year, month, day] =
    date.split("-").map(Number);

  // IST midnight = previous day 18:30 UTC
  const start =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day,
        0,
        0,
        0,
        0
      ) - (5 * 60 + 30) * 60 * 1000
    );

  const end =
    new Date(
      start.getTime() +
      24 * 60 * 60 * 1000
    );

  filter.attendanceDate = {
    $gte: start,
    $lt: end
  };
}
    // ================================================
    // MONTH FILTER
    // ================================================

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

        $gte:
          start,

        $lt:
          end

      };

    }


    // ================================================
    // GET EXISTING RECORDS
    // ================================================

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


    return res.json({

      success: true,

      attendance

    });

  } catch (error) {

    console.error(
      "GET ATTENDANCE ERROR:",
      error
    );


    return res.status(500).json({

      success: false,

      message:
        error.message

    });

  }

};


// =====================================================
// MONTHLY ATTENDANCE REPORT
// =====================================================

exports.getMonthlyAttendance =
async (
  req,
  res
) => {

  try {

    const {
      month,
      year,
      agentId
    } = req.query;


    if (
      !month ||
      !year
    ) {

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

        message:
          "Invalid month"

      });

    }


    // ================================================
    // MONTH RANGE
    // ================================================

    const monthStart =
      new Date(
        selectedYear,
        selectedMonth - 1,
        1
      );

    const monthEnd =
      new Date(
        selectedYear,
        selectedMonth,
        1
      );


    // ================================================
    // REPORT ONLY UP TO TODAY
    // FUTURE DAYS = UPCOMING
    // ================================================

    const now =
      new Date();

    const todayStart =
      new Date(now);

    todayStart.setHours(
      0,
      0,
      0,
      0
    );


    const lastReportDate =
      todayStart <
      monthEnd
        ? todayStart
        : new Date(
            monthEnd
          );


    // ================================================
    // GET AGENTS
    // ================================================

    const agentFilter =
      agentId
        ? { _id: agentId }
        : {};


    const agents =
      await DailyAgent.find(
        agentFilter
      )
      .select(
        "name mobile operationalArea status"
      );


    // ================================================
    // GET REAL ATTENDANCE
    // ================================================

    const attendanceFilter = {

      attendanceDate: {

        $gte:
          monthStart,

        $lt:
          monthEnd

      }

    };


    if (agentId) {

      attendanceFilter.agent =
        agentId;

    }


    const attendance =
      await DailyAttendance.find(
        attendanceFilter
      )
      .populate(
        "agent",
        "name mobile operationalArea status"
      )
      .sort({
        attendanceDate: 1,
        checkInTime: 1
      });


    // ================================================
    // MAP REAL ATTENDANCE
    // ================================================

    const attendanceMap =
      new Map();


    attendance.forEach(
      record => {

        if (!record.agent) {
          return;
        }


        const agentKey =
          record.agent._id.toString();


     const dateKey =
  getISTDateKey(
    record.attendanceDate
  );


        attendanceMap.set(
          `${agentKey}_${dateKey}`,
          record
        );

      }
    );


    // ================================================
    // BUILD REPORT
    // ================================================

    const report =
      agents.map(
        agent => {

          const agentKey =
            agent._id.toString();


          const records = [];

          let present = 0;
          let halfDay = 0;
          let absent = 0;
          let totalWorkingMinutes = 0;


          // ============================================
          // DAYS IN SELECTED MONTH
          // ============================================

          const totalDays =
            new Date(
              selectedYear,
              selectedMonth,
              0
            ).getDate();


          for (
            let day = 1;
            day <= totalDays;
            day++
          ) {

            const currentDate =
              new Date(
                selectedYear,
                selectedMonth - 1,
                day
              );


            currentDate.setHours(
              0,
              0,
              0,
              0
            );


            // Future date
            if (
              currentDate >
              todayStart
            ) {

              records.push({

                attendanceDate:
                  currentDate,

                status:
                  "UPCOMING",

                checkInTime:
                  null,

                checkOutTime:
                  null,

                workingMinutes:
                  0,

                checkInLocation:
                  null,

                virtual:
                  true

              });

              continue;

            }


            // ==========================================
            // TODAY BEFORE 1 PM
            // NOT ABSENT YET
            // ==========================================

            const isToday =
              currentDate.getTime() ===
              todayStart.getTime();


            const currentMinutes =
              getMinutesFromDate(
                now
              );


            const key =
              `${agentKey}_${getDateKey(
                currentDate
              )}`;


            const realRecord =
              attendanceMap.get(
                key
              );


            if (
              realRecord
            ) {

              records.push(
                realRecord
              );


              if (
                realRecord.status ===
                "PRESENT"
              ) {

                present++;

              }


              if (
                realRecord.status ===
                "HALF_DAY"
              ) {

                halfDay++;

              }


              if (
                realRecord.status ===
                "ABSENT"
              ) {

                absent++;

              }


              totalWorkingMinutes +=
                Number(
                  realRecord.workingMinutes ||
                  0
                );

              continue;

            }


            // ==========================================
            // TODAY BEFORE 1 PM = UPCOMING
            // ==========================================

            if (
              isToday &&
              currentMinutes <
                ABSENT_CUTOFF
            ) {

              records.push({

                attendanceDate:
                  currentDate,

                status:
                  "UPCOMING",

                checkInTime:
                  null,

                checkOutTime:
                  null,

                workingMinutes:
                  0,

                checkInLocation:
                  null,

                virtual:
                  true

              });

              continue;

            }


            // ==========================================
            // NO RECORD = ABSENT
            // ==========================================

            records.push({

              attendanceDate:
                currentDate,

              status:
                "ABSENT",

              checkInTime:
                null,

              checkOutTime:
                null,

              workingMinutes:
                0,

              checkInLocation:
                null,

              virtual:
                true

            });


            absent++;

          }


          // ============================================
          // ATTENDANCE RATE
          // Don't count FUTURE / UPCOMING days
          // ============================================

          const countedDays =
            records.filter(
              record =>
                record.status ===
                  "PRESENT" ||
                record.status ===
                  "HALF_DAY" ||
                record.status ===
                  "ABSENT"
            ).length;


          const attendanceRate =
            countedDays > 0

              ? (
                  (
                    present +
                    halfDay * 0.5
                  ) /
                  countedDays
                ) * 100

              : 0;


          return {

            agent,

            present,

            absent,

            halfDay,

            totalRecords:
              countedDays,

            attendanceRate:
              Number(
                attendanceRate.toFixed(2)
              ),

            totalWorkingMinutes,

            attendance:
              records

          };

        }
      );


    return res.json({

      success:
        true,

      month:
        selectedMonth,

      year:
        selectedYear,

      totalAgents:
        report.length,

      report

    });

  } catch (error) {

    console.error(
      "MONTHLY ATTENDANCE ERROR:",
      error
    );


    return res.status(500).json({

      success:
        false,

      message:
        error.message

    });

  }

};


// =====================================================
// HELPER
// =====================================================

function getDateKey(dateValue) {

  const d =
    new Date(
      dateValue
    );

  return [
    d.getFullYear(),
    String(
      d.getMonth() + 1
    ).padStart(2, "0"),
    String(
      d.getDate()
    ).padStart(2, "0")
  ].join("-");

}