const Payment = require("../models/Payment");
const InterestCollection = require("../models/InterestCollection");
const Expense = require("../models/Expense");
const LoanPayment = require("../models/LoanPayment");

exports.getProfitLoss = async (req, res) => {

  try {

    // ==========================
    // PAYMENT COLLECTION
    // ==========================

    const payments = await Payment.aggregate([
      {
        $group: {
          _id: null,
          total: {
            $sum: "$totalReceived"
          }
        }
      }
    ]);




    // ==========================
    // INTEREST COLLECTION
    // ==========================

   const interest = await LoanPayment.aggregate([
  {
    $group: {
      _id: null,
      interest: {
        $sum: "$interestAmount"
      },
      penalty: {
        $sum: "$penaltyAmount"
      },
      totalReceived: {
        $sum: "$totalReceived"
      }
    }
  }
]);
    // ==========================
    // MANUAL INCOME
    // ==========================

    const manualIncome = await Expense.aggregate([
      {
        $match: {
          type: "INCOME"
        }
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: "$amount"
          }
        }
      }
    ]);

    // ==========================
    // EXPENSE
    // ==========================

    const expenses = await Expense.aggregate([
      {
        $match: {
          type: "EXPENSE"
        }
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: "$amount"
          }
        }
      }
    ]);

    const totalPayment = payments[0]?.total || 0;

  const totalInterest = interest[0]?.interest || 0;

const totalPenalty = interest[0]?.penalty || 0;

const totalLoanCollection = interest[0]?.totalReceived || 0;

    const totalManualIncome = manualIncome[0]?.total || 0;

    const totalExpense = expenses[0]?.total || 0;

  // Society Income
const societyIncome =
  totalPayment +
  totalInterest +
  totalPenalty;

// Remaining Manual Income
const remainingManualIncome = Math.max(
  0,
  totalManualIncome - totalExpense
);

// Expense that exceeds manual income
const extraExpense = Math.max(
  0,
  totalExpense - totalManualIncome
);

// Total Income after using manual income
const totalIncome =
  societyIncome +
  remainingManualIncome;

// Final Profit
const netProfit =
  totalIncome -
  extraExpense;

res.json({

  success: true,

  totalPayment,

  totalInterest,

  totalPenalty,

  totalLoanCollection,

  totalManualIncome,

  remainingManualIncome,

  totalExpense,

  totalIncome,

  netProfit

});

  }

  catch (error) {

    res.status(500).json({

      success: false,

      message: error.message

    });

  }

};