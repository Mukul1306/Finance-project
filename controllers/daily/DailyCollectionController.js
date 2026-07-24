const DailySaving = require("../../models/daily/DailySaving");
const DailyMember = require("../../models/daily/DailyMember");
const DailyTransaction = require("../../models/daily/DailyTransaction");
const DailyAgent = require("../../models/daily/Agent");
const AreaGroup = require("../../models/daily/AreaGroup");

exports.getPendingDays = async (req, res) => {

try{

const saving =
await DailySaving.findById(req.params.id)

.populate(
"member",
"memberId memberName mobile"
)

.populate(
"areaGroup",
"areaName"
)

.populate(
"assignedAgent",
"name"
);

if(!saving){

return res.status(404).json({

success:false,

message:"Saving Account Not Found"

});

}

const transactions =
await DailyTransaction.find({

savingAccount:saving._id

});

const paidDates =
transactions.map(item=>{

const d =
new Date(item.collectionDate);

d.setHours(0,0,0,0);

return d.getTime();

});

const today =
new Date();

today.setHours(0,0,0,0);

const end =
new Date(saving.endDate);

end.setHours(0,0,0,0);

const pendingDays=[];

let current =
new Date(saving.startDate);

current.setHours(0,0,0,0);

while(current<=today && current<=end){

const check =
current.getTime();

if(!paidDates.includes(check)){

const diffDays =
Math.floor(

(today-current)

/(1000*60*60*24)

);

let penalty=0;

if(diffDays>saving.graceDays){

const chargeable =
diffDays-saving.graceDays;

if(saving.penaltyType==="FIXED"){

penalty=
chargeable*
saving.penaltyValue;

}else{

penalty=

Math.round(

(saving.fixedAmount*

saving.penaltyValue/100)

*chargeable

);

}

}

pendingDays.push({

date:new Date(current),

dailyAmount:

saving.collectionType==="FIXED"

?saving.fixedAmount

:0,

penalty,

total:

(saving.collectionType==="FIXED"

?saving.fixedAmount

:0)

+

penalty

});

}

current.setDate(

current.getDate()+1

);

}
pendingDays.sort(

(a,b)=>

new Date(a.date)-new Date(b.date)

);


res.json({

success:true,

saving,

pendingDays

});

}catch(error){

res.status(500).json({

success:false,

message:error.message

});

}

};


