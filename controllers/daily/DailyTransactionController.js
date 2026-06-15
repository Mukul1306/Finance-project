const DailyTransaction =
require("../../models/daily/DailyTransaction");

const DailyMember =
require("../../models/daily/DailyMember");

exports.collectPayment =
async(req,res)=>{

try{

const {

memberId,
agentId,
amount,
paymentMethod

} = req.body;

const member =
await DailyMember.findById(
memberId
);

if(!member){

return res.status(404).json({

success:false,
message:"Member Not Found"

});

}

await DailyTransaction.create({

member:memberId,
agent:agentId,
area:member.areaGroup,
amount,
paymentMethod

});

member.totalPaid += Number(amount);

member.totalDaysPaid =
(member.totalDaysPaid || 0) + 1;

await member.save();

res.status(200).json({

success:true,
message:"Payment Collected"

});

}catch(error){

res.status(500).json({

success:false,
message:error.message

});

}

};