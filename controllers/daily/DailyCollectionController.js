const DailySaving = require("../../models/daily/DailySaving");
const DailyMember = require("../../models/daily/DailyMember");
const DailyTransaction = require("../../models/daily/DailyTransaction");
const DailyAgent = require("../../models/daily/Agent");
const AreaGroup = require("../../models/daily/AreaGroup");
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

exports.getCollectionMembers = async (req, res) => {
  try {

    // ==========================================
    // 1. GET ACTIVE SAVING ACCOUNTS
    // ==========================================

    const members = await DailySaving.find({
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
      })
      .lean();


    // ==========================================
    // NO MEMBERS
    // ==========================================

    if (!members.length) {
      return res.status(200).json({
        success: true,
        members: []
      });
    }


    // ==========================================
    // 2. GET ALL SAVING IDS
    // ==========================================

    const savingIds = members.map(
      (saving) => saving._id
    );


    // ==========================================
    // 3. ONE DATABASE QUERY FOR ALL TRANSACTIONS
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
    // 6. CALCULATE MEMBERS IN MEMORY
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
      // TRANSACTIONS FOR THIS SAVING
      // ========================================

      const savingTransactions =
        transactionsBySaving.get(
          saving._id.toString()
        ) || [];


      // ========================================
      // BUILD PAID DATE SET
      // ========================================

      const paidDates = new Set();

      for (const transaction of savingTransactions) {

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

        if (paidDates.has(currentKey)) {

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

        // Flexible amount is stored separately
        pendingAmount =
          Number(
            saving.pendingAmount || 0
          );
      }


      // ========================================
      // RETURN WITHOUT DATABASE SAVE
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
      "GET COLLECTION MEMBERS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message
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