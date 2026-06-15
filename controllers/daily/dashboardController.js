const Agent = require("../../models/daily/Agent");
const DailyMember = require("../../models/daily/DailyMember");
const DailyTransaction = require("../../models/daily/DailyTransaction");
const DailyLoan = require("../../models/daily/DailyLoan");
const LoanCollection = require("../../models/daily/LoanCollection");
const Expense = require("../../models/daily/Expense");

exports.getDashboard = async (req, res) => {
  try {

    const totalAgents =
      await Agent.countDocuments();

    const totalMembers =
      await DailyMember.countDocuments();

    const activeLoans =
      await DailyLoan.countDocuments({
        status: "ACTIVE"
      });

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
      dailyCollection[0]?.total || 0;

    const totalLoanCollection =
      loanCollection[0]?.total || 0;

    const totalExpenses =
      expenses[0]?.total || 0;

    const totalLoanGiven =
      loanGiven[0]?.total || 0;

    const totalIncome =
      totalDailyCollection +
      totalLoanCollection;

    const netProfit =
      totalIncome -
      totalExpenses -
      totalLoanGiven;

    const recentCollections =
      await DailyTransaction.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("member");

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

    res.json({
  success: true,

  totalAgents,
  totalMembers,
  activeLoans,

  totalDailyCollection,
  totalAgentCollection: totalDailyCollection,

  totalLoanCollection,

  totalExpenses,
  totalLoanGiven,

  totalIncome,
  netProfit,

  recentCollections,
  topAgents
});

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }
};