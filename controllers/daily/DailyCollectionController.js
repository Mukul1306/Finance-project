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
transactions.map(item => {

    // Payment belongs to this saving date
    const d = new Date(
        item.paymentForDate || item.collectionDate
    );

    d.setHours(0, 0, 0, 0);

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

if (diffDays > saving.graceDays) {

    if (saving.penaltyType === "FIXED") {

        penalty = saving.penaltyValue;

    } else {

        penalty = Math.round(
            saving.fixedAmount *
            saving.penaltyValue / 100
        );

    }

}

const installmentNo =
  Math.floor(
    (current - new Date(saving.startDate)) /
    (1000 * 60 * 60 * 24)
  ) + 1;

pendingDays.push({

  installmentNo,

  date: new Date(current),

  dailyAmount:
    saving.collectionType === "FIXED"
      ? Number(saving.fixedAmount || 0)
      : 0,

  penalty,

  total:
    (
      saving.collectionType === "FIXED"
        ? Number(saving.fixedAmount || 0)
        : 0
    ) + Number(penalty || 0)

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

paymentForDate: {
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

if (diffDays > saving.graceDays) {

    if (saving.penaltyType === "FIXED") {

        penalty = saving.penaltyValue;

    } else {

        penalty = Math.round(
            dailyAmount *
            saving.penaltyValue / 100
        );

    }

}

const totalAmount=

dailyAmount+penalty;

await DailyTransaction.create({

    savingAccount: saving._id,

    member: saving.member._id,

    area: saving.areaGroup._id,

    collectorType,

    collectorId:
        collectorType === "ADMIN"
            ? null
            : collectorId,

    // Actual date money was collected
    collectionDate: new Date(),

    // Keep the pending/due date separately
    paymentForDate: paymentDate,

    dailyAmount,

    penalty,

    totalAmount,

    paymentMethod

});

saving.totalSaved += dailyAmount;

saving.totalPenalty += penalty;

saving.totalDaysPaid += 1;

saving.completedDays = saving.totalDaysPaid;

// ==========================================
// RECALCULATE ACTUAL PENDING DAYS
// ==========================================

const allTransactions =
  await DailyTransaction.find({
    savingAccount: saving._id
  });

const paidDates = new Set(
  allTransactions.map(transaction => {

    const paidDate =
      new Date(
        transaction.paymentForDate ||
        transaction.collectionDate
      );

    paidDate.setHours(
      0,
      0,
      0,
      0
    );

    return paidDate.getTime();

  })
);


const startDate =
  new Date(saving.startDate);

startDate.setHours(
  0,
  0,
  0,
  0
);


const endDate =
  new Date(saving.endDate);

endDate.setHours(
  0,
  0,
  0,
  0
);


let actualPendingDays = 0;


let current =
  new Date(startDate);


while (
  current <= today &&
  current <= endDate
) {

  if (
    !paidDates.has(
      current.getTime()
    )
  ) {

    actualPendingDays++;

  }

  current.setDate(
    current.getDate() + 1
  );

}


saving.pendingDays =
  actualPendingDays;


if (
  saving.collectionType ===
  "FIXED"
) {

  saving.pendingAmount =
    actualPendingDays *
    Number(
      saving.fixedAmount || 0
    );

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

    const members =
      await DailySaving.find({
        status: "ACTIVE"
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
        )
        .sort({
          createdAt: -1
        });


    const today =
      new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );


    for (const saving of members) {

      // ==========================================
      // ALL TRANSACTIONS
      // ==========================================

      const transactions =
        await DailyTransaction.find({
          savingAccount: saving._id
        });


      // ==========================================
      // UNIQUE PAID DATES
      // ==========================================

      const paidDates =
        new Set(
          transactions.map(
            transaction => {

              const paidDate =
                new Date(
                  transaction.paymentForDate ||
                  transaction.collectionDate
                );

              paidDate.setHours(
                0,
                0,
                0,
                0
              );

              return paidDate.getTime();

            }
          )
        );


      // ==========================================
      // START / END DATE
      // ==========================================

      const startDate =
        new Date(
          saving.startDate
        );

      startDate.setHours(
        0,
        0,
        0,
        0
      );


      const endDate =
        new Date(
          saving.endDate
        );

      endDate.setHours(
        0,
        0,
        0,
        0
      );


      // ==========================================
      // ACTUAL PENDING DAYS
      // ==========================================

      let actualPendingDays = 0;

      let current =
        new Date(
          startDate
        );


      while (
        current <= today &&
        current <= endDate
      ) {

        if (
          !paidDates.has(
            current.getTime()
          )
        ) {

          actualPendingDays++;

        }


        current.setDate(
          current.getDate() + 1
        );

      }


      // ==========================================
      // UPDATE COUNTERS
      // ==========================================

      saving.completedDays =
        paidDates.size;

      saving.totalDaysPaid =
        paidDates.size;

      saving.pendingDays =
        actualPendingDays;


      // ==========================================
      // PENDING AMOUNT
      // ==========================================

      if (
        saving.collectionType ===
        "FIXED"
      ) {

        saving.pendingAmount =
          actualPendingDays *
          Number(
            saving.fixedAmount || 0
          );

      } else {

        saving.pendingAmount = 0;

      }


      // ==========================================
      // SAVE ONCE
      // ==========================================

      await saving.save();

    }


    res.json({
      success: true,
      members
    });


  } catch (error) {

    console.error(
      "GET COLLECTION MEMBERS ERROR:",
      error
    );


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