const Payment =
require("../models/Payment");

const InterestCollection =
require("../models/InterestCollection");

const Expense =
require("../models/Expense");

exports.getProfitLoss =
async(req,res)=>{

try{

const payments =
await Payment.aggregate([
{
 $group:{
  _id:null,
  total:{
   $sum:"$totalReceived"
  }
 }
}
]);

const interest =
await InterestCollection.aggregate([
{
 $group:{
  _id:null,
  total:{
   $sum:"$amountPaid"
  }
 }
}
]);

const expenses =
await Expense.aggregate([
{
 $group:{
  _id:null,
  total:{
   $sum:"$amount"
  }
 }
}
]);

const totalPayment =
payments[0]?.total || 0;

const totalInterest =
interest[0]?.total || 0;

const totalExpense =
expenses[0]?.total || 0;

const totalIncome =
totalPayment +
totalInterest;

const netProfit =
totalIncome -
totalExpense;

res.json({
success:true,

totalPayment,

totalInterest,

totalIncome,

totalExpense,

netProfit

});

}catch(error){

res.status(500).json({
success:false,
message:error.message
});

}

};