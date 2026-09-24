const mongoose = require("mongoose");
const DailySaving = require("../../models/daily/DailySaving");
const DailyMember = require("../../models/daily/DailyMember");
const DailyTransaction = require("../../models/daily/DailyTransaction");
const DailyAgent = require("../../models/daily/Agent");
const AreaGroup = require("../../models/daily/AreaGroup");
const DailyLoan = require("../../models/daily/DailyLoan");
const LoanCollection = require("../../models/daily/LoanCollection");
// =====================================================
// IST DATE HELPERS
// =====================================================

function getISTDateKey(dateValue) {

  const parts =
    new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(
      new Date(dateValue)
    );

  const values = {};

  for (const part of parts) {

    if (part.type !== "literal") {
      values[part.type] = part.value;
    }

  }

  return `${values.year}-${values.month}-${values.day}`;
}


// =====================================================
// ADD DAYS TO YYYY-MM-DD
// =====================================================

function addDaysToDateKey(
  dateKey,
  days
) {

  const [
    year,
    month,
    day
  ] =
    dateKey
      .split("-")
      .map(Number);

  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    );

  date.setUTCDate(
    date.getUTCDate() + days
  );

  return date
    .toISOString()
    .slice(0, 10);
}


// =====================================================
// CONVERT IST DATE KEY TO DATE
// =====================================================

function istDateKeyToDate(
  dateKey
) {

  return new Date(
    `${dateKey}T00:00:00+05:30`
  );

}
exports.getPendingDays = async (req, res) => {
  try {

    const saving =
      await DailySaving.findById(req.params.id)
        .populate(
          "member",
          "memberId memberName mobile"
        )
        .populate(
          "areaGroup",
          "areaName"
        )
        .populate(
          "assignedAgent",
          "name"
        );

    if (!saving) {
      return res.status(404).json({
        success: false,
        message: "Saving Account Not Found"
      });
    }


    // =====================================================
    // ALL PAYMENTS FOR THIS SAVING ACCOUNT
    // =====================================================

    const transactions =
      await DailyTransaction.find({
        savingAccount: saving._id
      });


    // =====================================================
    // PAID DATES
    //
    // IMPORTANT:
    // paymentForDate = WHICH SAVING DAY WAS PAID
    // =====================================================

    const paidDates = new Set();

    transactions.forEach((item) => {

      const paidDate =
        item.paymentForDate ||
        item.collectionDate;

      if (!paidDate) return;

      const dateKey =
        getISTDateKey(paidDate);

      paidDates.add(dateKey);
    });


    // =====================================================
    // TODAY
    // =====================================================

    const todayKey =
      getISTDateKey(new Date());


    // =====================================================
    // END DATE
    // =====================================================

    const endKey =
      getISTDateKey(
        saving.endDate
      );


    // =====================================================
    // START DATE
    // =====================================================

    const startKey =
      getISTDateKey(
        saving.startDate
      );


    // =====================================================
    // FIND ACTUAL PENDING DAYS
    // =====================================================

    const pendingDays = [];

    let currentKey =
      startKey;


    while (
      currentKey <= todayKey &&
      currentKey <= endKey
    ) {

      // -----------------------------------------------
      // ALREADY PAID
      // -----------------------------------------------

      if (
        paidDates.has(currentKey)
      ) {

        currentKey =
          addDaysToDateKey(
            currentKey,
            1
          );

        continue;
      }


      // -----------------------------------------------
      // CALCULATE PENALTY
      // -----------------------------------------------

      const currentDate =
        istDateKeyToDate(
          currentKey
        );

      const todayDate =
        istDateKeyToDate(
          todayKey
        );


      const diffDays =
        Math.floor(
          (
            todayDate -
            currentDate
          ) /
          (
            1000 *
            60 *
            60 *
            24
          )
        );


      let penalty = 0;


      if (
        diffDays >
        Number(
          saving.graceDays || 0
        )
      ) {

        if (
          saving.penaltyType ===
          "FIXED"
        ) {

          penalty =
            Number(
              saving.penaltyValue || 0
            );

        } else {

          const dailyAmount =
            Number(
              saving.fixedAmount || 0
            );

          penalty =
            Math.round(
              dailyAmount *
              Number(
                saving.penaltyValue || 0
              ) /
              100
            );
        }
      }


      // -----------------------------------------------
      // DAILY AMOUNT
      // -----------------------------------------------

      const dailyAmount =
        saving.collectionType === "FIXED"
          ? Number(
              saving.fixedAmount || 0
            )
          : 0;


      // -----------------------------------------------
      // ADD PENDING DAY
      // -----------------------------------------------

     // ===============================================
// EMI / INSTALLMENT NUMBER
// ===============================================

// Calculate EMI number from saving start date
const installmentNo =
  Math.floor(
    (
      istDateKeyToDate(currentKey) -
      istDateKeyToDate(startKey)
    ) /
    (1000 * 60 * 60 * 24)
  ) + 1;


// ===============================================
// ADD PENDING DAY
// ===============================================

pendingDays.push({

  // EMI number
  installmentNo,

  // Saving date
  date:
    `${currentKey}T00:00:00+05:30`,

  dailyAmount,

  penalty,

  total:
    dailyAmount +
    penalty
});


      currentKey =
        addDaysToDateKey(
          currentKey,
          1
        );
    }


    // =====================================================
    // RESPONSE
    // =====================================================

    return res.json({

      success: true,

      saving,

      pendingDays

    });


  } catch (error) {

    console.error(
      "GET PENDING DAYS ERROR:",
      error
    );

    return res.status(500).json({

      success: false,

      message: error.message

    });
  }
};


