

exports.getAgentMembers =
async (req,res)=>{

  try{

    const members =
    await DailyMember
    .find({
      assignedAgent:
      req.params.agentId
    })
    .populate(
      "areaGroup",
      "areaName"
    );

    res.status(200).json({
      success:true,
      members
    });

  }catch(error){

    res.status(500).json({
      success:false,
      message:error.message
    });

  }

};









const DailyMember =
require("../../models/daily/DailyMember");

const DailyTransaction =
require("../../models/daily/DailyTransaction");

const PenaltySetting =
require("../../models/daily/PenaltySetting");

exports.collectPayment =
async(req,res)=>{

try{

const {

memberId,
collectorType,
collectorId,
paymentMethod,

amount

}=req.body;

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

let dailyAmount = 0;

if(member.isFlexibleAmount){

dailyAmount =
Number(amount);

}else{

dailyAmount =
member.fixedDailyAmount;

}

let penalty = 0;

const setting =
await PenaltySetting.findOne();

if(
member.lastCollectionDate &&
setting &&
setting.autoPenalty
){

const today =
new Date();

const last =
new Date(
member.lastCollectionDate
);

today.setHours(
0,0,0,0
);

last.setHours(
0,0,0,0
);

const diffDays =
Math.floor(

(today-last)
/(1000*60*60*24)

);

if(
diffDays >
setting.graceDays
){

const chargeableDays =
diffDays -
setting.graceDays;

penalty =
chargeableDays *
setting.fineAmount;

if(
penalty >
setting.maxPenalty
){

penalty =
setting.maxPenalty;

}

}

}


const today = new Date();

today.setHours(0,0,0,0);

const tomorrow = new Date(today);

tomorrow.setDate(
  tomorrow.getDate() + 1
);

const existingPayment =
await DailyTransaction.findOne({

  member: member._id,

  collectionDate: {
    $gte: today,
    $lt: tomorrow
  }

});

if(existingPayment){

  return res.status(400).json({

    success:false,

    message:
    "Today's payment already collected for this member"

  });

}

const totalAmount =
dailyAmount + penalty;

await DailyTransaction.create({
  member: member._id,
  area: member.areaGroup,

  collectorType,

  collectorId:
    collectorType === "ADMIN"
      ? null
      : collectorId,

  dailyAmount,
  penalty,
  totalAmount,
  paymentMethod
});

member.totalPaid +=
dailyAmount;

member.totalPenalty +=
penalty;

member.totalDaysPaid += 1;

member.lastCollectionDate =
new Date();

await member.save();

res.status(201).json({

success:true,

message:"Payment Collected",

dailyAmount,

penalty,

totalAmount

});

}catch(error){

res.status(500).json({

success:false,
message:error.message

});

}

};

exports.getAllCollections =
async(req,res)=>{

try{

const transactions =
await DailyTransaction
.find()
.populate(
"member",
"memberName mobile"
)
.populate(
"area",
"areaName"
)
.sort({
createdAt:-1
});

res.status(200).json({

success:true,
transactions

});

}catch(error){

res.status(500).json({

success:false,
message:error.message

});

}

};

exports.getAgentCollections =
async(req,res)=>{

try{

const transactions =
await DailyTransaction
.find({

collectorId:
req.params.agentId,

collectorType:"AGENT"

})
.populate(
"member",
"memberName mobile"
)
.sort({
createdAt:-1
});

res.status(200).json({

success:true,
transactions

});

}catch(error){

res.status(500).json({

success:false,
message:error.message

});

}

};

exports.agentDashboard =
async(req,res)=>{

try{

const transactions =
await DailyTransaction.find({

collectorId:
req.params.agentId,

collectorType:"AGENT"

});

const today =
new Date();

today.setHours(
0,0,0,0
);

const todayCollection =
transactions
.filter((t)=>{

const d =
new Date(
t.collectionDate
);

d.setHours(
0,0,0,0
);

return (
d.getTime() ===
today.getTime()
);

})
.reduce(

(sum,item)=>
sum+item.totalAmount,

0

);

const totalCollection =
transactions.reduce(

(sum,item)=>
sum+item.totalAmount,

0

);

res.json({

success:true,

todayCollection,

totalCollection,

totalTransactions:
transactions.length

});

}catch(error){

res.status(500).json({

success:false,
message:error.message

});

}

};


exports.getAgentHistory =
async(req,res)=>{

try{

const transactions =
await DailyTransaction
.find({

collectorId:
req.params.agentId,

collectorType:"AGENT"

})
.populate(
"member",
"memberName mobile"
)
.sort({
collectionDate:-1
});

res.status(200).json({

success:true,
transactions

});

}catch(error){

res.status(500).json({

success:false,
message:error.message

});

}

};


exports.adminSummary = async(req,res)=>{

try{

const transactions =
await DailyTransaction.find();

const today =
new Date();

today.setHours(0,0,0,0);

const todayCollection =
transactions
.filter((t)=>{

const d =
new Date(
t.collectionDate
);

d.setHours(
0,0,0,0
);

return (
d.getTime() ===
today.getTime()
);

})
.reduce(
(sum,item)=>
sum +
item.totalAmount,
0
);

const totalMembers =
await DailyMember.countDocuments();

const paidMembers =
new Set(

transactions
.filter((t)=>{

const d =
new Date(
t.collectionDate
);

d.setHours(
0,0,0,0
);

return (
d.getTime() ===
today.getTime()
);

})
.map((t)=>
t.member.toString()
)

).size;

const pending =
totalMembers -
paidMembers;

const successRate =
totalMembers
? Math.round(
(paidMembers /
totalMembers)
*100
)
:0;

res.json({

success:true,

todayCollection,

pending,

successRate

});

}catch(error){

res.status(500).json({
success:false,
message:error.message
});

}

};


