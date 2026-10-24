const mongoose = require("mongoose");
const DailySaving = require("../../models/daily/DailySaving");
const DailyMember = require("../../models/daily/DailyMember");
const DailyTransaction = require("../../models/daily/DailyTransaction");
const AreaGroup = require("../../models/daily/AreaGroup");
const DailyLoan = require("../../models/daily/DailyLoan");
const LoanCollection = require("../../models/daily/LoanCollection");



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

const saving = await DailySaving.findById(req.params.id)
  .populate("member", "memberId memberName mobile")
  .populate("areaGroup", "areaName");

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



exports.collectPendingPayment = async (req, res) => {
  try {
    const {
      savingId,
      pendingDate,
      paymentMethod,
      amount,
    } = req.body;

    if (!savingId) {
      return res.status(400).json({
        success: false,
        message: "Saving ID is required",
      });
    }

    if (!pendingDate) {
      return res.status(400).json({
        success: false,
        message: "Pending date is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(savingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid saving ID",
      });
    }

    const saving = await DailySaving.findById(savingId)
      .populate("member")
      .populate("areaGroup");

    if (!saving) {
      return res.status(404).json({
        success: false,
        message: "Saving Account Not Found",
      });
    }

    if (!saving.member) {
      return res.status(400).json({
        success: false,
        message: "Member not found for this saving account",
      });
    }

    const requestedDate = new Date(pendingDate);

    if (Number.isNaN(requestedDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid pending date",
      });
    }

    const paymentDateKey = getISTDateKey(requestedDate);
    const paymentDate = istDateKeyToDate(paymentDateKey);
    const nextDay = istDateKeyToDate(
      addDaysToDateKey(paymentDateKey, 1)
    );

    // Prevent duplicate payment for the same saving day.
    const already = await DailyTransaction.findOne({
      savingAccount: saving._id,
      paymentForDate: {
        $gte: paymentDate,
        $lt: nextDay,
      },
    });

    if (already) {
      return res.status(400).json({
        success: false,
        message: "This day's payment already collected.",
      });
    }

    let dailyAmount =
      saving.collectionType === "FIXED"
        ? Number(saving.fixedAmount || 0)
        : Number(amount || 0);

    if (!Number.isFinite(dailyAmount) || dailyAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment amount",
      });
    }

    const todayKey = getISTDateKey(new Date());
    const todayDate = istDateKeyToDate(todayKey);

    const diffDays = Math.floor(
      (todayDate - paymentDate) / 86400000
    );

    let penalty = 0;

    if (diffDays > Number(saving.graceDays || 0)) {
      if (saving.penaltyType === "FIXED") {
        penalty = Number(saving.penaltyValue || 0);
      } else {
        penalty = Math.round(
          dailyAmount * Number(saving.penaltyValue || 0) / 100
        );
      }
    }

    if (!Number.isFinite(penalty) || penalty < 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid penalty configuration",
      });
    }

    const totalAmount = dailyAmount + penalty;

    // This endpoint records an Admin collection only.
    await DailyTransaction.create({
      savingAccount: saving._id,
      member: saving.member._id,
      area: saving.areaGroup?._id || undefined,
      collectorType: "ADMIN",
      collectorId: null,
      collectionDate: new Date(),
      paymentForDate: paymentDate,
      dailyAmount,
      penalty,
      totalAmount,
      paymentMethod: paymentMethod || "CASH",
    });

    saving.totalSaved =
      Number(saving.totalSaved || 0) + dailyAmount;

    saving.totalPenalty =
      Number(saving.totalPenalty || 0) + penalty;

    saving.totalDaysPaid =
      Number(saving.totalDaysPaid || 0) + 1;

    saving.completedDays = saving.totalDaysPaid;
    saving.lastCollectionDate = new Date();

    await saving.save();

    // Preserve area-level totals where applicable.
    if (saving.areaGroup?._id) {
      await AreaGroup.findByIdAndUpdate(
        saving.areaGroup._id,
        {
          $inc: {
            totalCollection: totalAmount,
          },
        }
      );
    }

    return res.status(201).json({
      success: true,
      message: "Payment Collected Successfully",
      dailyAmount,
      penalty,
      totalAmount,
      paymentForDate: paymentDate,
    });
  } catch (error) {
    console.error("COLLECT PENDING PAYMENT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


exports.getMemberSaving = async(req,res)=>{

try{

const saving = await DailySaving.findOne({
  member: req.params.id,
  status: "ACTIVE",
})
  .populate("areaGroup", "areaName");

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
// GET COLLECTION SUMMARY - ULTRA FAST
// =====================================================


exports.getCollectionSummary = async (req, res) => {
  try {
    const todayKey = getISTDateKey(new Date());
    const todayStart = istDateKeyToDate(todayKey);
    const tomorrowStart = istDateKeyToDate(
      addDaysToDateKey(todayKey, 1)
    );

    const [savingSummary, transactionSummary] = await Promise.all([
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
                  { $eq: ["$collectionType", "FIXED"] },
                  { $ifNull: ["$fixedAmount", 0] },
                  0,
                ],
              },
            },
            activeMembers: { $sum: 1 },
          },
        },
      ]),

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
              $sum: { $ifNull: ["$totalAmount", 0] },
            },
            transactionCount: { $sum: 1 },
            paidMembers: {
              $addToSet: "$savingAccount",
            },
          },
        },
      ]),
    ]);

    const savingData = savingSummary[0] || {};
    const transactionData = transactionSummary[0] || {};

    const todayTarget = Number(savingData.todayTarget || 0);
    const todayCollected = Number(
      transactionData.todayCollected || 0
    );
    const activeMembers = Number(
      savingData.activeMembers || 0
    );

    const paidMembersCount = (
      transactionData.paidMembers || []
    ).length;

    return res.json({
      success: true,
      todayTarget,
      todayCollected,
      pendingAmount: Math.max(0, todayTarget - todayCollected),
      pendingMembers: Math.max(
        0,
        activeMembers - paidMembersCount
      ),
      transactionCount: Number(
        transactionData.transactionCount || 0
      ),
    });
  } catch (error) {
    console.error("GET COLLECTION SUMMARY ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