exports.collectPendingPayment =
async (req, res) => {

  try {

    const {
      savingId,
      pendingDate,
      collectorType = "AGENT",
      collectorId,
      paymentMethod,
      amount
    } = req.body;


    // =====================================================
    // VALIDATION
    // =====================================================

    if (!savingId) {

      return res.status(400).json({

        success: false,

        message:
          "Saving ID is required"

      });

    }


    if (!pendingDate) {

      return res.status(400).json({

        success: false,

        message:
          "Pending date is required"

      });

    }


    // =====================================================
    // SAVING
    // =====================================================

    const saving =
      await DailySaving.findById(
        savingId
      )
        .populate("member")
        .populate("assignedAgent")
        .populate("areaGroup");


    if (!saving) {

      return res.status(404).json({

        success: false,

        message:
          "Saving Account Not Found"

      });

    }


    // =====================================================
    // GET THE CALENDAR DATE
    // =====================================================

    const requestedDate =
      new Date(
        pendingDate
      );


    if (
      Number.isNaN(
        requestedDate.getTime()
      )
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Invalid pending date"

      });

    }


    // =====================================================
    // IMPORTANT
    //
    // Extract the DATE IN IST.
    //
    // We do NOT use setHours(0,0,0,0)
    // because Render/server timezone may be UTC.
    // =====================================================

    const paymentDateKey =
      getISTDateKey(
        requestedDate
      );


    const paymentDate =
      istDateKeyToDate(
        paymentDateKey
      );


    const nextDay =
      istDateKeyToDate(
        addDaysToDateKey(
          paymentDateKey,
          1
        )
      );


    // =====================================================
    // CHECK THIS EXACT SAVING DAY
    // =====================================================

    const already =
      await DailyTransaction.findOne({

        savingAccount:
          saving._id,

        paymentForDate: {

          $gte:
            paymentDate,

          $lt:
            nextDay

        }

      });


    if (already) {

      return res.status(400).json({

        success: false,

        message:
          "This day's payment already collected."

      });

    }


    // =====================================================
    // DAILY AMOUNT
    // =====================================================

    let dailyAmount = 0;


    if (
      saving.collectionType ===
      "FIXED"
    ) {

      dailyAmount =
        Number(
          saving.fixedAmount || 0
        );

    } else {

      dailyAmount =
        Number(
          amount || 0
        );

    }


    if (
      !dailyAmount ||
      dailyAmount <= 0
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Invalid payment amount"

      });

    }


    // =====================================================
    // TODAY IN IST
    // =====================================================

    const todayKey =
      getISTDateKey(
        new Date()
      );


    const todayDate =
      istDateKeyToDate(
        todayKey
      );


    // =====================================================
    // PENALTY
    // =====================================================

    const diffDays =
      Math.floor(
        (
          todayDate -
          paymentDate
        ) /
        (
          1000 *
          60 *
          60 *
          24
        )
      );


    let penalty = 0;


    if (
      diffDays >
      Number(
        saving.graceDays || 0
      )
    ) {

      if (
        saving.penaltyType ===
        "FIXED"
      ) {

        penalty =
          Number(
            saving.penaltyValue || 0
          );

      } else {

        penalty =
          Math.round(
            dailyAmount *
            Number(
              saving.penaltyValue || 0
            ) /
            100
          );

      }

    }


    const totalAmount =
      dailyAmount +
      penalty;


    // =====================================================
    // CREATE TRANSACTION
    // =====================================================

await DailyTransaction.create({

  savingAccount:
    saving._id,

  member:
    saving.member._id,

  area:
    saving.areaGroup._id,

  collectorType,

  collectorId:
    collectorType === "ADMIN"
      ? null
      : collectorId,

  // ACTUAL DATE MONEY WAS COLLECTED
  collectionDate:
    new Date(),

  // THE SAVING DAY BEING PAID
  paymentForDate:
    paymentDate,

  dailyAmount,

  penalty,

  totalAmount,

  paymentMethod

});


    // =====================================================
    // UPDATE SAVING
    // =====================================================

    saving.totalSaved =
      Number(
        saving.totalSaved || 0
      ) +
      dailyAmount;


    saving.totalPenalty =
      Number(
        saving.totalPenalty || 0
      ) +
      penalty;


    saving.totalDaysPaid =
      Number(
        saving.totalDaysPaid || 0
      ) +
      1;


    saving.completedDays =
      saving.totalDaysPaid;


    saving.lastCollectionDate =
      new Date();


    await saving.save();


    // =====================================================
    // UPDATE AGENT
    // =====================================================

    if (
      saving.assignedAgent?._id
    ) {

      await DailyAgent.findByIdAndUpdate(

        saving.assignedAgent._id,

        {
          $inc: {

            todayCollection:
              totalAmount,

            totalCollection:
              totalAmount

          }

        }

      );

    }


    // =====================================================
    // UPDATE AREA
    // =====================================================

    if (
      saving.areaGroup?._id
    ) {

      await AreaGroup.findByIdAndUpdate(

        saving.areaGroup._id,

        {
          $inc: {

            totalCollection:
              totalAmount

          }

        }

      );

    }


    // =====================================================
    // RESPONSE
    // =====================================================

    return res.status(201).json({

      success: true,

      message:
        "Payment Collected Successfully",

      dailyAmount,

      penalty,

      totalAmount,

      paymentForDate:
        paymentDate

    });


  } catch (error) {

    console.error(
      "COLLECT PENDING PAYMENT ERROR:",
      error
    );


    return res.status(500).json({

      success: false,

      message:
        error.message

    });

  }

};


