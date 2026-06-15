const Loan = require("../models/Loan");
const Member = require("../models/Members");

const InterestCollection = require("../models/InterestCollection");

exports.getInterestHistory =
async(req,res)=>{

try{

 const { loanId } =
 req.params;

 const collections =
 await InterestCollection.find({
  loanId
 })
 .sort({
  year:1,
  month:1
 });

 res.status(200).json({

  success:true,

  collections

 });

}catch(error){

 console.log(error);

 res.status(500).json({
  success:false,
  message:error.message
 });

}

};
/*
GET PENDING INTEREST
*/

exports.getPendingInterest =
async(req,res)=>{

try{

 const { loanId } =
 req.params;

 const loan =
 await Loan.findById(loanId);

 if(!loan){
  return res.status(404).json({
   success:false,
   message:"Loan not found"
  });
 }

 const collections =
 await InterestCollection.find({
  loanId
 });

 const today =
 new Date();

 const loanDate =
 new Date(
  loan.loanGivenDate
 );

 const monthsPassed =

 ((today.getFullYear()
 -
 loanDate.getFullYear())
 *12)

 +

 (today.getMonth()
 -
 loanDate.getMonth())

 +1;

 const expectedInterest =

 monthsPassed *
 loan.monthlyInterest;

 const collectedInterest =

 collections.reduce(
 (sum,item)=>
 sum + item.amountPaid,
 0
 );

 const pendingInterest =

 expectedInterest -
 collectedInterest;

 res.status(200).json({

  success:true,

  principalAmount:
  loan.principalAmount,

  monthlyInterest:
  loan.monthlyInterest,

  expectedInterest,

  collectedInterest,

  pendingInterest

 });

}catch(error){

 console.log(error);

 res.status(500).json({
  success:false,
  message:error.message
 });

}

};



exports.collectInterest = async (req, res) => {
try {
const {
loanId,
amountPaid,
month,
year,
remarks
} = req.body;

const loan = await Loan.findById(loanId);

if (!loan) {
  return res.status(404).json({
    success: false,
    message: "Loan not found"
  });
}

if (loan.status === "CLOSED") {
  return res.status(400).json({
    success: false,
    message: "Loan already closed"
  });
}

const collection =
  await InterestCollection.create({
    loanId,
    memberId: loan.memberId,
    amountPaid,
    month,
    year,
    remarks
  });

res.status(201).json({
  success: true,
  message: "Interest collected successfully",
  collection
});


} catch (error) {


console.log(error);

res.status(500).json({
  success: false,
  message: error.message
});

}
};
