const Agent = require("../../models/daily/Agent");
const DailyMember = require("../../models/daily/DailyMember");
const DailySaving = require("../../models/daily/DailySaving");
const DailyTransaction = require("../../models/daily/DailyTransaction");
const DailyLoan = require("../../models/daily/DailyLoan");
const LoanCollection = require("../../models/daily/LoanCollection");
const Expense = require("../../models/daily/Expense");


// =====================================================
// IST DATE HELPER
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
// MONTHLY / FIXED LOAN PENALTY
// =====================================================

function calculateMonthlyFixedPenalty({
  dueDate,
  today,
  gracePeriod,
  penaltyType,
  penaltyValue,
  penaltyBase
}) {

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const current = new Date(today);
  current.setHours(0, 0, 0, 0);

  const grace =
    Number(gracePeriod || 0);

  const penaltyStartDate =
    new Date(due);

  penaltyStartDate.setDate(
    penaltyStartDate.getDate() +
    grace +
    1
  );

  penaltyStartDate.setHours(
    0,
    0,
    0,
    0
  );

  if (
    current <
    penaltyStartDate
  ) {
    return 0;
  }

  const monthlyPenalty =
    penaltyType === "PERCENTAGE"
      ? Math.round(
          (
            Number(penaltyBase) *
            Number(penaltyValue)
          ) / 100
        )
      : Number(penaltyValue || 0);

  const penaltyMonths =
    (
      (
        current.getFullYear() -
        penaltyStartDate.getFullYear()
      ) * 12
    ) +
    (
      current.getMonth() -
      penaltyStartDate.getMonth()
    ) +
    1;

  return (
    monthlyPenalty *
    penaltyMonths
  );
}


// =====================================================
// CHECK WHETHER LOAN EMI IS DUE TODAY
// =====================================================

function isLoanDueToday(
  loan,
  today
) {

  if (!loan.loanDate) {
    return false;
  }

  const loanDate =
    new Date(
      loan.loanDate
    );

  loanDate.setHours(
    0,
    0,
    0,
    0
  );

  if (
    loanDate >
    today
  ) {
    return false;
  }


  // ==========================================
  // DAILY
  // ==========================================

  if (
    loan.loanType ===
    "DAILY"
  ) {

    const daysPassed =
      Math.floor(
        (
          today -
          loanDate
        ) /
        (
          1000 *
          60 *
          60 *
          24
        )
      );

    const installmentNo =
      daysPassed + 1;

    return (
      installmentNo >= 1 &&
      installmentNo <=
        Number(
          loan.durationDays || 0
        )
    );

  }


  // ==========================================
  // WEEKLY
  // ==========================================

  if (
    loan.loanType ===
    "WEEKLY"
  ) {

    const daysPassed =
      Math.floor(
        (
          today -
          loanDate
        ) /
        (
          1000 *
          60 *
          60 *
          24
        )
      );

    if (
      daysPassed < 0 ||
      daysPassed % 7 !== 0
    ) {
      return false;
    }

    const installmentNo =
      Math.floor(
        daysPassed / 7
      ) + 1;

    return (
      installmentNo >= 1 &&
      installmentNo <=
        Number(
          loan.durationWeeks || 0
        )
    );

  }


  // ==========================================
  // MONTHLY
  // FIXED
  // ==========================================

  if (
    loan.loanType === "MONTHLY" ||
    loan.loanType === "FIXED"
  ) {

    if (
      today.getDate() !==
      loanDate.getDate()
    ) {
      return false;
    }

    const monthDiff =
      (
        (
          today.getFullYear() -
          loanDate.getFullYear()
        ) * 12
      ) +
      (
        today.getMonth() -
        loanDate.getMonth()
      );

    const totalMonths =
      loan.loanType ===
      "MONTHLY"
        ? Number(
            loan.durationMonths || 0
          )
        : Number(
            loan.loanTenureMonths || 0
          );

    return (
      monthDiff >= 1 &&
      monthDiff <=
        totalMonths
    );

  }

  return false;
}


// =====================================================
// GET DASHBOARD
// =====================================================

