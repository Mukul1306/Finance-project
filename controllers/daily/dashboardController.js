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
// Example:
// 2026-09-20
// =====================================================

function getISTDateKey(dateValue = new Date()) {

  const parts =
    new Intl.DateTimeFormat(
      "en-IN",
      {
        timeZone: IST_TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }
    ).formatToParts(
      new Date(dateValue)
    );

  const values = {};

  for (const part of parts) {

    if (part.type !== "literal") {
      values[part.type] = part.value;
    }

  }

  return (
    `${values.year}-${values.month}-${values.day}`
  );
}


// =====================================================
// IST DATE KEY -> REAL DATE
// =====================================================

function istKeyToDate(dateKey) {

  return new Date(
    `${dateKey}T00:00:00+05:30`
  );

}


// =====================================================
// ADD DAYS TO DATE KEY
// =====================================================

function addDaysToKey(
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
    date.getUTCDate() + Number(days)
  );

  return date
    .toISOString()
    .slice(0, 10);

}


// =====================================================
// ADD MONTHS TO DATE KEY
// This follows JavaScript's setMonth behavior,
// matching your existing loan controller logic.
// =====================================================

function addMonthsToKey(
  dateKey,
  months
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

  date.setUTCMonth(
    date.getUTCMonth() +
    Number(months)
  );

  return date
    .toISOString()
    .slice(0, 10);

}


// =====================================================
// DATE DIFFERENCE
// =====================================================

function diffDays(
  startKey,
  endKey
) {

  const start =
    Date.UTC(
      ...startKey
        .split("-")
        .map((v, i) => i === 1 ? Number(v) - 1 : Number(v))
    );

  const end =
    Date.UTC(
      ...endKey
        .split("-")
        .map((v, i) => i === 1 ? Number(v) - 1 : Number(v))
    );

  return Math.floor(
    (end - start) / DAY_MS
  );

}


// =====================================================
// MONTH DIFFERENCE
// =====================================================

function diffMonths(
  startKey,
  endKey
) {

  const [
    startYear,
    startMonth
  ] =
    startKey
      .split("-")
      .map(Number);

  const [
    endYear,
    endMonth
  ] =
    endKey
      .split("-")
      .map(Number);

  return (
    (endYear - startYear) * 12 +
    (endMonth - startMonth)
  );

}


// =====================================================
// LOAN TOTAL INSTALLMENTS
// =====================================================