exports.getMemberSaving = async(req,res)=>{

try{

const saving =
await DailySaving.findOne({

member:req.params.id,

status:"ACTIVE"

})

.populate(
"areaGroup",
"areaName"
)

.populate(
"assignedAgent",
"name mobile"
);

if(!saving){

return res.json({

success:true,

saving:null

});

}

res.json({

success:true,

saving

});

}catch(error){

res.status(500).json({

success:false,

message:error.message

});

}

};

// =====================================================
// GET ALL ACTIVE COLLECTION MEMBERS
// =====================================================

// =====================================================
// GET ALL ACTIVE COLLECTION MEMBERS - FAST VERSION
// =====================================================

// =====================================================
// GET ALL ACTIVE COLLECTION MEMBERS - ULTRA FAST
// =====================================================

exports.getCollectionMembers = async (req, res) => {
  const startedAt = Date.now();

  try {
    // =================================================
    // TODAY IN IST
    // =================================================

    const todayKey = getISTDateKey(new Date());

    const todayDate = istDateKeyToDate(todayKey);

    // =================================================
    // 1. GET ACTIVE SAVINGS
    // =================================================

    const members = await DailySaving.find({
      status: "ACTIVE",
    })
      .select([
        "_id",
        "member",
        "areaGroup",
        "assignedAgent",
        "collectionType",
        "fixedAmount",
        "durationDays",
        "startDate",
        "endDate",
        "graceDays",
        "penaltyType",
        "penaltyValue",
        "status",
        "totalSaved",
        "totalPenalty",
        "completedDays",
        "totalDaysPaid",
        "pendingDays",
        "pendingAmount",
        "nextCollectionDate",
        "createdAt",
        "lastCollectionDate",
      ].join(" "))
      .populate("member", "memberId memberName mobile")
      .populate("areaGroup", "areaName")
      .populate("assignedAgent", "name")
      .sort({ createdAt: -1 })
      .lean();

    // =================================================
    // NO ACTIVE MEMBERS
    // =================================================

    if (!members.length) {
      return res.status(200).json({
        success: true,
        members: [],
        count: 0,
        loadTime: `${Date.now() - startedAt}ms`,
      });
    }

    // =================================================
    // 2. SAVING IDS
    // =================================================

    const savingIds = members.map(
      (saving) => saving._id
    );

    // =================================================
    // 3. GET ONLY UNIQUE PAID DAYS
    //
    // MongoDB does the grouping.
    // We DON'T load every transaction anymore.
    // =================================================

    const paidDays = await DailyTransaction.aggregate([
      {
        $match: {
          savingAccount: {
            $in: savingIds,
          },
        },
      },

      // paymentForDate is preferred.
      // collectionDate is fallback.
      {
        $project: {
          savingAccount: 1,

          paymentDate: {
            $ifNull: [
              "$paymentForDate",
              "$collectionDate",
            ],
          },
        },
      },

      // Ignore invalid dates
      {
        $match: {
          paymentDate: {
            $ne: null,
          },
        },
      },

      // Convert date to IST YYYY-MM-DD
      {
        $project: {
          savingAccount: 1,

          dateKey: {
            $dateToString: {
              date: "$paymentDate",
              timezone: "Asia/Kolkata",
              format: "%Y-%m-%d",
            },
          },
        },
      },

      // One record per saving + day
      {
        $group: {
          _id: {
            savingAccount: "$savingAccount",
            dateKey: "$dateKey",
          },
        },
      },

      {
        $project: {
          _id: 0,
          savingAccount: "$_id.savingAccount",
          dateKey: "$_id.dateKey",
        },
      },
    ]);

    // =================================================
    // 4. GROUP PAID DAYS BY SAVING
    // =================================================

    const paidDaysMap = new Map();

    for (const item of paidDays) {
      const savingId =
        item.savingAccount.toString();

      if (!paidDaysMap.has(savingId)) {
        paidDaysMap.set(
          savingId,
          new Set()
        );
      }

      paidDaysMap
        .get(savingId)
        .add(item.dateKey);
    }

    // =================================================
    // 5. CALCULATE RESULT
    // =================================================

    const result = members.map((saving) => {
      const savingId =
        saving._id.toString();

      const paidSet =
        paidDaysMap.get(savingId) ||
        new Set();

      // ---------------------------------------------
      // START DATE
      // ---------------------------------------------

      const startKey =
        getISTDateKey(
          saving.startDate
        );

      // ---------------------------------------------
      // END DATE
      // ---------------------------------------------

      const endKey =
        getISTDateKey(
          saving.endDate
        );

      // ---------------------------------------------
      // LAST DUE DATE = MIN(endDate, today)
      // ---------------------------------------------

      let lastDueKey = todayKey;

      if (
        endKey &&
        endKey < lastDueKey
      ) {
        lastDueKey = endKey;
      }

      // ---------------------------------------------
      // TOTAL EXPECTED DAYS
      // ---------------------------------------------

      let expectedDays = 0;

      if (
        startKey &&
        lastDueKey &&
        startKey <= lastDueKey
      ) {
        const startDate =
          istDateKeyToDate(startKey);

        const lastDate =
          istDateKeyToDate(lastDueKey);

        expectedDays =
          Math.floor(
            (
              lastDate -
              startDate
            ) / 86400000
          ) + 1;
      }

      // ---------------------------------------------
      // ONLY COUNT PAID DAYS INSIDE ACCOUNT RANGE
      // ---------------------------------------------

      let completedDays = 0;

      for (const paidDate of paidSet) {
        if (
          paidDate >= startKey &&
          paidDate <= lastDueKey
        ) {
          completedDays++;
        }
      }

      // ---------------------------------------------
      // PENDING DAYS
      // ---------------------------------------------

      const pendingDays =
        Math.max(
          0,
          expectedDays -
          completedDays
        );

      // ---------------------------------------------
      // DAILY AMOUNT
      // ---------------------------------------------

      const dailyAmount =
        saving.collectionType === "FIXED"
          ? Number(
              saving.fixedAmount || 0
            )
          : 0;

      // ---------------------------------------------
      // PENDING AMOUNT
      // ---------------------------------------------

      let pendingAmount = 0;

      if (
        saving.collectionType === "FIXED"
      ) {
        pendingAmount =
          pendingDays *
          dailyAmount;
      } else {
        pendingAmount =
          Number(
            saving.pendingAmount || 0
          );
      }

      // ---------------------------------------------
      // RETURN SAME DATA + CALCULATED VALUES
      // ---------------------------------------------

      return {
        ...saving,

        completedDays,

        totalDaysPaid:
          completedDays,

        pendingDays,

        pendingAmount,

        dailyAmount,
      };
    });

    // =================================================
    // RESPONSE
    // =================================================

    const elapsed =
      Date.now() - startedAt;

    console.log(
      `COLLECTION MEMBERS: ${result.length} members | ${elapsed}ms`
    );

    return res.status(200).json({
      success: true,
      count: result.length,
      members: result,
      loadTime: `${elapsed}ms`,
    });

  } catch (error) {
    console.error(
      "GET COLLECTION MEMBERS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// =====================================================
// GET AGENT COLLECTION MEMBERS
// =====================================================

exports.getAgentCollectionMembers = async (req, res) => {
  try {
    const agentId = req.params.agentId;

    // ==========================================
    // 1. GET ACTIVE SAVING ACCOUNTS OF THIS AGENT
    // ==========================================

    const members = await DailySaving.find({
      assignedAgent: agentId,
      status: "ACTIVE"
    })
      .populate(
        "member",
        "memberId memberName mobile"
      )
      .populate(
        "areaGroup",
        "areaName"
      )
      .populate(
        "assignedAgent",
        "name"
      )
      .lean();

    // No members
    if (!members.length) {
      return res.status(200).json({
        success: true,
        members: []
      });
    }

    // ==========================================
    // 2. GET ALL SAVING IDs
    // ==========================================

    const savingIds = members.map(
      (saving) => saving._id
    );

    // ==========================================
    // 3. GET ALL TRANSACTIONS IN ONE QUERY
    // ==========================================

    const transactions =
      await DailyTransaction.find({
        savingAccount: {
          $in: savingIds
        }
      })
        .select(
          "savingAccount paymentForDate collectionDate"
        )
        .lean();

    // ==========================================
    // 4. GROUP TRANSACTIONS BY SAVING ACCOUNT
    // ==========================================

    const transactionsBySaving = new Map();

    for (const transaction of transactions) {
      const savingId =
        transaction.savingAccount.toString();

      if (!transactionsBySaving.has(savingId)) {
        transactionsBySaving.set(
          savingId,
          []
        );
      }

      transactionsBySaving
        .get(savingId)
        .push(transaction);
    }

    // ==========================================
    // 5. TODAY IN IST
    // ==========================================

    const todayKey =
      getISTDateKey(new Date());

    // ==========================================
    // 6. CALCULATE EACH MEMBER
    // ==========================================

    const result = members.map((saving) => {

      const startKey =
        getISTDateKey(
          saving.startDate
        );

      const endKey =
        getISTDateKey(
          saving.endDate
        );

      // ========================================
      // GET TRANSACTIONS FOR THIS SAVING
      // ========================================

      const savingTransactions =
        transactionsBySaving.get(
          saving._id.toString()
        ) || [];

      // ========================================
      // BUILD PAID DATE SET
      // ========================================

      const paidDates = new Set();

      for (
        const transaction of savingTransactions
      ) {

        const paidDate =
          transaction.paymentForDate ||
          transaction.collectionDate;

        if (!paidDate) continue;

        paidDates.add(
          getISTDateKey(paidDate)
        );
      }

      // ========================================
      // CALCULATE PENDING DAYS
      // ========================================

      let pendingDays = 0;

      let currentKey = startKey;

      while (
        currentKey <= endKey &&
        currentKey <= todayKey
      ) {

        if (
          paidDates.has(currentKey)
        ) {

          currentKey =
            addDaysToDateKey(
              currentKey,
              1
            );

          continue;
        }

        pendingDays++;

        currentKey =
          addDaysToDateKey(
            currentKey,
            1
          );
      }

      // ========================================
      // COMPLETED DAYS
      // ========================================

      const completedDays =
        paidDates.size;

      // ========================================
      // PENDING AMOUNT
      // ========================================

      let pendingAmount = 0;

      if (
        saving.collectionType === "FIXED"
      ) {

        pendingAmount =
          pendingDays *
          Number(
            saving.fixedAmount || 0
          );

      } else {

        // Flexible collection amount
        // remains based on stored value.

        pendingAmount =
          Number(
            saving.pendingAmount || 0
          );
      }

      // ========================================
      // RETURN UPDATED OBJECT
      // ========================================

      return {
        ...saving,

        completedDays,

        totalDaysPaid:
          completedDays,

        pendingDays,

        pendingAmount
      };
    });

    // ==========================================
    // 7. RESPONSE
    // ==========================================

    return res.status(200).json({
      success: true,
      members: result
    });

  } catch (error) {

    console.error(
      "GET AGENT COLLECTION MEMBERS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// =====================================================
// GET COLLECTION SUMMARY - ULTRA FAST
// =====================================================

exports.getCollectionSummary = async (req, res) => {
  try {
    const todayKey =
      getISTDateKey(new Date());

    const todayStart =
      istDateKeyToDate(todayKey);

    const tomorrowStart =
      istDateKeyToDate(
        addDaysToDateKey(
          todayKey,
          1
        )
      );

    const [
      savingSummary,
      transactionSummary,
    ] = await Promise.all([

      // =============================================
      // ACTIVE SAVINGS
      // =============================================

      DailySaving.aggregate([
        {
          $match: {
            status: "ACTIVE",
          },
        },

        {
          $group: {
            _id: null,

            todayTarget: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$collectionType",
                      "FIXED",
                    ],
                  },
                  {
                    $ifNull: [
                      "$fixedAmount",
                      0,
                    ],
                  },
                  0,
                ],
              },
            },

            activeMembers: {
              $sum: 1,
            },
          },
        },
      ]),

      // =============================================
      // TODAY TRANSACTIONS
      // =============================================

      DailyTransaction.aggregate([
        {
          $match: {
            collectionDate: {
              $gte: todayStart,
              $lt: tomorrowStart,
            },
          },
        },

        {
          $group: {
            _id: null,

            todayCollected: {
              $sum: {
                $ifNull: [
                  "$totalAmount",
                  0,
                ],
              },
            },

            transactionCount: {
              $sum: 1,
            },

            agentCollection: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$collectorType",
                      "AGENT",
                    ],
                  },
                  {
                    $ifNull: [
                      "$totalAmount",
                      0,
                    ],
                  },
                  0,
                ],
              },
            },

            selfCollection: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$collectorType",
                      "ADMIN",
                    ],
                  },
                  {
                    $ifNull: [
                      "$totalAmount",
                      0,
                    ],
                  },
                  0,
                ],
              },
            },

            paidMembers: {
              $addToSet: "$savingAccount",
            },
          },
        },
      ]),
    ]);

    const savingData =
      savingSummary[0] || {};

    const transactionData =
      transactionSummary[0] || {};

    const todayTarget =
      Number(
        savingData.todayTarget || 0
      );

    const todayCollected =
      Number(
        transactionData.todayCollected || 0
      );

    const pendingAmount =
      Math.max(
        0,
        todayTarget -
        todayCollected
      );

    const paidMembersCount =
      Array.isArray(
        transactionData.paidMembers
      )
        ? transactionData.paidMembers.length
        : 0;

    const activeMembers =
      Number(
        savingData.activeMembers || 0
      );

    const pendingMembers =
      Math.max(
        0,
        activeMembers -
        paidMembersCount
      );

    return res.json({
      success: true,

      todayTarget,

      todayCollected,

      pendingAmount,

      pendingMembers,

      agentCollection:
        Number(
          transactionData.agentCollection || 0
        ),

      selfCollection:
        Number(
          transactionData.selfCollection || 0
        ),
    });

  } catch (error) {
    console.error(
      "GET COLLECTION SUMMARY ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


exports.getAgentMonthlyCollection = async (req, res) => {

  try {

    const firstDay = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    );

    const lastDay = new Date(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      0,
      23,
      59,
      59
    );

    const data = await DailyTransaction.aggregate([

      {
        $match: {
          collectorType: "AGENT",
          collectionDate: {
            $gte: firstDay,
            $lte: lastDay
          }
        }
      },

      {
        $group: {
          _id: "$collectorId",

          totalCollection: {
            $sum: "$totalAmount"
          },

          totalTransactions: {
            $sum: 1
          }
        }
      }

    ]);

    const result = await DailyAgent.populate(data, {
      path: "_id",
      select: "name mobile"
    });

    res.json({
      success: true,
      agents: result
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }

};

// ============================================================
// UNIFIED AGENT COLLECTION - OPTIMIZED
// ============================================================

exports.getUnifiedAgentCollection = async (req, res) => {
  const startedAt = Date.now();

  try {
    const { agentId } = req.params;

    // ==========================================================
    // VALIDATION
    // ==========================================================

    if (!agentId) {
      return res.status(400).json({
        success: false,
        message: "Agent ID is required.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(agentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Agent ID.",
      });
    }

    const agentObjectId = new mongoose.Types.ObjectId(agentId);

    // ==========================================================
    // TODAY - IST
    // ==========================================================

    const todayKey = getISTDateKey(new Date());
    const todayDate = istDateKeyToDate(todayKey);

    const tomorrowDate = new Date(todayDate);
    tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1);

    // ==========================================================
    // STEP 1
    // GET ACTIVE SAVINGS + ACTIVE/DUE/OVERDUE LOANS
    //
    // Both queries run simultaneously.
    // ==========================================================

    const [savings, loans] = await Promise.all([
      DailySaving.find({
        assignedAgent: agentObjectId,
        status: "ACTIVE",
      })
        .select(
          [
            "_id",
            "member",
            "areaGroup",
            "assignedAgent",
            "collectionType",
            "fixedAmount",
            "startDate",
            "endDate",
            "graceDays",
            "penaltyType",
            "penaltyValue",
            "pendingAmount",
            "createdAt",
          ].join(" ")
        )
        .populate(
          "member",
          "memberId memberName mobile fatherName"
        )
        .populate(
          "areaGroup",
          "areaName"
        )
        .lean(),

      DailyLoan.find({
        assignedAgent: agentObjectId,
        status: {
          $in: ["ACTIVE", "DUE", "OVERDUE"],
        },
      })
        .select(
          [
            "_id",
            "member",
            "loanNumber",
            "loanType",
            "loanAmount",
            "outstandingAmount",
            "emiAmount",
            "loanDate",
            "durationDays",
            "durationWeeks",
            "durationMonths",
            "interestRate",
            "interest",
            "gracePeriod",
            "penaltyType",
            "penaltyValue",
            "totalInterest",
            "totalPayable",
            "createdAt",
          ].join(" ")
        )
        .populate(
          "member",
          "memberId memberName mobile fatherName"
        )
        .lean(),
    ]);

    // ==========================================================
    // NOTHING TO COLLECT
    // ==========================================================

    if (savings.length === 0 && loans.length === 0) {
      console.log(
        `UNIFIED COLLECTION: no records (${Date.now() - startedAt}ms)`
      );

      return res.status(200).json({
        success: true,
        count: 0,
        members: [],
      });
    }

    // ==========================================================
    // IDS
    // ==========================================================

    const savingIds = savings.map((saving) => saving._id);
    const loanIds = loans.map((loan) => loan._id);

    // ==========================================================
    // EARLIEST SAVING DATE
    //
    // Same logic as your old controller.
    // ==========================================================

    let earliestSavingDate = null;

    for (const saving of savings) {
      const key = getISTDateKey(saving.startDate);

      if (!key) continue;

      const date = istDateKeyToDate(key);

      if (!earliestSavingDate || date < earliestSavingDate) {
        earliestSavingDate = date;
      }
    }

    // ==========================================================
    // STEP 2
    // OPTIMIZED PAYMENT QUERIES
    //
    // IMPORTANT:
    // We only need:
    //
    // Saving:
    //   savingAccount + payment date
    //
    // Loan:
    //   loan + installmentNo
    //
    // We DON'T need complete payment documents.
    //
    // MongoDB groups duplicates before sending them to Node.
    // ==========================================================

    const [savingPayments, loanPayments] = await Promise.all([
      savingIds.length > 0
        ? DailyTransaction.aggregate([
            {
              $match: {
                savingAccount: {
                  $in: savingIds,
                },
              },
            },

            // Keep the same fallback logic:
            // paymentForDate || collectionDate
            {
              $project: {
                savingAccount: 1,
                effectivePaymentDate: {
                  $ifNull: [
                    "$paymentForDate",
                    "$collectionDate",
                  ],
                },
              },
            },

            {
              $match: {
                effectivePaymentDate: {
                  $ne: null,
                  $gte: earliestSavingDate || new Date(0),
                  $lt: tomorrowDate,
                },
              },
            },

            // Convert to IST day.
            {
              $project: {
                savingAccount: 1,
                paymentDate: {
                  $dateToString: {
                    date: "$effectivePaymentDate",
                    timezone: "Asia/Kolkata",
                    format: "%Y-%m-%d",
                  },
                },
              },
            },

            // Remove duplicate payment records
            // for the same saving + same day.
            {
              $group: {
                _id: {
                  savingAccount: "$savingAccount",
                  paymentDate: "$paymentDate",
                },
              },
            },

            {
              $project: {
                _id: 0,
                savingAccount: "$_id.savingAccount",
                paymentDate: "$_id.paymentDate",
              },
            },
          ])
        : [],

      loanIds.length > 0
        ? LoanCollection.aggregate([
            {
              $match: {
                loan: {
                  $in: loanIds,
                },

                installmentNo: {
                  $ne: null,
                },
              },
            },

            // Same information as your previous Set().
            {
              $group: {
                _id: {
                  loan: "$loan",
                  installmentNo: "$installmentNo",
                },
              },
            },

            {
              $project: {
                _id: 0,
                loan: "$_id.loan",
                installmentNo: "$_id.installmentNo",
              },
            },
          ])
        : [],
    ]);

    // ==========================================================
    // STEP 3
    // GROUP SAVING PAYMENTS
    // ==========================================================

    const paymentsBySaving = new Map();

    for (const payment of savingPayments) {
      if (!payment?.savingAccount || !payment?.paymentDate) {
        continue;
      }

      const savingId = payment.savingAccount.toString();

      if (!paymentsBySaving.has(savingId)) {
        paymentsBySaving.set(
          savingId,
          new Set()
        );
      }

      paymentsBySaving
        .get(savingId)
        .add(payment.paymentDate);
    }

    // ==========================================================
    // STEP 4
    // GROUP LOAN PAYMENTS
    // ==========================================================

    const paidInstallmentsByLoan = new Map();

    for (const payment of loanPayments) {
      if (
        !payment?.loan ||
        payment.installmentNo === undefined ||
        payment.installmentNo === null
      ) {
        continue;
      }

      const loanId = payment.loan.toString();

      if (!paidInstallmentsByLoan.has(loanId)) {
        paidInstallmentsByLoan.set(
          loanId,
          new Set()
        );
      }

      paidInstallmentsByLoan
        .get(loanId)
        .add(
          Number(payment.installmentNo)
        );
    }

    // ==========================================================
    // STEP 5
    // PROCESS SAVINGS
    //
    // Same calculations as original:
    //
    // - completedDays
    // - pendingDays
    // - pendingAmount
    // - dailyAmount
    // - penalty
    // - installmentNo
    // - pendingPayments
    // - isToday
    //
    // ==========================================================

    const processedSavings = savings.map((saving) => {
      const savingId = saving._id.toString();

      const paidDates =
        paymentsBySaving.get(savingId) ||
        new Set();

      const startKey = getISTDateKey(
        saving.startDate
      );

      const endKey = getISTDateKey(
        saving.endDate
      );

      const pendingPayments = [];

      if (startKey && endKey) {
        let currentKey = startKey;

        while (
          currentKey <= endKey &&
          currentKey <= todayKey
        ) {
          // =====================================================
          // ALREADY PAID
          // =====================================================

          if (paidDates.has(currentKey)) {
            currentKey = addDaysToDateKey(
              currentKey,
              1
            );

            continue;
          }

          // =====================================================
          // CURRENT DATE
          // =====================================================

          const currentDate =
            istDateKeyToDate(currentKey);

          const diffDays = Math.max(
            0,
            Math.floor(
              (
                todayDate -
                currentDate
              ) / 86400000
            )
          );

          // =====================================================
          // DAILY AMOUNT
          // =====================================================

          const dailyAmount =
            saving.collectionType === "FIXED"
              ? Number(
                  saving.fixedAmount || 0
                )
              : 0;

          // =====================================================
          // PENALTY
          // =====================================================

          let penalty = 0;

          if (
            diffDays >
            Number(
              saving.graceDays || 0
            )
          ) {
            if (
              saving.penaltyType === "FIXED"
            ) {
              penalty = Number(
                saving.penaltyValue || 0
              );
            } else {
              penalty = Math.round(
                (
                  dailyAmount *
                  Number(
                    saving.penaltyValue || 0
                  )
                ) / 100
              );
            }
          }

          // =====================================================
          // INSTALLMENT NUMBER
          // =====================================================

          const installmentNo =
            Math.floor(
              (
                currentDate -
                istDateKeyToDate(
                  startKey
                )
              ) / 86400000
            ) + 1;

          pendingPayments.push({
            installmentNo,

            date:
              `${currentKey}T00:00:00+05:30`,

            dailyAmount,

            penalty,

            total:
              dailyAmount + penalty,

            isToday:
              currentKey === todayKey,
          });

          currentKey =
            addDaysToDateKey(
              currentKey,
              1
            );
        }
      }

      return {
        savingId: saving._id,

        collectionType:
          saving.collectionType,

        fixedAmount:
          Number(
            saving.fixedAmount || 0
          ),

        startDate:
          saving.startDate,

        endDate:
          saving.endDate,

        completedDays:
          paidDates.size,

        pendingDays:
          pendingPayments.length,

        pendingAmount:
          pendingPayments.reduce(
            (total, item) =>
              total +
              Number(
                item.total || 0
              ),
            0
          ),

        pendingPayments,

        member:
          saving.member,

        areaGroup:
          saving.areaGroup,
      };
    });

    // ==========================================================
    // STEP 6
    // PROCESS LOANS
    //
    // Same loan calculations as original.
    // ==========================================================

    const processedLoans = loans.map((loan) => {
      const loanId =
        loan._id.toString();

      const paidInstallments =
        paidInstallmentsByLoan.get(
          loanId
        ) || new Set();

      // ========================================================
      // TOTAL INSTALLMENTS
      // ========================================================

      let totalInstallments = 0;

      switch (loan.loanType) {
        case "DAILY":
          totalInstallments =
            Number(
              loan.durationDays || 0
            );
          break;

        case "WEEKLY":
          totalInstallments =
            Number(
              loan.durationWeeks || 0
            );
          break;

        case "MONTHLY":
          totalInstallments =
            Number(
              loan.durationMonths || 0
            );
          break;

        case "FIXED":
          totalInstallments = 0;
          break;

        default:
          totalInstallments = 0;
      }

      // ========================================================
      // LOAN DATE
      // ========================================================

      const loanDateKey =
        getISTDateKey(
          loan.loanDate
        );

      const pendingPayments = [];

      if (loanDateKey) {
        const loanDate =
          istDateKeyToDate(
            loanDateKey
          );

        let dueTillToday = 0;

        // ======================================================
        // DAILY
        // ======================================================

        if (loan.loanType === "DAILY") {
          const days =
            Math.floor(
              (
                todayDate -
                loanDate
              ) / 86400000
            );

          dueTillToday =
            days >= 0
              ? days + 1
              : 0;
        }

        // ======================================================
        // WEEKLY
        // ======================================================

        else if (
          loan.loanType === "WEEKLY"
        ) {
          const days =
            Math.floor(
              (
                todayDate -
                loanDate
              ) / 86400000
            );

          dueTillToday =
            days >= 0
              ? Math.floor(
                  days / 7
                ) + 1
              : 0;
        }

        // ======================================================
        // MONTHLY / FIXED
        // ======================================================

        else if (
          loan.loanType === "MONTHLY" ||
          loan.loanType === "FIXED"
        ) {
          const monthDiff =
            (
              (
                todayDate.getUTCFullYear() -
                loanDate.getUTCFullYear()
              ) * 12
            ) +
            (
              todayDate.getUTCMonth() -
              loanDate.getUTCMonth()
            );

          if (monthDiff < 0) {
            dueTillToday = 0;
          }

          else if (monthDiff === 0) {
            dueTillToday =
              todayDate.getUTCDate() >=
              loanDate.getUTCDate()
                ? 1
                : 0;
          }

          else if (
            todayDate.getUTCDate() >=
            loanDate.getUTCDate()
          ) {
            dueTillToday =
              monthDiff + 1;
          }

          else {
            dueTillToday =
              monthDiff;
          }
        }

        // ======================================================
        // TENURE LIMIT
        // ======================================================

        if (loan.loanType !== "FIXED") {
          dueTillToday =
            Math.max(
              0,
              Math.min(
                dueTillToday,
                totalInstallments
              )
            );
        }

        // ======================================================
        // PENDING INSTALLMENTS
        // ======================================================

        for (
          let i = 1;
          i <= dueTillToday;
          i++
        ) {
          if (
            paidInstallments.has(i)
          ) {
            continue;
          }

          // ================================================
          // DUE DATE
          // ================================================

          const dueDate =
            new Date(loanDate);

          if (
            loan.loanType === "DAILY"
          ) {
            dueDate.setUTCDate(
              dueDate.getUTCDate() +
              (i - 1)
            );
          }

          else if (
            loan.loanType === "WEEKLY"
          ) {
            dueDate.setUTCDate(
              dueDate.getUTCDate() +
              ((i - 1) * 7)
            );
          }

          else if (
            loan.loanType === "MONTHLY" ||
            loan.loanType === "FIXED"
          ) {
            dueDate.setUTCMonth(
              dueDate.getUTCMonth() +
              (i - 1)
            );
          }

          // ================================================
          // EMI
          // ================================================

          let emiAmount =
            Number(
              loan.emiAmount || 0
            );

          if (
            loan.loanType === "FIXED" &&
            emiAmount <= 0
          ) {
            const principal =
              Number(
                loan.outstandingAmount ??
                loan.loanAmount ??
                0
              );

            const rate =
              Number(
                loan.interestRate ??
                loan.interest ??
                0
              );

            emiAmount =
              Math.round(
                (
                  principal *
                  rate
                ) / 100
              );
          }

          // ================================================
          // DELAY
          // ================================================

          let delay = 0;

          if (todayDate > dueDate) {
            const difference =
              Math.floor(
                (
                  todayDate -
                  dueDate
                ) / 86400000
              );

            delay =
              loan.loanType === "WEEKLY"
                ? Math.floor(
                    difference / 7
                  )
                : difference;
          }

          // ================================================
          // PENALTY
          // ================================================

          let penalty = 0;

          if (
            delay >
            Number(
              loan.gracePeriod || 0
            )
          ) {
            if (
              loan.penaltyType ===
              "PERCENTAGE"
            ) {
              penalty =
                Math.round(
                  (
                    emiAmount *
                    Number(
                      loan.penaltyValue || 0
                    )
                  ) / 100
                );
            } else {
              penalty =
                Number(
                  loan.penaltyValue || 0
                );
            }
          }

          const dueDateKey =
            getISTDateKey(
              dueDate
            );

          pendingPayments.push({
            installmentNo: i,

            dueDate,

            dueDateString:
              dueDate.toLocaleDateString(
                "en-IN",
                {
                  timeZone:
                    "Asia/Kolkata",
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                }
              ),

            emiAmount,

            delay,

            penalty,

            totalAmount:
              emiAmount +
              penalty,

            isToday:
              dueDateKey ===
              todayKey,
          });
        }
      }

      return {
        loanId:
          loan._id,

        loanNumber:
          loan.loanNumber,

        loanType:
          loan.loanType,

        loanAmount:
          Number(
            loan.loanAmount || 0
          ),

        totalInterest:
          Number(
            loan.totalInterest || 0
          ),

        totalPayable:
          Number(
            loan.totalPayable || 0
          ),

        outstandingAmount:
          Number(
            loan.outstandingAmount || 0
          ),

        emiAmount:
          Number(
            loan.emiAmount || 0
          ),

        totalInstallments,

        completedInstallments:
          paidInstallments.size,

        pendingInstallments:
          pendingPayments.length,

        pendingPayments,

        member:
          loan.member,
      };
    });

    // ==========================================================
    // STEP 7
    // GROUP BY MEMBER
    // ==========================================================

    const memberMap = new Map();

    // ==========================================================
    // SAVINGS
    // ==========================================================

    for (
      const saving of processedSavings
    ) {
      if (!saving.member) {
        continue;
      }

      const memberId =
        saving.member._id.toString();

      if (!memberMap.has(memberId)) {
        memberMap.set(
          memberId,
          {
            member:
              saving.member,

            savings: [],

            loans: [],
          }
        );
      }

      memberMap
        .get(memberId)
        .savings
        .push(saving);
    }

    // ==========================================================
    // LOANS
    // ==========================================================

    for (
      const loan of processedLoans
    ) {
      if (!loan.member) {
        continue;
      }

      const memberId =
        loan.member._id.toString();

      if (!memberMap.has(memberId)) {
        memberMap.set(
          memberId,
          {
            member:
              loan.member,

            savings: [],

            loans: [],
          }
        );
      }

      memberMap
        .get(memberId)
        .loans
        .push(loan);
    }

    // ==========================================================
    // FINAL RESPONSE
    // ==========================================================

    const members =
      Array.from(
        memberMap.values()
      );

    const elapsed =
      Date.now() - startedAt;

    console.log(
      `UNIFIED COLLECTION: ` +
      `${members.length} members, ` +
      `${savings.length} savings, ` +
      `${loans.length} loans, ` +
      `${savingPayments.length} unique saving payment dates, ` +
      `${loanPayments.length} unique loan installments, ` +
      `${elapsed}ms`
    );

    return res.status(200).json({
      success: true,
      count: members.length,
      members,
    });

  } catch (error) {
    console.error(
      "UNIFIED AGENT COLLECTION ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message,
    });
  }
};