exports.collectPendingPayment = async (req,res)=>{

try{

const{

savingId,
pendingDate,
collectorType,
collectorId,
paymentMethod,
amount

}=req.body;

const saving=
await DailySaving.findById(savingId)

.populate("member")

.populate("assignedAgent")

.populate("areaGroup");

if(!saving){

return res.status(404).json({

success:false,
message:"Saving Account Not Found"

});

}

const paymentDate=
new Date(pendingDate);

paymentDate.setHours(0,0,0,0);

const nextDay = new Date(paymentDate);

nextDay.setDate(nextDay.getDate() + 1);

const already =
await DailyTransaction.findOne({

savingAccount: saving._id,

collectionDate: {

$gte: paymentDate,

$lt: nextDay

}

});

if(already){

return res.status(400).json({

success:false,

message:"This day's payment already collected."

});

}

let dailyAmount=0;

if(saving.collectionType==="FIXED"){

dailyAmount=saving.fixedAmount;

}else{

dailyAmount=Number(amount);

}

const today=new Date();

today.setHours(0,0,0,0);

const diffDays=Math.floor(

(today-paymentDate)

/(1000*60*60*24)

);

let penalty=0;

if(diffDays>saving.graceDays){

const chargeable=

diffDays-saving.graceDays;

if(saving.penaltyType==="FIXED"){

penalty=

chargeable*

saving.penaltyValue;

}else{

penalty=

Math.round(

(dailyAmount*

saving.penaltyValue/100)

*chargeable

);

}

}

const totalAmount=

dailyAmount+penalty;

await DailyTransaction.create({

savingAccount:saving._id,

member:saving.member._id,

area:saving.areaGroup._id,

collectorType,

collectorId:

collectorType==="ADMIN"

?null

:collectorId,

collectionDate:paymentDate,

dailyAmount,

penalty,

totalAmount,

paymentMethod

});

saving.totalSaved += dailyAmount;

saving.totalPenalty += penalty;

saving.totalDaysPaid += 1;

saving.completedDays = saving.totalDaysPaid;

// Calculate how many days are due up to today



const startDate = new Date(saving.startDate);
startDate.setHours(0, 0, 0, 0);

let dueDays = Math.floor(
  (today - startDate) / (1000 * 60 * 60 * 24)
) + 1;

// Don't exceed the total duration
if (dueDays > saving.durationDays) {
  dueDays = saving.durationDays;
}

saving.pendingDays = dueDays - saving.totalDaysPaid;

if (saving.pendingDays < 0) {
  saving.pendingDays = 0;
}

if (saving.collectionType === "FIXED") {
  saving.pendingAmount = saving.pendingDays * saving.fixedAmount;
} else {
  saving.pendingAmount = 0;
}

if (saving.totalDaysPaid >= saving.durationDays) {
    saving.status = "COMPLETED";

    saving.completedDate = new Date();

}

saving.lastCollectionDate = new Date();

await saving.save();

await DailyAgent.findByIdAndUpdate(

saving.assignedAgent._id,

{

$inc:{

todayCollection:totalAmount,

totalCollection:totalAmount

}

}

);

await AreaGroup.findByIdAndUpdate(

saving.areaGroup._id,

{

$inc:{

totalCollection:totalAmount

}

}

);

res.status(201).json({

success:true,

message:"Payment Collected Successfully",

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


exports.getMemberSaving = async(req,res)=>{

try{

const saving =
await DailySaving.findOne({

member:req.params.id,

status:"ACTIVE"

})

.populate(
"areaGroup",
"areaName"
)

.populate(
"assignedAgent",
"name mobile"
);

if(!saving){

return res.json({

success:true,

saving:null

});

}

res.json({

success:true,

saving

});

}catch(error){

res.status(500).json({

success:false,

message:error.message

});

}

};

exports.getCollectionMembers = async (req, res) => {
  try {

    const members = await DailySaving.find({
      status: "ACTIVE"
    })
      .populate("member", "memberId memberName mobile")
      .populate("areaGroup", "areaName")
      .populate("assignedAgent", "name")
      .sort({ createdAt: -1 });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const saving of members) {

      const startDate = new Date(saving.startDate);
      startDate.setHours(0, 0, 0, 0);

      let dueDays = Math.floor(
        (today - startDate) / (1000 * 60 * 60 * 24)
      ) + 1;

      if (dueDays < 0) dueDays = 0;

      if (dueDays > saving.durationDays) {
        dueDays = saving.durationDays;
      }

      saving.completedDays = saving.totalDaysPaid;

      saving.pendingDays = dueDays - saving.totalDaysPaid;

      if (saving.pendingDays < 0) {
        saving.pendingDays = 0;
      }

      if (saving.collectionType === "FIXED") {
        saving.pendingAmount =
          saving.pendingDays * saving.fixedAmount;
      } else {
        saving.pendingAmount = 0;
      }

      await saving.save();
    }

    res.json({
      success: true,
      members
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
exports.getAgentCollectionMembers = async (req, res) => {

try{

const members =
await DailySaving.find({

assignedAgent:req.params.agentId,

status:"ACTIVE"

})

.populate(
"member",
"memberId memberName mobile"
)

.populate(
"areaGroup",
"areaName"
)

.populate(
"assignedAgent",
"name"
);

res.json({

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

exports.getCollectionSummary = async (req, res) => {
  try {

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Active Saving Accounts
    const savings = await DailySaving.find({
      status: "ACTIVE"
    });

    // Today's Transactions
    const todayTransactions = await DailyTransaction.find({
      collectionDate: {
        $gte: today,
        $lt: tomorrow
      }
    });

    // ==========================
    // Today's Target
    // ==========================

    let todayTarget = 0;

    savings.forEach((saving) => {
      if (saving.collectionType === "FIXED") {
        todayTarget += saving.fixedAmount;
      }
    });

    // ==========================
    // Today's Collection
    // ==========================

    const todayCollected = todayTransactions.reduce(
      (sum, item) => sum + item.totalAmount,
      0
    );

    // ==========================
    // Pending Amount
    // ==========================

    const pendingAmount = Math.max(
      0,
      todayTarget - todayCollected
    );

    // ==========================
    // Pending Members
    // ==========================

    const paidMembers = new Set(
      todayTransactions.map(t => t.savingAccount.toString())
    );

    const pendingMembers = savings.filter(
      s => !paidMembers.has(s._id.toString())
    ).length;

    // ==========================
    // Agent Collection
    // ==========================

    const agentCollection = todayTransactions
      .filter(t => t.collectorType === "AGENT")
      .reduce((sum, t) => sum + t.totalAmount, 0);

    // ==========================
    // Self/Admin Collection
    // ==========================

    const selfCollection = todayTransactions
      .filter(t => t.collectorType === "ADMIN")
      .reduce((sum, t) => sum + t.totalAmount, 0);

    res.json({

      success: true,

      todayTarget,

      todayCollected,

      pendingAmount,

      pendingMembers,

      agentCollection,

      selfCollection

    });

  } catch (error) {

    res.status(500).json({

      success: false,

      message: error.message

    });

  }
};


exports.getAgentMonthlyCollection = async (req, res) => {

  try {

    const firstDay = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    );

    const lastDay = new Date(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      0,
      23,
      59,
      59
    );

    const data = await DailyTransaction.aggregate([

      {
        $match: {
          collectorType: "AGENT",
          collectionDate: {
            $gte: firstDay,
            $lte: lastDay
          }
        }
      },

      {
        $group: {
          _id: "$collectorId",

          totalCollection: {
            $sum: "$totalAmount"
          },

          totalTransactions: {
            $sum: 1
          }
        }
      }

    ]);

    const result = await DailyAgent.populate(data, {
      path: "_id",
      select: "name mobile"
    });

    res.json({
      success: true,
      agents: result
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }

};