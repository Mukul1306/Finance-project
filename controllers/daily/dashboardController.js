const Agent = require("../../models/daily/Agent");
const DailyMember = require("../../models/daily/DailyMember");
const DailySaving = require("../../models/daily/DailySaving");
const DailyTransaction = require("../../models/daily/DailyTransaction");
const DailyLoan = require("../../models/daily/DailyLoan");
const LoanCollection = require("../../models/daily/LoanCollection");
const Expense = require("../../models/daily/Expense");

// =====================================================
// CONSTANTS
// =====================================================

const DAY_MS = 24 * 60 * 60 * 1000;
const IST_TIMEZONE = "Asia/Kolkata";

// =====================================================
// IST DATE KEY
// =====================================================

function getISTDateKey(dateValue = new Date()) {
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: IST_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(dateValue));

  const values = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  }

  return `${values.year}-${values.month}-${values.day}`;
}

// =====================================================
// IST DATE KEY -> REAL DATE
// =====================================================

function istKeyToDate(dateKey) {
  return new Date(`${dateKey}T00:00:00+05:30`);
}

// =====================================================
// ADD DAYS TO DATE KEY
// =====================================================

function addDaysToKey(dateKey, days) {
  const [year, month, day] = dateKey.split("-").map(Number);

  const date = new Date(
    Date.UTC(
      year,
      month - 1,
      day
    )
  );

  date.setUTCDate(
    date.getUTCDate() + Number(days)
  );

  return date.toISOString().slice(0, 10);
}

// =====================================================
// ADD MONTHS TO DATE KEY
// Same behavior as existing controller
// =====================================================

function addMonthsToKey(dateKey, months) {
  const [year, month, day] = dateKey.split("-").map(Number);

  const date = new Date(
    Date.UTC(
      year,
      month - 1,
      day
    )
  );

  date.setUTCMonth(
    date.getUTCMonth() + Number(months)
  );

  return date.toISOString().slice(0, 10);
}

// =====================================================
// DATE DIFFERENCE
// =====================================================

function diffDays(startKey, endKey) {
  const start = Date.UTC(
    ...startKey
      .split("-")
      .map((v, i) =>
        i === 1 ? Number(v) - 1 : Number(v)
      )
  );

  const end = Date.UTC(
    ...endKey
      .split("-")
      .map((v, i) =>
        i === 1 ? Number(v) - 1 : Number(v)
      )
  );

  return Math.floor(
    (end - start) / DAY_MS
  );
}

// =====================================================
// MONTH DIFFERENCE
// =====================================================

function diffMonths(startKey, endKey) {
  const [
    startYear,
    startMonth,
  ] = startKey.split("-").map(Number);

  const [
    endYear,
    endMonth,
  ] = endKey.split("-").map(Number);

  return (
    (endYear - startYear) * 12 +
    (endMonth - startMonth)
  );
}

// =====================================================
// LOAN TOTAL INSTALLMENTS
// =====================================================

function getLoanTotalInstallments(loan) {
  if (loan.loanType === "DAILY") {
    return Number(
      loan.durationDays || 0
    );
  }

  if (loan.loanType === "MONTHLY") {
    return Number(
      loan.durationMonths || 0
    );
  }

  if (loan.loanType === "FIXED") {
    return Number(
      loan.loanTenureMonths || 0
    );
  }

  return 0;
}

// =====================================================
// LOAN DISPLAY EMI
// FIXED = MONTHLY INTEREST
// =====================================================

function getLoanEMI(loan) {
  if (loan.loanType === "FIXED") {
    const tenure = Number(
      loan.loanTenureMonths || 0
    );

    if (tenure <= 0) {
      return 0;
    }

    return Math.round(
      Number(
        loan.totalInterest || 0
      ) / tenure
    );
  }

  return Number(
    loan.emiAmount || 0
  );
}

// =====================================================
// DASHBOARD DATE DATA
// Calculate ONCE per request
// =====================================================

