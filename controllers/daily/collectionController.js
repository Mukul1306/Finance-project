const LoanCollection =
require("../../models/daily/LoanCollection");

const DailyMember =
require("../../models/daily/DailyMember");

const DailyTransaction =
require("../../models/daily/DailyTransaction");

const PenaltySetting =
require("../../models/daily/PenaltySetting");


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

  // Date when payment is actually collected
  collectionDate: new Date(),

  // Date for which payment is collected
  paymentForDate:
    req.body.paymentForDate || new Date(),

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
"memberId memberName mobile"
)

.populate(
"savingAccount"
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

exports.getAgentCollections = async(req,res)=>{

try{

const saving =
await DailyTransaction.find({

collectorId:req.params.agentId,

collectorType:"AGENT"

})
.populate(
"member",
"memberName mobile"
);

const loan =
await LoanCollection.find({

collectorId:req.params.agentId,

collectorType:"AGENT"

})
.populate(
"member",
"memberName mobile"
);

const transactions=[

...saving,

...loan

];

transactions.sort(

(a,b)=>

new Date(b.createdAt)-

new Date(a.createdAt)

);

res.json({

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

const saving =
await DailyTransaction.find({

collectorId:req.params.agentId,

collectorType:"AGENT"

});

const loan =
await LoanCollection.find({

collectorId:req.params.agentId,

collectorType:"AGENT"

});

const transactions=[
...saving.map(item=>({

...item.toObject(),

collectionDate:item.collectionDate

})),

...loan.map(item=>({

...item.toObject(),

collectionDate:item.paymentDate

}))

];
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


exports.getAgentHistory = async (req, res) => {

try{

const dailyTransactions =
await DailyTransaction.find({

collectorId:req.params.agentId,

collectorType:"AGENT"

})
.populate(
"member",
"memberId memberName mobile"
);

const loanTransactions =
await LoanCollection.find({

collectorId:req.params.agentId,

collectorType:"AGENT"

})
.populate(
"member",
"memberId memberName mobile"
);

const savingData =
dailyTransactions.map(item=>({

_id:item._id,

type:"DAILY",

collectionDate:item.collectionDate,

paymentForDate:item.paymentForDate,

member:item.member,

dailyAmount:item.dailyAmount,

penalty:item.penalty,

totalAmount:item.totalAmount,

paymentMethod:item.paymentMethod,

status:"PAID"

}));

const loanData =
loanTransactions.map(item=>({

  _id:item._id,

  type:"LOAN EMI",

  collectionDate:item.paymentDate,

  paymentForDate:item.dueDate,

  installmentNo:item.installmentNo,

  member:item.member,

  dailyAmount:item.principalAmount,

  penalty:item.penalty,

  totalAmount:item.totalAmount,

  paymentMethod:item.paymentMethod,

  status:item.status

}));
const transactions=[
...savingData,
...loanData
];

transactions.sort(
(a,b)=>
new Date(b.collectionDate)-new Date(a.collectionDate)
);

res.json({

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


exports.adminSummary = async (req, res) => {

  try {

    const today = new Date();
    today.setHours(0,0,0,0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate()+1);

    // ============================
    // DAILY SAVING COLLECTION
    // ============================

    const savingTransactions =
      await DailyTransaction.find({

        collectionDate:{
          $gte:today,
          $lt:tomorrow
        }

      });

    // ============================
    // DAILY LOAN EMI COLLECTION
    // ============================

    const loanTransactions =
      await LoanCollection.find({

        paymentDate:{
          $gte:today,
          $lt:tomorrow
        }

      });

    // ============================
    // TODAY COLLECTION
    // ============================

    const savingCollection =
      savingTransactions.reduce(

        (sum,item)=>
        sum+(item.totalAmount||0),

        0

      );

    const loanCollection =
      loanTransactions.reduce(

        (sum,item)=>
        sum+(item.totalAmount||0),

        0

      );

    const todayCollection =
      savingCollection +
      loanCollection;

    // ============================
    // MEMBERS
    // ============================

    const totalMembers =
      await DailyMember.countDocuments();

    const paidMembers = new Set();

    savingTransactions.forEach(item=>{

      paidMembers.add(
        item.member.toString()
      );

    });

    loanTransactions.forEach(item=>{

      paidMembers.add(
        item.member.toString()
      );

    });

    const pending =
      totalMembers -
      paidMembers.size;

    const successRate =
      totalMembers
      ? Math.round(
          (paidMembers.size/totalMembers)*100
        )
      : 0;

    res.json({

      success:true,

      todayCollection,

      savingCollection,

      loanCollection,

      pending,

      successRate

    });

  }

  catch(error){

    res.status(500).json({

      success:false,

      message:error.message

    });

  }

};



