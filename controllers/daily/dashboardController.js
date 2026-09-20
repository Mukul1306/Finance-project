const Agent = require("../../models/daily/Agent");
const DailyMember = require("../../models/daily/DailyMember");
const DailyTransaction = require("../../models/daily/DailyTransaction");
const DailyLoan = require("../../models/daily/DailyLoan");
const LoanCollection = require("../../models/daily/LoanCollection");
const Expense = require("../../models/daily/Expense");

exports.getDashboard = async (req, res) => {
  try {
    // ==========================================
    // BASIC COUNTS
    // ==========================================

    const [
      totalAgents,
      totalMembers,
      activeLoans
    ] = await Promise.all([
      Agent.countDocuments(),
      DailyMember.countDocuments(),
      DailyLoan.countDocuments({
        status: "ACTIVE"
      })
    ]);

    // ==========================================
    // DAILY SAVING COLLECTION
    // ==========================================

    const dailyCollectionResult =
      await DailyTransaction.aggregate([
        {
          $group: {
            _id: null,
            total: {
              $sum: {
                $ifNull: ["$totalAmount", 0]
              }
            }
          }
        }
      ]);

    // ==========================================
    // LOAN COLLECTION
    // ==========================================

    const loanCollectionResult =
      await LoanCollection.aggregate([
        {
          $group: {
            _id: null,
            total: {
              $sum: {
                $ifNull: ["$totalAmount", 0]
              }
            }
          }
        }
      ]);

    // ==========================================
    // EXPENSES
    // ==========================================

    const expenseResult =
      await Expense.aggregate([
        {
          $group: {
            _id: null,
            total: {
              $sum: {
                $ifNull: ["$amount", 0]
              }
            }
          }
        }
      ]);

    // ==========================================
    // LOAN GIVEN
    // ==========================================

    const loanGivenResult =
      await DailyLoan.aggregate([
        {
          $group: {
            _id: null,
            total: {
              $sum: {
                $ifNull: ["$loanAmount", 0]
              }
            }
          }
        }
      ]);

    const totalDailyCollection =
      Number(dailyCollectionResult[0]?.total || 0);

    const totalLoanCollection =
      Number(loanCollectionResult[0]?.total || 0);

    const totalExpenses =
      Number(expenseResult[0]?.total || 0);

    const totalLoanGiven =
      Number(loanGivenResult[0]?.total || 0);

    // ==========================================
    // FINANCIAL CALCULATION
    // ==========================================

    const totalIncome =
      totalDailyCollection +
      totalLoanCollection;

    const netProfit =
      totalIncome -
      totalExpenses -
      totalLoanGiven;

    // ==========================================
    // RECENT COLLECTIONS
    // ONLY 10 RECORDS
    // ==========================================

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

    // ==========================================
    // TOP AGENTS
    // DATABASE DOES THE GROUPING
    // ==========================================

    const topAgents =
      await DailyTransaction.aggregate([
        {
          $match: {
            collectorType: "AGENT"
          }
        },

        {
          $group: {
            _id: "$collectorId",

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

    // ==========================================
    // RESPONSE
    // ==========================================

    res.json({
      success: true,

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

      topAgents
    });

  } catch (error) {

    console.error(
      "DASHBOARD ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        error.message ||
        "Dashboard loading failed"
    });
  }
};