exports.getDashboard = async (
  req,
  res
) => {

  try {

    // =================================================
    // TODAY
    // =================================================

    const todayKey =
      getISTDateKey(
        new Date()
      );

    const today =
      new Date(
        `${todayKey}T00:00:00+05:30`
      );


    // =================================================
    // CURRENT MONTH
    // =================================================

    const [
      currentYear,
      currentMonth
    ] =
      todayKey
        .split("-")
        .map(Number);

    const firstDayOfMonth =
      `${currentYear}-${String(
        currentMonth
      ).padStart(2, "0")}-01`;

    const nextMonthDate =
      new Date(
        Date.UTC(
          currentYear,
          currentMonth,
          1
        )
      );

    const nextMonthKey =
      nextMonthDate
        .toISOString()
        .slice(0, 10);


    // =================================================
    // BASIC COUNTS
    // =================================================

    const totalAgents =
      await Agent.countDocuments();

    const totalMembers =
      await DailyMember.countDocuments();

    const activeLoans =
      await DailyLoan.countDocuments({
        status: "ACTIVE"
      });


    // =================================================
    // TOTAL DAILY COLLECTION
    // =================================================

    const dailyCollection =
      await DailyTransaction.aggregate([
        {
          $group: {
            _id: null,
            total: {
              $sum: "$totalAmount"
            }
          }
        }
      ]);


    // =================================================
    // TOTAL LOAN COLLECTION
    // =================================================

    const loanCollection =
      await LoanCollection.aggregate([
        {
          $group: {
            _id: null,
            total: {
              $sum: "$totalAmount"
            }
          }
        }
      ]);


    // =================================================
    // TOTAL EXPENSE
    // =================================================

    const expenses =
      await Expense.aggregate([
        {
          $group: {
            _id: null,
            total: {
              $sum: "$amount"
            }
          }
        }
      ]);


    // =================================================
    // TOTAL LOAN GIVEN
    // =================================================

    const loanGiven =
      await DailyLoan.aggregate([
        {
          $group: {
            _id: null,
            total: {
              $sum: "$loanAmount"
            }
          }
        }
      ]);


    const totalDailyCollection =
      Number(
        dailyCollection[0]?.total || 0
      );

    const totalLoanCollection =
      Number(
        loanCollection[0]?.total || 0
      );

    const totalExpenses =
      Number(
        expenses[0]?.total || 0
      );

    const totalLoanGiven =
      Number(
        loanGiven[0]?.total || 0
      );


    // =================================================
    // TOTAL INCOME
    // =================================================

    const totalIncome =
      totalDailyCollection +
      totalLoanCollection;


    const netProfit =
      totalIncome -
      totalExpenses -
      totalLoanGiven;


    // =================================================
    // LOAD AGENTS
    // =================================================

    const agents =
      await Agent.find();


    // =================================================
    // LOAD DAILY SAVINGS
    // =================================================

    const savings =
      await DailySaving.find({
        status: "ACTIVE"
      });


    // =================================================
    // LOAD LOANS
    // =================================================

    const loans =
      await DailyLoan.find({
        status: {
          $in: [
            "ACTIVE",
            "DUE",
            "OVERDUE"
          ]
        }
      });


    // =================================================
    // TARGET CALCULATION
    // =================================================

    let dailySavingTarget = 0;

    let loanTarget = 0;


    // =================================================
    // DAILY SAVING TARGET
    // =================================================

    savings.forEach(
      saving => {

        if (
          saving.collectionType ===
          "FIXED"
        ) {

          dailySavingTarget +=
            Number(
              saving.fixedAmount || 0
            );

        }

      }
    );


    // =================================================
    // LOAN TARGET
    // =================================================

    loans.forEach(
      loan => {

        if (
          isLoanDueToday(
            loan,
            today
          )
        ) {

          loanTarget +=
            Number(
              loan.emiAmount || 0
            );

        }

      }
    );


    // =================================================
    // TOTAL TARGET
    // =================================================

    const totalTarget =
      dailySavingTarget +
      loanTarget;


    // =================================================
    // TODAY ACTUAL COLLECTION
    //
    // ONLY MONEY PHYSICALLY COLLECTED TODAY
    // =================================================

    const dailyTransactions =
      await DailyTransaction.find({
        collectorType: "AGENT"
      });

    const loanTransactions =
      await LoanCollection.find({
        collectorType: "AGENT"
      });


    let todayActualAgentCollection = 0;


    // DAILY SAVING ACTUAL

    dailyTransactions.forEach(
      transaction => {

        if (
          !transaction.collectionDate
        ) {
          return;
        }

        const collectionDateKey =
          getISTDateKey(
            transaction.collectionDate
          );

        if (
          collectionDateKey !==
          todayKey
        ) {
          return;
        }

        todayActualAgentCollection +=
          Number(
            transaction.totalAmount || 0
          );

      }
    );


    // LOAN ACTUAL

    loanTransactions.forEach(
      transaction => {

        if (
          !transaction.paymentDate
        ) {
          return;
        }

        const paymentDateKey =
          getISTDateKey(
            transaction.paymentDate
          );

        if (
          paymentDateKey !==
          todayKey
        ) {
          return;
        }

        todayActualAgentCollection +=
          Number(
            transaction.totalAmount || 0
          );

      }
    );


    // =================================================
    // PENDING PENALTY
    // =================================================

    let dailyPendingPenalty = 0;
    let loanPendingPenalty = 0;


    // =================================================
    // DAILY SAVING PENALTY
    // =================================================

    for (
      const saving of savings
    ) {

      if (
        !saving.member
      ) {
        continue;
      }

      const transactions =
        dailyTransactions.filter(
          transaction =>
            transaction.savingAccount &&
            String(
              transaction.savingAccount
            ) ===
            String(
              saving._id
            )
        );


      const paidDates =
        new Set(
          transactions.map(
            transaction => {

              const date =
                new Date(
                  transaction.collectionDate
                );

              date.setHours(
                0,
                0,
                0,
                0
              );

              return date.getTime();

            }
          )
        );


      if (
        !saving.startDate
      ) {
        continue;
      }


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
        saving.endDate
          ? new Date(
              saving.endDate
            )
          : today;

      endDate.setHours(
        0,
        0,
        0,
        0
      );


      let current =
        new Date(
          startDate
        );


      while (
        current <= today &&
        current <= endDate
      ) {

        const currentTime =
          current.getTime();


        if (
          !paidDates.has(
            currentTime
          )
        ) {

          const diffDays =
            Math.floor(
              (
                today -
                current
              ) /
              (
                1000 *
                60 *
                60 *
                24
              )
            );


          if (
            diffDays >
            Number(
              saving.graceDays || 0
            )
          ) {

            let penalty = 0;


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


            dailyPendingPenalty +=
              penalty;

          }

        }


        current.setDate(
          current.getDate() + 1
        );

      }

    }


    // =================================================
    // LOAN PENALTY
    // =================================================

    const loanCollections =
      loanTransactions;


    for (
      const loan of loans
    ) {

      if (
        !loan.member
      ) {
        continue;
      }


      const collections =
        loanCollections.filter(
          transaction =>
            transaction.loan &&
            String(
              transaction.loan
            ) ===
            String(
              loan._id
            )
        );


      const paidInstallments =
        new Set(
          collections.map(
            transaction =>
              Number(
                transaction.installmentNo
              )
          )
        );


      let totalInstallments = 1;


      if (
        loan.loanType ===
        "DAILY"
      ) {

        totalInstallments =
          Number(
            loan.durationDays || 0
          );

      }

      else if (
        loan.loanType ===
        "WEEKLY"
      ) {

        totalInstallments =
          Number(
            loan.durationWeeks || 0
          );

      }

      else if (
        loan.loanType ===
        "MONTHLY"
      ) {

        totalInstallments =
          Number(
            loan.durationMonths || 0
          );

      }

      else if (
        loan.loanType ===
        "FIXED"
      ) {

        totalInstallments =
          Number(
            loan.loanTenureMonths || 0
          );

      }


      for (
        let installmentNo = 1;
        installmentNo <= totalInstallments;
        installmentNo++
      ) {

        if (
          paidInstallments.has(
            installmentNo
          )
        ) {
          continue;
        }


        const dueDate =
          new Date(
            loan.loanDate
          );


        if (
          loan.loanType ===
          "DAILY"
        ) {

          dueDate.setDate(
            dueDate.getDate() +
            installmentNo -
            1
          );

        }

        else if (
          loan.loanType ===
          "WEEKLY"
        ) {

          dueDate.setDate(
            dueDate.getDate() +
            (
              (installmentNo - 1) *
              7
            )
          );

        }

        else {

          dueDate.setMonth(
            dueDate.getMonth() +
            installmentNo
          );

        }


        dueDate.setHours(
          0,
          0,
          0,
          0
        );


        if (
          dueDate >
          today
        ) {
          continue;
        }


        const delay =
          Math.floor(
            (
              today -
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
          delay <=
          Number(
            loan.gracePeriod || 0
          )
        ) {
          continue;
        }


        let penalty = 0;


        // DAILY / WEEKLY

        if (
          loan.loanType ===
          "DAILY" ||
          loan.loanType ===
          "WEEKLY"
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


        // MONTHLY / FIXED

        else {

          let penaltyBase =
            Number(
              loan.emiAmount || 0
            );


          if (
            loan.loanType ===
            "FIXED"
          ) {

            penaltyBase =
              Math.round(
                Number(
                  loan.totalInterest || 0
                ) /
                Math.max(
                  Number(
                    loan.loanTenureMonths ||
                    1
                  ),
                  1
                )
              );

          }


          penalty =
            calculateMonthlyFixedPenalty({
              dueDate,
              today,
              gracePeriod:
                loan.gracePeriod,
              penaltyType:
                loan.penaltyType,
              penaltyValue:
                loan.penaltyValue,
              penaltyBase
            });

        }


        loanPendingPenalty +=
          penalty;

      }

    }


    // =================================================
    // TOTAL PENDING PENALTY
    // =================================================

    const totalPendingPenalty =
      dailyPendingPenalty +
      loanPendingPenalty;


    // =================================================
    // THIS MONTH EXPENSE
    // =================================================

    const allExpenses =
      await Expense.find();


    let thisMonthExpense = 0;


    allExpenses.forEach(
      expense => {

        if (
          !expense.expenseDate
        ) {
          return;
        }

        const expenseDateKey =
          getISTDateKey(
            expense.expenseDate
          );


        if (
          expenseDateKey >=
            firstDayOfMonth &&
          expenseDateKey <
            nextMonthKey
        ) {

          thisMonthExpense +=
            Number(
              expense.amount || 0
            );

        }

      }
    );


    // =================================================
    // RECENT COLLECTIONS
    // =================================================

    const recentCollections =
      await DailyTransaction.find()
        .sort({
          createdAt: -1
        })
        .limit(10)
        .populate("member");


    // =================================================
    // TOP AGENTS
    // =================================================

    const topAgents =
      await DailyTransaction.aggregate([
        {
          $group: {
            _id: "$collectorId",
            totalCollection: {
              $sum: "$totalAmount"
            }
          }
        },
        {
          $sort: {
            totalCollection: -1
          }
        },
        {
          $limit: 5
        },
        {
          $lookup: {
            from: "dailyagents",
            localField: "_id",
            foreignField: "_id",
            as: "agent"
          }
        }
      ]);


    // =================================================
    // RESPONSE
    // =================================================

    res.json({

      success: true,

      // ----------------------------
      // BASIC
      // ----------------------------

      totalAgents,
      totalMembers,
      activeLoans,


      // ----------------------------
      // COLLECTIONS
      // ----------------------------

      totalDailyCollection,

      totalAgentCollection:
        totalDailyCollection,

      totalLoanCollection,


      // ----------------------------
      // FINANCE
      // ----------------------------

      totalExpenses,
      totalLoanGiven,

      totalIncome,
      netProfit,


      // ----------------------------
      // NEW DASHBOARD CARDS
      // ----------------------------

      dailySavingTarget,

      loanTarget,

      totalTarget,

      totalPendingPenalty,

      dailyPendingPenalty,

      loanPendingPenalty,

      todayActualAgentCollection,

      thisMonthExpense,


      // ----------------------------
      // TABLES
      // ----------------------------

      recentCollections,

      topAgents

    });

  }

  catch (error) {

    console.error(
      "DASHBOARD ERROR:",
      error
    );

    res.status(500).json({

      success: false,

      message:
        error.message

    });

  }

};