function getLoanTotalInstallments(
  loan
) {

  if (
    loan.loanType === "DAILY"
  ) {

    return Number(
      loan.durationDays || 0
    );

  }

  if (
    loan.loanType === "MONTHLY"
  ) {

    return Number(
      loan.durationMonths || 0
    );

  }

  if (
    loan.loanType === "FIXED"
  ) {

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

function getLoanEMI(
  loan
) {

  if (
    loan.loanType === "FIXED"
  ) {

    const tenure =
      Number(
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
// GET TODAY'S DASHBOARD DATE RANGE
// =====================================================

function getDashboardDateData() {

  const todayKey =
    getISTDateKey(
      new Date()
    );

  const todayStart =
    istKeyToDate(
      todayKey
    );

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
    month
  ] =
    todayKey
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
    nextMonthStart
  };

}


// =====================================================
// DASHBOARD
// =====================================================

exports.getDashboard =
async (
  req,
  res
) => {

  try {

    // =================================================
    // DATE DATA
    // =================================================

    const {
      todayKey,
      tomorrowStart,
      monthKey,
      monthStart,
      nextMonthStart
    } =
      getDashboardDateData();


    // =================================================
    // BASIC COUNTS
    // KEEP EXISTING BEHAVIOR
    // =================================================

    const [
      totalAgents,
      totalMembers,
      activeLoans
    ] =
      await Promise.all([

        Agent.countDocuments(),

        DailyMember.countDocuments(),

        DailyLoan.countDocuments({
          status: "ACTIVE"
        })

      ]);


    // =================================================
    // ALL-TIME DAILY SAVING COLLECTION
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
                  0
                ]
              }
            }
          }
        }

      ]);


    // =================================================
    // ALL-TIME LOAN COLLECTION
    // =================================================

    const loanCollectionPromise =
      LoanCollection.aggregate([

        {
          $group: {
            _id: null,

            total: {
              $sum: {
                $ifNull: [
                  "$totalAmount",
                  0
                ]
              }
            }
          }
        }

      ]);


    // =================================================
    // ALL-TIME EXPENSE
    // KEEP EXISTING NET PROFIT BEHAVIOR
    // =================================================

    const totalExpensePromise =
      Expense.aggregate([

        {
          $group: {
            _id: null,

            total: {
              $sum: {
                $ifNull: [
                  "$amount",
                  0
                ]
              }
            }
          }
        }

      ]);


    // =================================================
    // ALL-TIME LOAN GIVEN
    // =================================================

    const loanGivenPromise =
      DailyLoan.aggregate([

        {
          $group: {
            _id: null,

            total: {
              $sum: {
                $ifNull: [
                  "$loanAmount",
                  0
                ]
              }
            }
          }
        }

      ]);


    // =================================================
    // TODAY ACTUAL AGENT COLLECTION
    //
    // Daily:
    // collectionDate = actual collection date
    //
    // Loan:
    // paymentDate = actual collection date
    // =================================================

    const todayDailyAgentCollectionPromise =
      DailyTransaction.aggregate([

        {
          $match: {

            collectorType: "AGENT",

            collectionDate: {
              $gte: getDashboardDateData().todayStart,
              $lt: tomorrowStart
            }

          }
        },

        {
          $group: {

            _id: null,

            total: {
              $sum: {
                $ifNull: [
                  "$totalAmount",
                  0
                ]
              }
            }

          }
        }

      ]);


    const todayLoanAgentCollectionPromise =
      LoanCollection.aggregate([

        {
          $match: {

            collectorType: "AGENT",

            paymentDate: {
              $gte: getDashboardDateData().todayStart,
              $lt: tomorrowStart
            }

          }
        },

        {
          $group: {

            _id: null,

            total: {
              $sum: {
                $ifNull: [
                  "$totalAmount",
                  0
                ]
              }
            }

          }
        }

      ]);


    // =================================================
    // DAILY SAVING TARGET
    //
    // Only:
    // ACTIVE
    // FIXED savings
    // active on today's date
    // =================================================

    const dailySavingTargetPromise =
      DailySaving.aggregate([

        {
          $match: {
            status: "ACTIVE",

            collectionType: "FIXED",

            startDate: {
              $exists: true
            },

            endDate: {
              $exists: true
            }
          }
        },

        {
          $match: {

            $expr: {

              $and: [

                {
                  $lte: [
                    {
                      $dateToString: {
                        date: "$startDate",
                        format: "%Y-%m-%d",
                        timezone: IST_TIMEZONE
                      }
                    },

                    todayKey
                  ]
                },

                {
                  $gte: [
                    {
                      $dateToString: {
                        date: "$endDate",
                        format: "%Y-%m-%d",
                        timezone: IST_TIMEZONE
                      }
                    },

                    todayKey
                  ]
                }

              ]

            }

          }

        },

        {
          $group: {

            _id: null,

            total: {

              $sum: {
                $ifNull: [
                  "$fixedAmount",
                  0
                ]
              }

            }

          }
        }

      ]);


    // =================================================
    // LOAD ACTIVE SAVINGS
    // ONLY SMALL ACCOUNT METADATA
    //
    // Used for exact pending penalty calculation.
    // =================================================

    const savingsForPenalty =
      await DailySaving.find({

        status: "ACTIVE",

        startDate: {
          $exists: true
        }

      })
      .select(
        [
          "startDate",
          "endDate",
          "fixedAmount",
          "collectionType",
          "graceDays",
          "penaltyType",
          "penaltyValue"
        ].join(" ")
      )
      .lean();


    // =================================================
    // DAILY SAVING PENALTY
    //
    // MongoDB calculates paid overdue saving days
    // without bringing the whole transaction history
    // into Node memory.
    // =================================================

    let totalSavingPendingPenalty = 0;


    if (
      savingsForPenalty.length > 0
    ) {

      const savingIds =
        savingsForPenalty.map(
          saving => saving._id
        );


      const paidSavingPenalty =
        await DailySaving.aggregate([

          {
            $match: {

              _id: {
                $in: savingIds
              }

            }

          },

          {
            $lookup: {

              from: "dailytransactions",

              let: {
                savingId: "$_id",
                savingStart: "$startDate",
                savingEnd: "$endDate",
                savingGrace: {
                  $ifNull: [
                    "$graceDays",
                    0
                  ]
                }
              },

              pipeline: [

                {
                  $match: {

                    $expr: {

                      $eq: [
                        "$savingAccount",
                        "$$savingId"
                      ]

                    }

                  }

                },

                {
                  $project: {

                    paidDate: {
                      $ifNull: [
                        "$paymentForDate",
                        "$collectionDate"
                      ]
                    },

                    savingStart: "$$savingStart",

                    savingEnd: "$$savingEnd",

                    savingGrace:
                      "$$savingGrace"

                  }

                },

                {
                  $match: {

                    $expr: {

                      $and: [

                        {
                          $ne: [
                            "$paidDate",
                            null
                          ]
                        },

                        {
                          $gte: [
                            "$paidDate",
                            "$savingStart"
                          ]
                        },

                        {
                          $lt: [

                            "$paidDate",

                            {
                              $dateAdd: {

                                startDate:
                                  "$savingStart",

                                unit: "day",

                                amount: 0

                              }

                            }

                          ]

                        }

                      ]

                    }

                  }

                },

                {
                  $limit: 0
                }

              ],

              as: "unused"
            }
          }

        ]);
    }


    // =================================================
    // IMPORTANT:
    // Exact saving penalty calculation is done below
    // with one targeted aggregation per ACTIVE saving,
    // not with find() of all transactions.
    //
    // We use COUNT documents before the penalty window.
    // =================================================

    if (
      savingsForPenalty.length > 0
    ) {

      const savingPenaltyRows =
        await DailySaving.aggregate([

          {
            $match: {

              status: "ACTIVE",

              startDate: {
                $exists: true
              }

            }
          },

          {
            $set: {

              graceValue: {
                $ifNull: [
                  "$graceDays",
                  0
                ]
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
                          0
                        ]
                      },
                      1
                    ]
                  },

                  timezone:
                    IST_TIMEZONE

                }

              },

              endExclusiveDate: {

                $cond: [

                  {
                    $ne: [
                      "$endDate",
                      null
                    ]
                  },

                  {
                    $dateAdd: {

                      startDate:
                        "$endDate",

                      unit: "day",

                      amount: 1,

                      timezone:
                        IST_TIMEZONE

                    }

                  },

                  tomorrowStart

                ]

              }

            }

          },

          {
            $set: {

              effectiveEndDate: {

                $cond: [

                  {
                    $lt: [
                      "$endExclusiveDate",
                      tomorrowStart
                    ]
                  },

                  "$endExclusiveDate",

                  tomorrowStart

                ]

              }

            }

          },

          {
            $match: {

              $expr: {

                $and: [

                  {
                    $lt: [
                      "$startDate",
                      tomorrowStart
                    ]
                  },

                  {
                    $lt: [
                      "$penaltyStartDate",
                      "$effectiveEndDate"
                    ]
                  }

                ]

              }

            }

          },

          {
            $lookup: {

              from: "dailytransactions",

              let: {

                savingId: "$_id",

                penaltyStart:
                  "$penaltyStartDate",

                effectiveEnd:
                  "$effectiveEndDate"

              },

              pipeline: [

                {
                  $match: {

                    $expr: {

                      $eq: [
                        "$savingAccount",
                        "$$savingId"
                      ]

                    }

                  }

                },

                {
                  $project: {

                    paidDate: {
                      $ifNull: [
                        "$paymentForDate",
                        "$collectionDate"
                      ]
                    }

                  }

                },

                {
                  $match: {

                    $expr: {

                      $and: [

                        {
                          $ne: [
                            "$paidDate",
                            null
                          ]
                        },

                        {
                          $gte: [
                            "$paidDate",
                            "$$penaltyStart"
                          ]
                        },

                        {
                          $lt: [
                            "$paidDate",
                            "$$effectiveEnd"
                          ]
                        }

                      ]

                    }

                  }

                },

                {
                  $count: "paidCount"
                }

              ],

              as: "paidOverdue"
            }

          },

          {
            $set: {

              candidateDays: {

                $dateDiff: {

                  startDate:
                    "$penaltyStartDate",

                  endDate:
                    "$effectiveEndDate",

                  unit: "day",

                  timezone:
                    IST_TIMEZONE

                }

              },

              paidDays: {

                $ifNull: [

                  {
                    $arrayElemAt: [
                      "$paidOverdue.paidCount",
                      0
                    ]
                  },

                  0

                ]

              }

            }

          },

          {
            $set: {

              unpaidDays: {

                $max: [

                  0,

                  {
                    $subtract: [
                      "$candidateDays",
                      "$paidDays"
                    ]
                  }

                ]

              },

              penaltyPerDay: {

                $cond: [

                  {
                    $eq: [
                      "$penaltyType",
                      "FIXED"
                    ]
                  },

                  {
                    $ifNull: [
                      "$penaltyValue",
                      0
                    ]
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
                                  0
                                ]
                              },

                              {
                                $ifNull: [
                                  "$penaltyValue",
                                  0
                                ]
                              }

                            ]

                          },

                          100

                        ]

                      },

                      0

                    ]

                  }

                ]

              }

            }

          },

          {
            $group: {

              _id: null,

              total: {

                $sum: {

                  $multiply: [

                    "$unpaidDays",

                    "$penaltyPerDay"

                  ]

                }

              }

            }

          }

        ]);


      totalSavingPendingPenalty =
        Number(
          savingPenaltyRows[0]?.total || 0
        );

    }


    // =================================================
    // ACTIVE LOANS FOR TARGET + PENALTY
    // =================================================

    const activeLoanRows =
      await DailyLoan.find({

        status: {
          $in: [
            "ACTIVE",
            "DUE",
            "OVERDUE"
          ]
        }

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
          "status"
        ].join(" ")
      )
      .lean();


    // =================================================
    // TODAY'S LOAN TARGET
    // =================================================

    let loanTarget = 0;


    for (
      const loan
      of activeLoanRows
    ) {

      const baseDate =
        loan.loanDate ||
        loan.startDate;

      if (!baseDate) {
        continue;
      }

      const loanDateKey =
        getISTDateKey(
          baseDate
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
        totalInstallments <= 0 ||
        emi <= 0
      ) {
        continue;
      }


      for (
        let i = 1;
        i <= totalInstallments;
        i++
      ) {

        let dueKey;


        if (
          loan.loanType === "DAILY"
        ) {

          dueKey =
            addDaysToKey(
              loanDateKey,
              i - 1
            );

        }

        else {

          dueKey =
            addMonthsToKey(
              loanDateKey,
              i
            );

        }


        if (
          dueKey > todayKey
        ) {

          break;

        }


        if (
          dueKey === todayKey
        ) {

          loanTarget +=
            Number(emi);

          break;

        }

      }

    }


    // =================================================
    // LOAN PENDING PENALTY
    //
    // We calculate theoretical penalty using loan
    // schedules, then subtract penalty contribution
    // from already-paid installments.
    // =================================================

    let theoreticalLoanPenalty = 0;


    for (
      const loan
      of activeLoanRows
    ) {

      const baseDate =
        loan.loanDate ||
        loan.startDate;

      if (!baseDate) {
        continue;
      }


      const loanDateKey =
        getISTDateKey(
          baseDate
        );

      const totalInstallments =
        getLoanTotalInstallments(
          loan
        );

      if (
        totalInstallments <= 0
      ) {
        continue;
      }


      const grace =
        Number(
          loan.gracePeriod || 0
        );


      const loanType =
        loan.loanType;


      const penaltyValue =
        Number(
          loan.penaltyValue || 0
        );


      let penaltyBase =
        Number(
          loan.emiAmount || 0
        );


      if (
        loanType === "FIXED"
      ) {

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


      let penaltyPerEvent = 0;


      if (
        loanType === "DAILY"
      ) {

        penaltyPerEvent =
          loan.penaltyType === "PERCENTAGE"

            ? Math.round(
                (
                  penaltyBase *
                  penaltyValue
                ) / 100
              )

            : penaltyValue;

      }

      else if (
        loanType === "MONTHLY" ||
        loanType === "FIXED"
      ) {

        penaltyPerEvent =
          loan.penaltyType === "PERCENTAGE"

            ? Math.round(
                (
                  penaltyBase *
                  penaltyValue
                ) / 100
              )

            : penaltyValue;

      }


      if (
        penaltyPerEvent <= 0
      ) {
        continue;
      }


      for (
        let i = 1;
        i <= totalInstallments;
        i++
      ) {

        let dueKey;


        if (
          loanType === "DAILY"
        ) {

          dueKey =
            addDaysToKey(
              loanDateKey,
              i - 1
            );

        }

        else {

          dueKey =
            addMonthsToKey(
              loanDateKey,
              i
            );

        }


        if (
          dueKey > todayKey
        ) {

          break;

        }


        const penaltyStartKey =
          addDaysToKey(
            dueKey,
            grace + 1
          );


        if (
          penaltyStartKey > todayKey
        ) {

          continue;

        }


        // =========================================
        // DAILY
        // ONE PENALTY PER UNPAID DUE INSTALLMENT
        // =========================================

        if (
          loanType === "DAILY"
        ) {

          theoreticalLoanPenalty +=
            penaltyPerEvent;

          continue;

        }


        // =========================================
        // MONTHLY / FIXED
        // ONE PENALTY PER OVERDUE MONTH
        // =========================================

        const penaltyMonths =
          diffMonths(
            penaltyStartKey,
            todayKey
          ) + 1;


        if (
          penaltyMonths > 0
        ) {

          theoreticalLoanPenalty +=
            penaltyPerEvent *
            penaltyMonths;

        }

      }

    }


    // =================================================
    // PAID LOAN PENALTY CONTRIBUTION
    //
    // Database calculates only the contribution of
    // already-paid eligible installments.
    // =================================================

    let paidLoanPenaltyContribution = 0;


    if (
      activeLoanRows.length > 0
    ) {

      const activeLoanIds =
        activeLoanRows.map(
          loan => loan._id
        );


      const paidPenaltyRows =
        await LoanCollection.aggregate([

          {
            $match: {

              loan: {
                $in: activeLoanIds
              },

              dueDate: {
                $exists: true,
                $ne: null
              }

            }

          },

          {
            $lookup: {

              from: "dailyloans",

              localField: "loan",

              foreignField: "_id",

              as: "loanInfo"

            }

          },

          {
            $unwind:
              "$loanInfo"

          },

          {
            $set: {

              graceValue: {

                $ifNull: [
                  "$loanInfo.gracePeriod",
                  0
                ]

              },

              penaltyStartDate: {

                $dateAdd: {

                  startDate:
                    "$dueDate",

                  unit: "day",

                  amount: {

                    $add: [

                      {
                        $ifNull: [
                          "$loanInfo.gracePeriod",
                          0
                        ]
                      },

                      1

                    ]

                  },

                  timezone:
                    IST_TIMEZONE

                }

              }

            }

          },

          {
            $match: {

              $expr: {

                $lte: [

                  "$penaltyStartDate",

                  getDashboardDateData().todayStart

                ]

              }

            }

          },

          {
            $set: {

              penaltyMonths: {

                $add: [

                  {

                    $dateDiff: {

                      startDate:
                        "$penaltyStartDate",

                      endDate:
                        getDashboardDateData().todayStart,

                      unit: "month",

                      timezone:
                        IST_TIMEZONE

                    }

                  },

                  1

                ]

              }

            }

          },

          {
            $set: {

              contribution: {

                $cond: [

                  {
                    $eq: [
                      "$loanInfo.loanType",
                      "DAILY"
                    ]
                  },

                  1,

                  "$penaltyMonths"

                ]

              }

            }

          },

          {
            $group: {

              _id: null,

              totalContribution: {

                $sum:
                  "$contribution"

              }

            }

          }

        ]);


      // ===============================================
      // We still need the penalty amount for each loan
      // because penalty settings are loan-specific.
      //
      // Build a tiny map from the active loan metadata.
      // ===============================================

      const paidPenaltyContributionByLoan =
        await LoanCollection.aggregate([

          {
            $match: {

              loan: {
                $in: activeLoanIds
              },

              dueDate: {
                $exists: true,
                $ne: null
              }

            }

          },

          {
            $lookup: {

              from: "dailyloans",

              localField: "loan",

              foreignField: "_id",

              as: "loanInfo"

            }

          },

          {
            $unwind:
              "$loanInfo"

          },

          {
            $set: {

              penaltyStartDate: {

                $dateAdd: {

                  startDate:
                    "$dueDate",

                  unit: "day",

                  amount: {

                    $add: [

                      {
                        $ifNull: [
                          "$loanInfo.gracePeriod",
                          0
                        ]
                      },

                      1

                    ]

                  },

                  timezone:
                    IST_TIMEZONE

                }

              }

            }

          },

          {
            $match: {

              $expr: {

                $lte: [

                  "$penaltyStartDate",

                  getDashboardDateData().todayStart

                ]

              }

            }

          },

          {
            $set: {

              penaltyCount:

                {

                  $cond: [

                    {
                      $eq: [
                        "$loanInfo.loanType",
                        "DAILY"
                      ]
                    },

                    1,

                    {

                      $add: [

                        {

                          $dateDiff: {

                            startDate:
                              "$penaltyStartDate",

                            endDate:
                              getDashboardDateData().todayStart,

                            unit: "month",

                            timezone:
                              IST_TIMEZONE

                          }

                        },

                        1

                      ]

                    }

                  ]

                }

            }

          },

          {
            $group: {

              _id: "$loan",

              penaltyCount: {

                $sum:
                  "$penaltyCount"

              }

            }

          }

        ]);


      const paidContributionMap =
        new Map();


      for (
        const row
        of paidPenaltyContributionByLoan
      ) {

        paidContributionMap.set(
          String(row._id),
          Number(
            row.penaltyCount || 0
          )
        );

      }


      // ===============================================
      // SUBTRACT PAID PENALTY CONTRIBUTION
      // using each loan's own penalty amount
      // ===============================================

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


        let penaltyBase =
          Number(
            loan.emiAmount || 0
          );


        if (
          loan.loanType === "FIXED"
        ) {

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


        const singlePenalty =
          loan.penaltyType === "PERCENTAGE"

            ? Math.round(
                (
                  penaltyBase *
                  Number(
                    loan.penaltyValue || 0
                  )
                ) / 100
              )

            : Number(
                loan.penaltyValue || 0
              );


        paidLoanPenaltyContribution +=
          contribution *
          singlePenalty;

      }

    }


    const totalLoanPendingPenalty =
      Math.max(
        0,
        theoreticalLoanPenalty -
        paidLoanPenaltyContribution
      );


    // =================================================
    // TOTAL PENDING PENALTY
    // =================================================

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


    // =================================================
    // WAIT FOR THE SIMPLE AGGREGATIONS
    // =================================================

    const [
      dailyCollectionResult,
      loanCollectionResult,
      expenseResult,
      loanGivenResult,
      todayDailyAgentResult,
      todayLoanAgentResult,
      dailySavingTargetResult
    ] =
      await Promise.all([

        dailyCollectionPromise,

        loanCollectionPromise,

        totalExpensePromise,

        loanGivenPromise,

        todayDailyAgentCollectionPromise,

        todayLoanAgentCollectionPromise,

        dailySavingTargetPromise

      ]);


    // =================================================
    // EXISTING TOTAL VALUES
    // =================================================

    const totalDailyCollection =
      Number(
        dailyCollectionResult[0]?.total || 0
      );


    const totalLoanCollection =
      Number(
        loanCollectionResult[0]?.total || 0
      );


    const totalExpenses =
      Number(
        expenseResult[0]?.total || 0
      );


    const totalLoanGiven =
      Number(
        loanGivenResult[0]?.total || 0
      );


    // =================================================
    // CURRENT MONTH EXPENSE
    //
    // Uses expenseDate when available.
    // Falls back to createdAt for older records.
    // =================================================

    const currentMonthExpenseResult =
      await Expense.aggregate([

        {
          $match: {

            $expr: {

              $and: [

                {
                  $gte: [

                    {
                      $ifNull: [
                        "$expenseDate",
                        "$createdAt"
                      ]
                    },

                    monthStart

                  ]
                },

                {
                  $lt: [

                    {
                      $ifNull: [
                        "$expenseDate",
                        "$createdAt"
                      ]
                    },

                    nextMonthStart

                  ]
                }

              ]

            }

          }

        },

        {
          $group: {

            _id: null,

            total: {

              $sum: {

                $ifNull: [
                  "$amount",
                  0
                ]

              }

            }

          }

        }

      ]);


    const thisMonthExpense =
      Number(
        currentMonthExpenseResult[0]?.total || 0
      );


    // =================================================
    // TODAY ACTUAL AGENT COLLECTION
    // =================================================

    const todayDailyAgentCollection =
      Number(
        todayDailyAgentResult[0]?.total || 0
      );


    const todayLoanAgentCollection =
      Number(
        todayLoanAgentResult[0]?.total || 0
      );


    const todayActualAgentCollection =
      todayDailyAgentCollection +
      todayLoanAgentCollection;


    // =================================================
    // TARGETS
    // =================================================

    const dailySavingTarget =
      Number(
        dailySavingTargetResult[0]?.total || 0
      );


    const totalTarget =
      dailySavingTarget +
      loanTarget;


    // =================================================
    // FINANCIAL CALCULATION
    // KEEP EXISTING RESULT
    // =================================================

    const totalIncome =
      totalDailyCollection +
      totalLoanCollection;


    const netProfit =
      totalIncome -
      totalExpenses -
      totalLoanGiven;


    // =================================================
    // RECENT COLLECTIONS
    // ONLY 10
    // =================================================

    const recentCollections =
      await DailyTransaction.find()

        .sort({
          createdAt: -1
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

    const topAgents =
      await DailyTransaction.aggregate([

        {
          $match: {

            collectorType:
              "AGENT"

          }

        },

        {
          $group: {

            _id:
              "$collectorId",

            totalCollection: {

              $sum: {

                $ifNull: [

                  "$totalAmount",

                  0

                ]

              }

            }

          }

        },

        {
          $sort: {

            totalCollection:
              -1

          }

        },

        {
          $limit: 5

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
              "agent"

          }

        },

        {
          $project: {

            _id: 1,

            totalCollection: 1,

            agent: {

              _id: 1,

              name: 1

            }

          }

        }

      ]);


    // =================================================
    // FINAL RESPONSE
    // =================================================

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
      // NEW DASHBOARD VALUES
      // -----------------------------------------------

      dailySavingTarget,

      loanTarget,

      totalTarget,

      todayActualAgentCollection,

      totalPendingPenalty,

      thisMonthExpense,


      // -----------------------------------------------
      // OPTIONAL DEBUG/REPORT VALUES
      // -----------------------------------------------

      todayKey,

      currentMonth:
        monthKey

    });

  }


  catch (error) {

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
        "Dashboard loading failed"

    });

  }

};