function getDashboardDateData() {
  const todayKey = getISTDateKey(
    new Date()
  );

  const todayStart =
    istKeyToDate(todayKey);

  const tomorrowKey =
    addDaysToKey(
      todayKey,
      1
    );

  const tomorrowStart =
    istKeyToDate(
      tomorrowKey
    );

  const [
    year,
    month,
  ] = todayKey
    .split("-")
    .map(Number);

  const monthKey =
    `${year}-${String(month).padStart(2, "0")}`;

  const monthStartKey =
    `${year}-${String(month).padStart(2, "0")}-01`;

  const monthStart =
    istKeyToDate(
      monthStartKey
    );

  const nextMonthKey =
    addMonthsToKey(
      monthStartKey,
      1
    );

  const nextMonthStart =
    istKeyToDate(
      nextMonthKey
    );

  return {
    todayKey,
    tomorrowKey,
    todayStart,
    tomorrowStart,
    monthKey,
    monthStart,
    nextMonthStart,
  };
}

// =====================================================
// GET TODAY INSTALLMENT NUMBER
// OPTIMIZED
//
// Instead of looping through every installment,
// directly calculate today's installment.
// =====================================================

function getTodayInstallmentNumber(
  loan,
  todayKey
) {
  const baseDate =
    loan.loanDate ||
    loan.startDate;

  if (!baseDate) {
    return 0;
  }

  const loanDateKey =
    getISTDateKey(baseDate);

  if (loan.loanType === "DAILY") {
    const days =
      diffDays(
        loanDateKey,
        todayKey
      );

    if (days < 0) {
      return 0;
    }

    return days + 1;
  }

  if (
    loan.loanType === "MONTHLY" ||
    loan.loanType === "FIXED"
  ) {
    const months =
      diffMonths(
        loanDateKey,
        todayKey
      );

    if (months < 1) {
      return 0;
    }

    return months;
  }

  return 0;
}

// =====================================================
// GET LOAN PENALTY PER EVENT
// =====================================================

function getLoanPenaltyPerEvent(loan) {
  let penaltyBase =
    Number(
      loan.emiAmount || 0
    );

  if (loan.loanType === "FIXED") {
    const tenure =
      Number(
        loan.loanTenureMonths || 0
      );

    penaltyBase =
      tenure > 0
        ? Math.round(
            Number(
              loan.totalInterest || 0
            ) / tenure
          )
        : 0;
  }

  const penaltyValue =
    Number(
      loan.penaltyValue || 0
    );

  if (
    loan.penaltyType ===
    "PERCENTAGE"
  ) {
    return Math.round(
      (
        penaltyBase *
        penaltyValue
      ) / 100
    );
  }

  return penaltyValue;
}

// =====================================================
// GET LOAN PENALTY EVENTS
//
// Optimized mathematical calculation.
// No loop through every installment.
// =====================================================

function getLoanPenaltyEvents(
  loan,
  todayKey
) {
  const baseDate =
    loan.loanDate ||
    loan.startDate;

  if (!baseDate) {
    return 0;
  }

  const loanDateKey =
    getISTDateKey(baseDate);

  const totalInstallments =
    getLoanTotalInstallments(
      loan
    );

  if (
    totalInstallments <= 0
  ) {
    return 0;
  }

  const grace =
    Number(
      loan.gracePeriod || 0
    );

  const penaltyPerEvent =
    getLoanPenaltyPerEvent(
      loan
    );

  if (
    penaltyPerEvent <= 0
  ) {
    return 0;
  }

  const currentInstallment =
    getTodayInstallmentNumber(
      loan,
      todayKey
    );

  if (
    currentInstallment <= 0
  ) {
    return 0;
  }

  const dueInstallments =
    Math.min(
      currentInstallment,
      totalInstallments
    );

  // ===============================================
  // DAILY
  // One penalty per overdue installment
  // ===============================================

  if (
    loan.loanType === "DAILY"
  ) {
    let events = 0;

    const penaltyStartOffset =
      grace + 1;

    if (
      dueInstallments >=
      penaltyStartOffset
    ) {
      events =
        dueInstallments -
        penaltyStartOffset +
        1;
    }

    return Math.max(
      0,
      events
    );
  }

  // ===============================================
  // MONTHLY / FIXED
  // One penalty per overdue month
  // ===============================================

  let events = 0;

  for (
    let installmentNo = 1;
    installmentNo <= dueInstallments;
    installmentNo++
  ) {
    const dueKey =
      addMonthsToKey(
        loanDateKey,
        installmentNo
      );

    const penaltyStartKey =
      addDaysToKey(
        dueKey,
        grace + 1
      );

    if (
      penaltyStartKey >
      todayKey
    ) {
      continue;
    }

    const penaltyMonths =
      diffMonths(
        penaltyStartKey,
        todayKey
      ) + 1;

    if (
      penaltyMonths > 0
    ) {
      events +=
        penaltyMonths;
    }
  }

  return events;
}

