const Expense =
require("../../models/daily/Expense");

const DailyLoan =
require("../../models/daily/DailyLoan");

const DailyTransaction =
require("../../models/daily/DailyTransaction");

const BusinessFund =
require("../../models/daily/BusinessFund");
const LoanCollection =
require("../../models/daily/LoanCollection");

exports.getProfitLoss =
async (req, res) => {

  try {

    const dailyIncome =
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

    const loanIncome =
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

    const expenseData =
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
      dailyIncome[0]?.total || 0;

    const totalLoanCollection =
      loanIncome[0]?.total || 0;

    const totalExpenses =
      expenseData[0]?.total || 0;

    const totalLoanGiven =
      loanGiven[0]?.total || 0;

   const totalBusinessFund = await BusinessFund.aggregate([
{
$group:{
_id:null,
total:{
$sum:"$amount"
}
}
}
]);

const businessFund =
  totalBusinessFund[0]?.total || 0;
  
// Remaining Business Fund
const remainingBusinessFund = Math.max(
  0,
  businessFund - totalExpenses
);

const totalIncome =
totalDailyCollection +
totalLoanCollection +
businessFund;

    const totalOutflow =
      totalExpenses +
      totalLoanGiven;

    const netProfit =
totalIncome -
totalExpenses -
totalLoanGiven;

res.json({
  success: true,

  totalDailyCollection,
  totalLoanCollection,
  businessFund,

  remainingBusinessFund,
  totalIncome,

  totalExpenses,
  totalLoanGiven,

  totalOutflow,

  netProfit
});

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }

};