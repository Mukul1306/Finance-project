const DailySaving = require("../../models/daily/DailySaving");
const DailyMember = require("../../models/daily/DailyMember");
const DailyTransaction = require("../../models/daily/DailyTransaction");
const DailyAgent = require("../../models/daily/Agent");
const AreaGroup = require("../../models/daily/AreaGroup");

exports.getPendingDays = async (
  req,
  res
) => {

  try {

    // =====================================================
    // SAVING
    // =====================================================

    const saving =
      await DailySaving.findById(
        req.params.id
      )
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

        message:
          "Saving Account Not Found"

      });

    }


    // =====================================================
    // TODAY IN INDIA
    // =====================================================

    const todayKey =
      getISTDateKey(
        new Date()
      );


    // =====================================================
    // SAVING START / END
    // =====================================================

    const startKey =
      getISTDateKey(
        saving.startDate
      );

    const endKey =
      getISTDateKey(
        saving.endDate
      );


    // =====================================================
    // ALL TRANSACTIONS
    // paymentForDate = which saving day is paid
    // collectionDate = actual time money was collected
    // =====================================================

    const transactions =
      await DailyTransaction.find({
        savingAccount:
          saving._id
      })
        .select(
          "paymentForDate collectionDate"
        );


    // =====================================================
    // PAID CALENDAR DAYS
    // =====================================================

    const paidDates =
      new Set();


    for (
      const transaction
      of transactions
    ) {

      const paidDate =
        transaction.paymentForDate
          || transaction.collectionDate;


      if (!paidDate) {
        continue;
      }


      paidDates.add(
        getISTDateKey(
          paidDate
        )
      );

    }


    // =====================================================
    // BUILD PENDING DAYS
    // =====================================================

    const pendingDays = [];

    let currentKey =
      startKey;


    while (
      currentKey <= endKey &&
      currentKey <= todayKey
    ) {


      // Already paid for this calendar day
      if (
        paidDates.has(
          currentKey
        )
      ) {

        currentKey =
          addDaysToDateKey(
            currentKey,
            1
          );

        continue;

      }


      const currentDate =
        istDateKeyToDate(
          currentKey
        );

      const todayDate =
        istDateKeyToDate(
          todayKey
        );


      // ===================================================
      // DELAY
      // ===================================================

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


      // ===================================================
      // PENALTY
      // ===================================================

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
              Number(
                saving.fixedAmount || 0
              ) *
              Number(
                saving.penaltyValue || 0
              ) /
              100
            );

        }

      }


      // ===================================================
      // DAILY AMOUNT
      // ===================================================

      const dailyAmount =
        saving.collectionType ===
        "FIXED"
          ? Number(
              saving.fixedAmount || 0
            )
          : 0;


      const total =
        dailyAmount +
        penalty;


      // ===================================================
      // INSTALLMENT NUMBER
      // ===================================================

      const startDate =
        istDateKeyToDate(
          startKey
        );


      const installmentNo =
        Math.floor(
          (
            currentDate -
            startDate
          ) /
          (
            1000 *
            60 *
            60 *
            24
          )
        ) + 1;


      pendingDays.push({

        installmentNo,

        // Keep the date explicitly in IST.
        // Frontend can send this back unchanged.
        date:
          `${currentKey}T00:00:00+05:30`,

        dailyAmount,

        penalty,

        total

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

    return res.status(200).json({

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

      message:
        error.message

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

      // Actual time money was received
      collectionDate:
        new Date(),

      // Calendar day this money is paying for
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

exports.getCollectionMembers = async (req, res) => {
  try {

    const members =
      await DailySaving.find({
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
        .sort({
          createdAt: -1
        });


    const today =
      new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );


    for (const saving of members) {

      // ==========================================
      // ALL TRANSACTIONS
      // ==========================================

      const transactions =
        await DailyTransaction.find({
          savingAccount: saving._id
        });


      // ==========================================
      // UNIQUE PAID DATES
      // ==========================================

      const paidDates =
        new Set(
          transactions.map(
            transaction => {

              const paidDate =
                new Date(
                  transaction.paymentForDate ||
                  transaction.collectionDate
                );

              paidDate.setHours(
                0,
                0,
                0,
                0
              );

              return paidDate.getTime();

            }
          )
        );


      // ==========================================
      // START / END DATE
      // ==========================================

      const startDate =
        new Date(
          saving.startDate
        );

      startDate.setHours(
        0,
        0,
        0,
        0
      );


      const endDate =
        new Date(
          saving.endDate
        );

      endDate.setHours(
        0,
        0,
        0,
        0
      );


      // ==========================================
      // ACTUAL PENDING DAYS
      // ==========================================

      let actualPendingDays = 0;

      let current =
        new Date(
          startDate
        );


      while (
        current <= today &&
        current <= endDate
      ) {

        if (
          !paidDates.has(
            current.getTime()
          )
        ) {

          actualPendingDays++;

        }


        current.setDate(
          current.getDate() + 1
        );

      }


      // ==========================================
      // UPDATE COUNTERS
      // ==========================================

      saving.completedDays =
        paidDates.size;

      saving.totalDaysPaid =
        paidDates.size;

      saving.pendingDays =
        actualPendingDays;


      // ==========================================
      // PENDING AMOUNT
      // ==========================================

      if (
        saving.collectionType ===
        "FIXED"
      ) {

        saving.pendingAmount =
          actualPendingDays *
          Number(
            saving.fixedAmount || 0
          );

      } else {

        saving.pendingAmount = 0;

      }


      // ==========================================
      // SAVE ONCE
      // ==========================================

      await saving.save();

    }


    res.json({
      success: true,
      members
    });


  } catch (error) {

    console.error(
      "GET COLLECTION MEMBERS ERROR:",
      error
    );


    res.status(500).json({
      success: false,
      message: error.message
    });

  }
};
exports.getAgentCollectionMembers = async (req, res) => {

try{

const members =
await DailySaving.find({

assignedAgent:req.params.agentId,

status:"ACTIVE"

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
);

res.json({

success:true,

members

});

}catch(error){

res.status(500).json({

success:false,

message:error.message

});

}

};

exports.getCollectionSummary = async (req, res) => {
  try {

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Active Saving Accounts
    const savings = await DailySaving.find({
      status: "ACTIVE"
    });

    // Today's Transactions
    const todayTransactions = await DailyTransaction.find({
      collectionDate: {
        $gte: today,
        $lt: tomorrow
      }
    });

    // ==========================
    // Today's Target
    // ==========================

    let todayTarget = 0;

    savings.forEach((saving) => {
      if (saving.collectionType === "FIXED") {
        todayTarget += saving.fixedAmount;
      }
    });

    // ==========================
    // Today's Collection
    // ==========================

    const todayCollected = todayTransactions.reduce(
      (sum, item) => sum + item.totalAmount,
      0
    );

    // ==========================
    // Pending Amount
    // ==========================

    const pendingAmount = Math.max(
      0,
      todayTarget - todayCollected
    );

    // ==========================
    // Pending Members
    // ==========================

    const paidMembers = new Set(
      todayTransactions.map(t => t.savingAccount.toString())
    );

    const pendingMembers = savings.filter(
      s => !paidMembers.has(s._id.toString())
    ).length;

    // ==========================
    // Agent Collection
    // ==========================

    const agentCollection = todayTransactions
      .filter(t => t.collectorType === "AGENT")
      .reduce((sum, t) => sum + t.totalAmount, 0);

    // ==========================
    // Self/Admin Collection
    // ==========================

    const selfCollection = todayTransactions
      .filter(t => t.collectorType === "ADMIN")
      .reduce((sum, t) => sum + t.totalAmount, 0);

    res.json({

      success: true,

      todayTarget,

      todayCollected,

      pendingAmount,

      pendingMembers,

      agentCollection,

      selfCollection

    });

  } catch (error) {

    res.status(500).json({

      success: false,

      message: error.message

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