// =====================================================
// DASHBOARD
// =====================================================

exports.getDashboard =
async (
  req,
  res
) => {

  const requestStarted =
    Date.now();

  try {

    // =================================================
    // DATE DATA
    // CALCULATE ONLY ONCE
    // =================================================

    const {
      todayKey,
      todayStart,
      tomorrowStart,
      monthKey,
      monthStart,
      nextMonthStart,
    } =
      getDashboardDateData();

    // =================================================
    // BASIC COUNTS
    // =================================================

    const [
      totalAgents,
      totalMembers,
      activeLoans,
    ] =
      await Promise.all([

        Agent.countDocuments(),

        DailyMember.countDocuments(),

        DailyLoan.countDocuments({
          status: "ACTIVE",
        }),

      ]);

    // =================================================
    // START SIMPLE DATABASE QUERIES
    // ALL RUN IN PARALLEL
    // =================================================

    const dailyCollectionPromise =
      DailyTransaction.aggregate([
        {
          $group: {
            _id: null,

            total: {
              $sum: {
                $ifNull: [
                  "$totalAmount",
                  0,
                ],
              },
            },
          },
        },
      ]);

    const loanCollectionPromise =
      LoanCollection.aggregate([
        {
          $group: {
            _id: null,

            total: {
              $sum: {
                $ifNull: [
                  "$totalAmount",
                  0,
                ],
              },
            },
          },
        },
      ]);

    const totalExpensePromise =
      Expense.aggregate([
        {
          $group: {
            _id: null,

            total: {
              $sum: {
                $ifNull: [
                  "$amount",
                  0,
                ],
              },
            },
          },
        },
      ]);

    const loanGivenPromise =
      DailyLoan.aggregate([
        {
          $group: {
            _id: null,

            total: {
              $sum: {
                $ifNull: [
                  "$loanAmount",
                  0,
                ],
              },
            },
          },
        },
      ]);

    const todayDailyAgentCollectionPromise =
      DailyTransaction.aggregate([
        {
          $match: {
            collectorType: "AGENT",

            collectionDate: {
              $gte: todayStart,
              $lt: tomorrowStart,
            },
          },
        },

        {
          $group: {
            _id: null,

            total: {
              $sum: {
                $ifNull: [
                  "$totalAmount",
                  0,
                ],
              },
            },
          },
        },
      ]);

    const todayLoanAgentCollectionPromise =
      LoanCollection.aggregate([
        {
          $match: {
            collectorType: "AGENT",

            paymentDate: {
              $gte: todayStart,
              $lt: tomorrowStart,
            },
          },
        },

        {
          $group: {
            _id: null,

            total: {
              $sum: {
                $ifNull: [
                  "$totalAmount",
                  0,
                ],
              },
            },
          },
        },
      ]);

    // =================================================
    // DAILY SAVING TARGET
    // =================================================

    const dailySavingTargetPromise =
      DailySaving.aggregate([

        {
          $match: {
            status: "ACTIVE",

            collectionType:
              "FIXED",

            startDate: {
              $exists: true,
            },

            endDate: {
              $exists: true,
            },
          },
        },

        {
          $match: {
            $expr: {
              $and: [

                {
                  $lte: [
                    {
                      $dateToString: {
                        date:
                          "$startDate",

                        format:
                          "%Y-%m-%d",

                        timezone:
                          IST_TIMEZONE,
                      },
                    },

                    todayKey,
                  ],
                },

                {
                  $gte: [
                    {
                      $dateToString: {
                        date:
                          "$endDate",

                        format:
                          "%Y-%m-%d",

                        timezone:
                          IST_TIMEZONE,
                      },
                    },

                    todayKey,
                  ],
                },

              ],
            },
          },
        },

        {
          $group: {
            _id: null,

            total: {
              $sum: {
                $ifNull: [
                  "$fixedAmount",
                  0,
                ],
              },
            },
          },
        },

      ]);

    // =================================================
    // CURRENT MONTH EXPENSE
    // =================================================

    const currentMonthExpensePromise =
      Expense.aggregate([

        {
          $match: {
            $or: [

              {
                expenseDate: {
                  $gte: monthStart,
                  $lt: nextMonthStart,
                },
              },

              {
                expenseDate: {
                  $exists: false,
                },

                createdAt: {
                  $gte: monthStart,
                  $lt: nextMonthStart,
                },
              },

            ],
          },
        },

        {
          $group: {
            _id: null,

            total: {
              $sum: {
                $ifNull: [
                  "$amount",
                  0,
                ],
              },
            },
          },
        },

      ]);

    // =================================================
    // ACTIVE LOANS
    // SMALL FIELD SELECTION ONLY
    // =================================================

    const activeLoanRowsPromise =
      DailyLoan.find({
        status: {
          $in: [
            "ACTIVE",
            "DUE",
            "OVERDUE",
          ],
        },
      })
        .select(
          [
            "loanType",
            "loanDate",
            "startDate",
            "durationDays",
            "durationMonths",
            "loanTenureMonths",
            "emiAmount",
            "totalInterest",
            "gracePeriod",
            "penaltyType",
            "penaltyValue",
            "status",
          ].join(" ")
        )
        .lean();

    // =================================================
    // ACTIVE SAVINGS
    // SMALL FIELD SELECTION ONLY
    // =================================================

    const savingsForPenaltyPromise =
      DailySaving.find({
        status: "ACTIVE",

        startDate: {
          $exists: true,
        },
      })
        .select(
          [
            "startDate",
            "endDate",
            "fixedAmount",
            "collectionType",
            "graceDays",
            "penaltyType",
            "penaltyValue",
          ].join(" ")
        )
        .lean();

    // =================================================
    // RECENT COLLECTIONS
    // =================================================

    const recentCollectionsPromise =
      DailyTransaction.find()
        .sort({
          createdAt: -1,
        })
        .limit(10)
        .populate(
          "member",
          "memberName memberId"
        )
        .lean();

    // =================================================
    // TOP AGENTS
    // =================================================

    const topAgentsPromise =
      DailyTransaction.aggregate([

        {
          $match: {
            collectorType:
              "AGENT",
          },
        },

        {
          $group: {
            _id:
              "$collectorId",

            totalCollection: {
              $sum: {
                $ifNull: [
                  "$totalAmount",
                  0,
                ],
              },
            },
          },
        },

        {
          $sort: {
            totalCollection: -1,
          },
        },

        {
          $limit: 5,
        },

        {
          $lookup: {
            from:
              "dailyagents",

            localField:
              "_id",

            foreignField:
              "_id",

            as:
              "agent",
          },
        },

        {
          $project: {
            _id: 1,

            totalCollection: 1,

            agent: {
              _id: 1,
              name: 1,
            },
          },
        },

      ]);

    // =================================================
    // WAIT FOR PARALLEL QUERIES
    // =================================================

    const [
      dailyCollectionResult,
      loanCollectionResult,
      expenseResult,
      loanGivenResult,
      todayDailyAgentResult,
      todayLoanAgentResult,
      dailySavingTargetResult,
      currentMonthExpenseResult,
      activeLoanRows,
      savingsForPenalty,
      recentCollections,
      topAgents,
    ] =
      await Promise.all([

        dailyCollectionPromise,

        loanCollectionPromise,

        totalExpensePromise,

        loanGivenPromise,

        todayDailyAgentCollectionPromise,

        todayLoanAgentCollectionPromise,

        dailySavingTargetPromise,

        currentMonthExpensePromise,

        activeLoanRowsPromise,

        savingsForPenaltyPromise,

        recentCollectionsPromise,

        topAgentsPromise,

      ]);

    // =================================================
    // BASIC VALUES
    // =================================================

    const totalDailyCollection =
      Number(
        dailyCollectionResult[0]
          ?.total || 0
      );

    const totalLoanCollection =
      Number(
        loanCollectionResult[0]
          ?.total || 0
      );

    const totalExpenses =
      Number(
        expenseResult[0]
          ?.total || 0
      );

    const totalLoanGiven =
      Number(
        loanGivenResult[0]
          ?.total || 0
      );

    const todayDailyAgentCollection =
      Number(
        todayDailyAgentResult[0]
          ?.total || 0
      );

    const todayLoanAgentCollection =
      Number(
        todayLoanAgentResult[0]
          ?.total || 0
      );

    const todayActualAgentCollection =
      todayDailyAgentCollection +
      todayLoanAgentCollection;

    const dailySavingTarget =
      Number(
        dailySavingTargetResult[0]
          ?.total || 0
      );

    const thisMonthExpense =
      Number(
        currentMonthExpenseResult[0]
          ?.total || 0
      );

    // =================================================
    // FINANCIAL CALCULATION
    // =================================================

    const totalIncome =
      totalDailyCollection +
      totalLoanCollection;

    const netProfit =
      totalIncome -
      totalExpenses -
      totalLoanGiven;

    
      // =====================================================
// LOAN TARGET
// OPTIMIZED
// =====================================================

let loanTarget = 0;

for (const loan of activeLoanRows) {
  const installmentNo =
    getTodayInstallmentNumber(
      loan,
      todayKey
    );

  const totalInstallments =
    getLoanTotalInstallments(
      loan
    );

  const emi =
    getLoanEMI(
      loan
    );

  if (
    installmentNo <= 0 ||
    totalInstallments <= 0 ||
    emi <= 0
  ) {
    continue;
  }

  if (
    installmentNo <=
    totalInstallments
  ) {
    loanTarget += Number(emi);
  }
}

// =====================================================
// DAILY SAVING PENDING PENALTY
//
// MongoDB calculates this in one aggregation.
// We do NOT load all DailyTransaction records
// into Node.js.
// =====================================================

let totalSavingPendingPenalty = 0;

if (
  savingsForPenalty.length > 0
) {

  const savingPenaltyRows =
    await DailySaving.aggregate([

      // -----------------------------------------------
      // ACTIVE SAVINGS ONLY
      // -----------------------------------------------

      {
        $match: {
          status: "ACTIVE",

          startDate: {
            $exists: true,
          },
        },
      },

      // -----------------------------------------------
      // CALCULATE PENALTY DATES
      // -----------------------------------------------

      {
        $set: {

          graceValue: {
            $ifNull: [
              "$graceDays",
              0,
            ],
          },

          penaltyStartDate: {
            $dateAdd: {
              startDate:
                "$startDate",

              unit: "day",

              amount: {
                $add: [
                  {
                    $ifNull: [
                      "$graceDays",
                      0,
                    ],
                  },
                  1,
                ],
              },

              timezone:
                IST_TIMEZONE,
            },
          },

          endExclusiveDate: {
            $cond: [

              {
                $ne: [
                  "$endDate",
                  null,
                ],
              },

              {
                $dateAdd: {
                  startDate:
                    "$endDate",

                  unit: "day",

                  amount: 1,

                  timezone:
                    IST_TIMEZONE,
                },
              },

              tomorrowStart,
            ],
          },

        },
      },

      // -----------------------------------------------
      // EFFECTIVE END DATE
      // -----------------------------------------------

      {
        $set: {

          effectiveEndDate: {
            $cond: [

              {
                $lt: [
                  "$endExclusiveDate",
                  tomorrowStart,
                ],
              },

              "$endExclusiveDate",

              tomorrowStart,
            ],
          },

        },
      },

      // -----------------------------------------------
      // ONLY SAVINGS THAT CAN HAVE PENALTY
      // -----------------------------------------------

      {
        $match: {

          $expr: {
            $and: [

              {
                $lt: [
                  "$startDate",
                  tomorrowStart,
                ],
              },

              {
                $lt: [
                  "$penaltyStartDate",
                  "$effectiveEndDate",
                ],
              },

            ],
          },

        },
      },

      // -----------------------------------------------
      // FIND PAID OVERDUE DAYS
      //
      // IMPORTANT:
      // savingAccount index is used here.
      // -----------------------------------------------

      {
        $lookup: {

          from:
            "dailytransactions",

          let: {
            savingId:
              "$_id",

            penaltyStart:
              "$penaltyStartDate",

            effectiveEnd:
              "$effectiveEndDate",
          },

          pipeline: [

            {
              $match: {

                $expr: {
                  $eq: [
                    "$savingAccount",
                    "$$savingId",
                  ],
                },

              },
            },

            {
              $project: {

                paidDate: {
                  $ifNull: [
                    "$paymentForDate",
                    "$collectionDate",
                  ],
                },

              },
            },

            {
              $match: {

                $expr: {
                  $and: [

                    {
                      $ne: [
                        "$paidDate",
                        null,
                      ],
                    },

                    {
                      $gte: [
                        "$paidDate",
                        "$$penaltyStart",
                      ],
                    },

                    {
                      $lt: [
                        "$paidDate",
                        "$$effectiveEnd",
                      ],
                    },

                  ],
                },

              },
            },

            {
              $count:
                "paidCount",
            },

          ],

          as:
            "paidOverdue",
        },
      },

      // -----------------------------------------------
      // CANDIDATE DAYS + PAID DAYS
      // -----------------------------------------------

      {
        $set: {

          candidateDays: {
            $dateDiff: {

              startDate:
                "$penaltyStartDate",

              endDate:
                "$effectiveEndDate",

              unit:
                "day",

              timezone:
                IST_TIMEZONE,
            },
          },

          paidDays: {
            $ifNull: [

              {
                $arrayElemAt: [
                  "$paidOverdue.paidCount",
                  0,
                ],
              },

              0,
            ],
          },

        },
      },

      // -----------------------------------------------
      // UNPAID DAYS
      // -----------------------------------------------

      {
        $set: {

          unpaidDays: {
            $max: [

              0,

              {
                $subtract: [
                  "$candidateDays",
                  "$paidDays",
                ],
              },

            ],
          },

          penaltyPerDay: {
            $cond: [

              {
                $eq: [
                  "$penaltyType",
                  "FIXED",
                ],
              },

              {
                $ifNull: [
                  "$penaltyValue",
                  0,
                ],
              },

              {
                $round: [

                  {
                    $divide: [

                      {
                        $multiply: [

                          {
                            $ifNull: [
                              "$fixedAmount",
                              0,
                            ],
                          },

                          {
                            $ifNull: [
                              "$penaltyValue",
                              0,
                            ],
                          },

                        ],
                      },

                      100,
                    ],
                  },

                  0,
                ],
              },

            ],
          },

        },
      },

      // -----------------------------------------------
      // TOTAL PENALTY
      // -----------------------------------------------

      {
        $group: {

          _id: null,

          total: {
            $sum: {

              $multiply: [
                "$unpaidDays",
                "$penaltyPerDay",
              ],

            },
          },

        },
      },

    ]);

  totalSavingPendingPenalty =
    Number(
      savingPenaltyRows[0]
        ?.total || 0
    );
}

// =====================================================
// LOAN PENDING PENALTY
//
// Calculate theoretical penalty mathematically.
// No database query for every installment.
// =====================================================

let theoreticalLoanPenalty = 0;

for (const loan of activeLoanRows) {

  const penaltyEvents =
    getLoanPenaltyEvents(
      loan,
      todayKey
    );

  const penaltyPerEvent =
    getLoanPenaltyPerEvent(
      loan
    );

  if (
    penaltyEvents <= 0 ||
    penaltyPerEvent <= 0
  ) {
    continue;
  }

  theoreticalLoanPenalty +=
    penaltyEvents *
    penaltyPerEvent;
}

// =====================================================
// PAID LOAN PENALTY CONTRIBUTION
//
// ONE aggregation instead of TWO separate
// LoanCollection aggregations.
//
// We calculate contribution PER LOAN.
// =====================================================

let paidLoanPenaltyContribution = 0;

if (
  activeLoanRows.length > 0
) {

  const activeLoanIds =
    activeLoanRows.map(
      loan => loan._id
    );

  const paidPenaltyByLoan =
    await LoanCollection.aggregate([

      // -----------------------------------------------
      // ONLY ACTIVE LOAN COLLECTIONS
      // -----------------------------------------------

      {
        $match: {

          loan: {
            $in:
              activeLoanIds,
          },

          dueDate: {
            $exists: true,

            $ne:
              null,
          },

        },
      },

      // -----------------------------------------------
      // GET LOAN INFORMATION
      // -----------------------------------------------

      {
        $lookup: {

          from:
            "dailyloans",

          localField:
            "loan",

          foreignField:
            "_id",

          as:
            "loanInfo",
        },
      },

      {
        $unwind:
          "$loanInfo",
      },

      // -----------------------------------------------
      // PENALTY START DATE
      // -----------------------------------------------

      {
        $set: {

          penaltyStartDate: {
            $dateAdd: {

              startDate:
                "$dueDate",

              unit:
                "day",

              amount: {
                $add: [

                  {
                    $ifNull: [
                      "$loanInfo.gracePeriod",
                      0,
                    ],
                  },

                  1,

                ],
              },

              timezone:
                IST_TIMEZONE,
            },
          },

        },
      },

      // -----------------------------------------------
      // ONLY PENALTIES THAT HAVE STARTED
      // -----------------------------------------------

      {
        $match: {

          $expr: {
            $lte: [
              "$penaltyStartDate",
              todayStart,
            ],
          },

        },
      },

      // -----------------------------------------------
      // NUMBER OF PENALTY EVENTS
      // -----------------------------------------------

      {
        $set: {

          penaltyCount: {

            $cond: [

              // DAILY = ONE PENALTY
              {
                $eq: [
                  "$loanInfo.loanType",
                  "DAILY",
                ],
              },

              1,

              // MONTHLY / FIXED
              {
                $add: [

                  {
                    $dateDiff: {

                      startDate:
                        "$penaltyStartDate",

                      endDate:
                        todayStart,

                      unit:
                        "month",

                      timezone:
                        IST_TIMEZONE,
                    },
                  },

                  1,

                ],
              },

            ],

          },

        },
      },

      // -----------------------------------------------
      // GROUP BY LOAN
      // -----------------------------------------------

      {
        $group: {

          _id:
            "$loan",

          penaltyCount: {
            $sum:
              "$penaltyCount",
          },

        },
      },

    ]);

  // ===================================================
  // BUILD MAP
  // ===================================================

  const paidContributionMap =
    new Map();

  for (
    const row
    of paidPenaltyByLoan
  ) {

    paidContributionMap.set(
      String(row._id),

      Number(
        row.penaltyCount || 0
      )
    );

  }

  // ===================================================
  // CALCULATE ACTUAL PAID PENALTY CONTRIBUTION
  // ===================================================

  for (
    const loan
    of activeLoanRows
  ) {

    const contribution =
      Number(
        paidContributionMap.get(
          String(loan._id)
        ) || 0
      );

    if (
      contribution <= 0
    ) {
      continue;
    }

    const singlePenalty =
      getLoanPenaltyPerEvent(
        loan
      );

    if (
      singlePenalty <= 0
    ) {
      continue;
    }

    paidLoanPenaltyContribution +=
      contribution *
      singlePenalty;
  }
}

// =====================================================
// TOTAL LOAN PENDING PENALTY
// =====================================================

const totalLoanPendingPenalty =
  Math.max(
    0,

    theoreticalLoanPenalty -
      paidLoanPenaltyContribution
  );

// =====================================================
// TOTAL PENDING PENALTY
// =====================================================

const totalPendingPenalty =
  Math.max(
    0,

    Number(
      totalSavingPendingPenalty
    ) +

    Number(
      totalLoanPendingPenalty
    )
  );

// =====================================================
// TOTAL TARGET
// =====================================================

const totalTarget =
  Number(
    dailySavingTarget
  ) +

  Number(
    loanTarget
  );

// =====================================================
// DEBUG PERFORMANCE
// =====================================================

console.log(
  "----------------------------------------"
);

console.log(
  `Dashboard calculation completed in ${
    Date.now() - requestStarted
  }ms`
);

console.log(
  "----------------------------------------"
);

// =====================================================
// FINAL DASHBOARD RESPONSE
// =====================================================

res.json({

  success: true,

  // -----------------------------------------------
  // EXISTING DASHBOARD VALUES
  // -----------------------------------------------

  totalAgents,

  totalMembers,

  activeLoans,

  totalDailyCollection,

  totalAgentCollection:
    totalDailyCollection,

  totalLoanCollection,

  totalExpenses,

  totalLoanGiven,

  totalIncome,

  netProfit,

  recentCollections,

  topAgents,

  // -----------------------------------------------
  // TARGET VALUES
  // -----------------------------------------------

  dailySavingTarget,

  loanTarget,

  totalTarget,

  // -----------------------------------------------
  // TODAY'S ACTUAL COLLECTION
  // -----------------------------------------------

  todayActualAgentCollection,

  // -----------------------------------------------
  // PENALTY
  // -----------------------------------------------

  totalPendingPenalty,

  // -----------------------------------------------
  // CURRENT MONTH EXPENSE
  // -----------------------------------------------

  thisMonthExpense,

  // -----------------------------------------------
  // DEBUG / REPORT VALUES
  // -----------------------------------------------

  todayKey,

  currentMonth:
    monthKey,

});

  } catch (error) {

    console.error(
      "================================="
    );

    console.error(
      "DASHBOARD ERROR:"
    );

    console.error(
      error
    );

    console.error(
      "================================="
    );

    res.status(500).json({

      success: false,

      message:
        error.message ||
        "Dashboard loading failed",

    });

  }

};