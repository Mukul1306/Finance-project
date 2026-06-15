const Payment =
require("../models/Payment");

const Member =
require("../models/Members");

exports.collectPayment =
async(req,res)=>{

try{

const {

memberId,
paymentMode,
transactionId,
remarks

}=req.body;

const member =
await Member.findById(
memberId
);

if(!member){

return res.status(404).json({

success:false,
message:"Member Not Found"

});

}

const installmentAmount =
member.monthlyInstallment;

const penaltyAmount =
member.pendingInstallments *
member.monthlyPenalty;

const totalReceived =
installmentAmount +
penaltyAmount;

const payment =
await Payment.create({

memberId,

societyId:
member.societyId,

installmentNo:
member.paidInstallments + 1,

installmentAmount,

penaltyAmount,

totalReceived,

paymentMode,

transactionId,

remarks

});

member.paidInstallments += 1;

member.pendingInstallments -= 1;
if(member.pendingInstallments < 0){
  member.pendingInstallments = 0;
}
member.currentPenalty =
member.pendingInstallments *
member.monthlyPenalty;

member.totalPaid +=
installmentAmount;

member.pendingAmount -=
installmentAmount;

member.totalPenaltyPaid +=
penaltyAmount;



member.lastPaymentDate =
new Date();

if(
member.pendingInstallments <= 0
){

member.status =
"COMPLETED";

}

await member.save();

res.status(200).json({

success:true,
message:"Payment Collected",

payment

});

}
catch(error){

res.status(500).json({

success:false,
message:error.message

});

}

};