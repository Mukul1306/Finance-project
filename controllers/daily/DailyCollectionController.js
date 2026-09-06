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



exports.getUnifiedAgentCollection = async (req, res) => {
  try {
    const { agentId } = req.params;

    // ==========================================================
    // VALIDATE AGENT
    // ==========================================================

    if (!agentId) {
      return res.status(400).json({
        success: false,
        message: "Agent ID is required."
      });
    }


    // ==========================================================
    // 1. GET ACTIVE SAVINGS
    // ==========================================================

 const savings = await DailySaving.find({
  assignedAgent: agentId,
  status: {
    $in: ["ACTIVE", "COMPLETED", "CLOSED", "TERMINATED"]
  }
})
      .populate(
        "member",
        "memberId memberName mobile fatherName"
      )
      .populate(
        "areaGroup",
        "areaName"
      )
      .lean();


    // ==========================================================
    // 2. GET ACTIVE LOANS
    // ==========================================================

    const loans = await DailyLoan.find({
  assignedAgent: agentId,
  status: {
    $in: ["ACTIVE", "DUE", "OVERDUE", "CLOSED", "REJECTED"]
  }
})
      .populate(
        "member",
        "memberId memberName mobile fatherName"
      )
      .lean();


    // ==========================================================
    // 3. GET SAVING TRANSACTIONS - ONE QUERY
    // ==========================================================

    const savingIds = savings.map(
      (saving) => saving._id
    );

    let savingTransactions = [];

    if (savingIds.length > 0) {
      savingTransactions =
        await DailyTransaction.find({
          savingAccount: {
            $in: savingIds
          }
        })
          .select(
            "savingAccount paymentForDate collectionDate totalAmount"
          )
          .lean();
    }


    // ==========================================================
    // 4. GROUP SAVING TRANSACTIONS
    // ==========================================================

    const transactionsBySaving =
      new Map();

    for (
      const transaction
      of savingTransactions
    ) {
      const savingId =
        transaction.savingAccount.toString();

      if (
        !transactionsBySaving.has(
          savingId
        )
      ) {
        transactionsBySaving.set(
          savingId,
          []
        );
      }

      transactionsBySaving
        .get(savingId)
        .push(transaction);
    }


    // ==========================================================
    // 5. GET LOAN COLLECTIONS - ONE QUERY
    // ==========================================================

    const loanIds = loans.map(
      (loan) => loan._id
    );

    let loanCollections = [];

    if (loanIds.length > 0) {
      loanCollections =
        await LoanCollection.find({
          loan: {
            $in: loanIds
          }
        })
          .select(
            "loan installmentNo paymentDate dueDate totalAmount penalty"
          )
          .lean();
    }


    // ==========================================================
    // 6. GROUP LOAN COLLECTIONS
    // ==========================================================

    const collectionsByLoan =
      new Map();

    for (
      const collection
      of loanCollections
    ) {
      const loanId =
        collection.loan.toString();

      if (
        !collectionsByLoan.has(
          loanId
        )
      ) {
        collectionsByLoan.set(
          loanId,
          []
        );
      }

      collectionsByLoan
        .get(loanId)
        .push(collection);
    }


    // ==========================================================
    // 7. TODAY IN INDIA TIME
    // ==========================================================

    const todayKey =
      getISTDateKey(
        new Date()
      );

    const todayDate =
      istDateKeyToDate(
        todayKey
      );


    // ==========================================================
    // 8. PROCESS SAVINGS
    // ==========================================================

    const processedSavings =
      savings.map(
        (saving) => {

          const savingTransactions =
            transactionsBySaving.get(
              saving._id.toString()
            ) || [];


          // ====================================================
          // PAID DATES
          // ====================================================

          const paidDates =
            new Set();

          for (
            const transaction
            of savingTransactions
          ) {
            const paymentDate =
              transaction.paymentForDate ||
              transaction.collectionDate;

            if (!paymentDate) {
              continue;
            }

            paidDates.add(
              getISTDateKey(
                paymentDate
              )
            );
          }


          // ====================================================
          // START / END DATE
          // ====================================================

          const startKey =
            getISTDateKey(
              saving.startDate
            );

          const endKey =
            getISTDateKey(
              saving.endDate
            );


          // ====================================================
          // PENDING PAYMENTS
          // TODAY IS INCLUDED
          // ====================================================

          const pendingPayments =
            [];

          let currentKey =
            startKey;

          while (
            currentKey <= endKey &&
            currentKey <= todayKey
          ) {

            // Already collected
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


            // ==================================================
            // PENALTY
            // ==================================================

            const currentDate =
              istDateKeyToDate(
                currentKey
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


            // ==================================================
            // DAILY AMOUNT
            // ==================================================

            const dailyAmount =
              saving.collectionType ===
              "FIXED"
                ? Number(
                    saving.fixedAmount || 0
                  )
                : 0;


            // ==================================================
            // INSTALLMENT / DAY NUMBER
            // ==================================================

            const installmentNo =
              Math.floor(
                (
                  istDateKeyToDate(
                    currentKey
                  ) -
                  istDateKeyToDate(
                    startKey
                  )
                ) /
                (
                  1000 *
                  60 *
                  60 *
                  24
                )
              ) + 1;


            // ==================================================
            // ADD PENDING DAY
            // ==================================================

            pendingPayments.push({

              installmentNo,

              date:
                `${currentKey}T00:00:00+05:30`,

              dailyAmount,

              penalty,

              total:
                dailyAmount +
                penalty,

              isToday:
                currentKey ===
                todayKey
            });


            currentKey =
              addDaysToDateKey(
                currentKey,
                1
              );
          }


          // ====================================================
          // TODAY'S COLLECTION
          // ====================================================

          const todayCollected =
            savingTransactions
              .filter(
                (transaction) => {

                  const date =
                    transaction.paymentForDate ||
                    transaction.collectionDate;

                  return (
                    date &&
                    getISTDateKey(
                      date
                    ) === todayKey
                  );
                }
              )
              .reduce(
                (
                  sum,
                  transaction
                ) =>
                  sum +
                  Number(
                    transaction.totalAmount || 0
                  ),
                0
              );


          // ====================================================
          // RETURN SAVING
          // ====================================================

          return {

            savingId:
              saving._id,

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
                (
                  sum,
                  item
                ) =>
                  sum +
                  Number(
                    item.total || 0
                  ),
                0
              ),

            todayCollected,

            pendingPayments,

            member:
              saving.member,

            areaGroup:
              saving.areaGroup
          };
        }
      );


    // ==========================================================
    // 9. PROCESS LOANS
    // ==========================================================

    const processedLoans =
      loans.map(
        (loan) => {

          const collections =
            collectionsByLoan.get(
              loan._id.toString()
            ) || [];


          // ====================================================
          // PAID INSTALLMENTS
          // ====================================================

          const paidInstallments =
            new Set();

          for (
            const collection
            of collections
          ) {

            if (
              collection.installmentNo !==
                undefined &&
              collection.installmentNo !==
                null
            ) {
              paidInstallments.add(
                Number(
                  collection.installmentNo
                )
              );
            }
          }


          // ====================================================
          // TOTAL INSTALLMENTS
          // ====================================================

          let totalInstallments = 0;

          if (
            loan.loanType ===
            "DAILY"
          ) {

            totalInstallments =
              Number(
                loan.durationDays || 0
              );

          } else if (
            loan.loanType ===
            "WEEKLY"
          ) {

            totalInstallments =
              Number(
                loan.durationWeeks || 0
              );

          } else if (
            loan.loanType ===
            "MONTHLY"
          ) {

            totalInstallments =
              Number(
                loan.durationMonths || 0
              );

          } else if (
            loan.loanType ===
            "FIXED"
          ) {

            totalInstallments =
              Number(
                loan.loanTenureMonths || 0
              );
          }


          // ====================================================
          // LOAN DATE IN IST
          // ====================================================

          const loanDateKey =
            getISTDateKey(
              loan.loanDate
            );

          const loanDate =
            istDateKeyToDate(
              loanDateKey
            );


          // ====================================================
          // CALCULATE DUE INSTALLMENTS
          //
          // IMPORTANT:
          // TODAY IS ALWAYS INCLUDED.
          // ====================================================

          let dueTillToday = 0;


          // Loan hasn't started
          if (
            todayDate <
            loanDate
          ) {

            dueTillToday = 0;

          }


          // ====================================================
          // DAILY
          // ====================================================

          else if (
            loan.loanType ===
            "DAILY"
          ) {

            const daysSinceStart =
              Math.floor(
                (
                  todayDate -
                  loanDate
                ) /
                (
                  1000 *
                  60 *
                  60 *
                  24
                )
              );

            // +1 means TODAY is included
            dueTillToday =
              daysSinceStart + 1;

          }


          // ====================================================
          // WEEKLY
          // ====================================================

          else if (
            loan.loanType ===
            "WEEKLY"
          ) {

            const daysSinceStart =
              Math.floor(
                (
                  todayDate -
                  loanDate
                ) /
                (
                  1000 *
                  60 *
                  60 *
                  24
                )
              );

            dueTillToday =
              Math.floor(
                daysSinceStart / 7
              ) + 1;

          }


          // ====================================================
          // MONTHLY
          // ====================================================

          else if (
            loan.loanType ===
            "MONTHLY"
          ) {

            const monthDiff =
              (
                todayDate.getUTCFullYear() -
                loanDate.getUTCFullYear()
              ) *
                12 +
              (
                todayDate.getUTCMonth() -
                loanDate.getUTCMonth()
              );

            if (
              todayDate.getUTCDate() >=
              loanDate.getUTCDate()
            ) {

              dueTillToday =
                monthDiff + 1;

            } else {

              dueTillToday =
                monthDiff;
            }
          }


          // ====================================================
          // FIXED
          // ====================================================

          else if (
            loan.loanType ===
            "FIXED"
          ) {

            const monthDiff =
              (
                todayDate.getUTCFullYear() -
                loanDate.getUTCFullYear()
              ) *
                12 +
              (
                todayDate.getUTCMonth() -
                loanDate.getUTCMonth()
              );

            if (
              todayDate.getUTCDate() >=
              loanDate.getUTCDate()
            ) {

              dueTillToday =
                monthDiff + 1;

            } else {

              dueTillToday =
                monthDiff;
            }
          }


          // ====================================================
          // NEVER EXCEED TENURE
          // ====================================================

          dueTillToday =
            Math.max(
              0,
              Math.min(
                dueTillToday,
                totalInstallments
              )
            );


          // ====================================================
          // PENDING INSTALLMENTS
          // ====================================================

          const pendingInstallments =
            [];


          for (
            let i = 1;
            i <= dueTillToday;
            i++
          ) {

            // ----------------------------------------------
            // ALREADY PAID
            // ----------------------------------------------

            if (
              paidInstallments.has(i)
            ) {
              continue;
            }


            // ----------------------------------------------
            // DUE DATE
            // ----------------------------------------------

            const dueDate =
              new Date(
                loanDate
              );


            if (
              loan.loanType ===
              "DAILY"
            ) {

              dueDate.setUTCDate(
                dueDate.getUTCDate() +
                (i - 1)
              );

            } else if (
              loan.loanType ===
              "WEEKLY"
            ) {

              dueDate.setUTCDate(
                dueDate.getUTCDate() +
                (
                  (i - 1) * 7
                )
              );

            } else {

              dueDate.setUTCMonth(
                dueDate.getUTCMonth() +
                (i - 1)
              );
            }


            dueDate.setUTCHours(
              0,
              0,
              0,
              0
            );


            // ----------------------------------------------
            // DELAY
            // ----------------------------------------------

            let delay = 0;

            if (
              todayDate >
              dueDate
            ) {

              const difference =
                Math.floor(
                  (
                    todayDate -
                    dueDate
                  ) /
                  (
                    1000 *
                    60 *
                    60 *
                    24
                  )
                );

              if (
                loan.loanType ===
                "WEEKLY"
              ) {

                delay =
                  Math.floor(
                    difference / 7
                  );

              } else {

                delay =
                  difference;
              }
            }


            // ----------------------------------------------
            // PENALTY
            // ----------------------------------------------

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
                      Number(
                        loan.emiAmount || 0
                      ) *
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


            // ----------------------------------------------
            // EMI AMOUNT
            // ----------------------------------------------

            const emiAmount =
              Number(
                loan.emiAmount || 0
              );


            // ----------------------------------------------
            // TODAY FLAG
            // ----------------------------------------------

            const dueDateKey =
              getISTDateKey(
                dueDate
              );

            const isToday =
              dueDateKey ===
              todayKey;


            // ----------------------------------------------
            // ADD PENDING EMI
            // ----------------------------------------------

            pendingInstallments.push({

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
                    year: "numeric"
                  }
                ),

              emiAmount,

              delay,

              penalty,

              totalAmount:
                emiAmount +
                penalty,

              isToday
            });
          }


          // ====================================================
          // RETURN LOAN
          // ====================================================

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
              pendingInstallments.length,

            pendingPayments:
              pendingInstallments,

            member:
              loan.member
          };
        }
      );


    // ==========================================================
    // 10. GROUP SAVINGS + LOANS BY MEMBER
    // ==========================================================

    const memberMap =
      new Map();


    // ==========================================================
    // ADD SAVINGS
    // ==========================================================

    for (
      const saving
      of processedSavings
    ) {

      if (!saving.member) {
        continue;
      }

      const memberId =
        saving.member._id.toString();

      if (
        !memberMap.has(
          memberId
        )
      ) {

        memberMap.set(
          memberId,
          {
            member:
              saving.member,

            savings: [],

            loans: []
          }
        );
      }

      memberMap
        .get(memberId)
        .savings
        .push(saving);
    }


    // ==========================================================
    // ADD LOANS
    // ==========================================================

    for (
      const loan
      of processedLoans
    ) {

      if (!loan.member) {
        continue;
      }

      const memberId =
        loan.member._id.toString();

      if (
        !memberMap.has(
          memberId
        )
      ) {

        memberMap.set(
          memberId,
          {
            member:
              loan.member,

            savings: [],

            loans: []
          }
        );
      }

      memberMap
        .get(memberId)
        .loans
        .push(loan);
    }


    // ==========================================================
    // 11. FINAL RESPONSE
    // ==========================================================

    const members =
      Array.from(
        memberMap.values()
      );


    return res.status(200).json({

      success: true,

      count:
        members.length,

      members
    });


  } catch (error) {

    console.error(
      "UNIFIED AGENT COLLECTION ERROR:",
      error
    );

    return res.status(500).json({

      success: false,

      message:
        error.message
    });
  }
};