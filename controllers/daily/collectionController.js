const LoanCollection =
require("../../models/daily/LoanCollection");

const DailyMember =
require("../../models/daily/DailyMember");

const DailyTransaction =
require("../../models/daily/DailyTransaction");

const PenaltySetting =
require("../../models/daily/PenaltySetting");

const DailySaving =
require("../../models/daily/DailySaving");


exports.getAgentMembers = async (req, res) => {

  try {

    const savings = await DailySaving.find({
      assignedAgent: req.params.agentId,
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
      );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const saving of savings) {

      // =====================================
      // GET ACTUAL PAYMENTS
      // =====================================

      const transactions =
        await DailyTransaction.find({
          savingAccount: saving._id
        });

      // =====================================
      // FIND PAID DATES
      // =====================================

      const paidDates = new Set(
        transactions.map(transaction => {

        const date =
  new Date(
    transaction.paymentForDate ||
    transaction.collectionDate
  );

          date.setHours(0, 0, 0, 0);

          return date.getTime();

        })
      );

      // =====================================
      // CALCULATE DUE DAYS
      // =====================================

      const startDate =
        new Date(saving.startDate);

      startDate.setHours(0, 0, 0, 0);

      const endDate =
        new Date(saving.endDate);

      endDate.setHours(0, 0, 0, 0);

      let dueDays = 0;

      let current =
        new Date(startDate);

      while (
        current <= today &&
        current <= endDate
      ) {

        dueDays++;

        current.setDate(
          current.getDate() + 1
        );

      }

      // =====================================
      // CALCULATE PENDING DAYS
      // =====================================

      let pendingDays = 0;

      current =
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

          pendingDays++;

        }

        current.setDate(
          current.getDate() + 1
        );

      }

      // =====================================
      // UPDATE VALUES
      // =====================================

      saving.completedDays =
        paidDates.size;

      saving.totalDaysPaid =
        paidDates.size;

      saving.pendingDays =
        pendingDays;

      // =====================================
      // PENDING AMOUNT
      // =====================================

      if (
        saving.collectionType === "FIXED"
      ) {

        saving.pendingAmount =
          pendingDays *
          Number(saving.fixedAmount || 0);

      } else {

        saving.pendingAmount = 0;

      }

    }

    res.status(200).json({

      success: true,

      members: savings

    });

  } catch (error) {

    console.error(
      "GET AGENT MEMBERS ERROR:",
      error
    );

    res.status(500).json({

      success: false,

      message: error.message

    });

  }

};


exports.collectPayment =
async (req, res) => {

  try {

    const {
      memberId,
      savingId,
      agentId,
      collectorType = "AGENT",
      amount,
      paymentMethod,
      paymentForDate
    } = req.body;


    // ==========================================
    // VALIDATION
    // ==========================================

    if (!memberId) {

      return res.status(400).json({
        success: false,
        message: "Member ID is required"
      });

    }


    if (!savingId) {

      return res.status(400).json({
        success: false,
        message: "Saving ID is required"
      });

    }


    // ==========================================
    // MEMBER
    // ==========================================

    const member =
      await DailyMember.findById(
        memberId
      );


    if (!member) {

      return res.status(404).json({
        success: false,
        message: "Member Not Found"
      });

    }


    // ==========================================
    // SAVING
    // ==========================================

    const saving =
      await DailySaving.findById(
        savingId
      );


    if (!saving) {

      return res.status(404).json({
        success: false,
        message: "Saving Account Not Found"
      });

    }


    // ==========================================
    // MAKE SURE SAVING BELONGS TO MEMBER
    // ==========================================

    if (
      saving.member.toString() !==
      member._id.toString()
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Saving account does not belong to this member"
      });

    }


    // ==========================================
    // DAILY AMOUNT
    // ==========================================

    let dailyAmount = 0;


    if (
      saving.collectionType ===
      "FIXED"
    ) {

      dailyAmount =
        Number(
          saving.fixedAmount || 0
        );

    } else {

      dailyAmount =
        Number(amount || 0);

    }


    if (
      !dailyAmount ||
      dailyAmount <= 0
    ) {

      return res.status(400).json({
        success: false,
        message: "Invalid payment amount"
      });

    }


    // ==========================================
    // PAYMENT FOR DATE
    // ==========================================

    const paidDate =
      paymentForDate
        ? new Date(paymentForDate)
        : new Date();


    paidDate.setHours(
      0,
      0,
      0,
      0
    );


    const nextDay =
      new Date(paidDate);

    nextDay.setDate(
      nextDay.getDate() + 1
    );


    // ==========================================
    // CHECK THAT SPECIFIC DAY
    // ==========================================

    const existingPayment =
      await DailyTransaction.findOne({

        savingAccount:
          saving._id,

        paymentForDate: {
          $gte: paidDate,
          $lt: nextDay
        }

      });


    if (existingPayment) {

      return res.status(400).json({

        success: false,

        message:
          "This day's payment is already collected"

      });

    }


    // ==========================================
    // PENALTY
    // ==========================================

    let penalty = 0;


    const today =
      new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );


    const diffDays =
      Math.floor(
        (today - paidDate) /
        (1000 * 60 * 60 * 24)
      );


    if (
      diffDays >
      Number(saving.graceDays || 0)
    ) {

      if (
        saving.penaltyType ===
        "FIXED"
      ) {

        penalty =
          Number(
            saving.penaltyValue || 0
          );

      } else {

        penalty =
          Math.round(
            dailyAmount *
            Number(
              saving.penaltyValue || 0
            ) /
            100
          );

      }

    }


    // ==========================================
    // TOTAL
    // ==========================================

    const totalAmount =
      dailyAmount +
      penalty;


    // ==========================================
    // CREATE TRANSACTION
    // ==========================================

    await DailyTransaction.create({

      savingAccount:
        saving._id,

      member:
        member._id,

      area:
        saving.areaGroup,

      collectorType,

      collectorId:
        collectorType === "ADMIN"
          ? null
          : agentId,

      collectionDate:
        new Date(),

      paymentForDate:
        paidDate,

      dailyAmount,

      penalty,

      totalAmount,

      paymentMethod

    });


    // ==========================================
    // UPDATE MEMBER
    // ==========================================

    member.totalPaid =
      Number(
        member.totalPaid || 0
      ) +
      dailyAmount;

    member.totalPenalty =
      Number(
        member.totalPenalty || 0
      ) +
      penalty;

    member.totalDaysPaid =
      Number(
        member.totalDaysPaid || 0
      ) +
      1;

    member.lastCollectionDate =
      new Date();


    await member.save();


    // ==========================================
    // UPDATE SAVING
    // ==========================================

    saving.totalSaved =
      Number(
        saving.totalSaved || 0
      ) +
      dailyAmount;

    saving.totalPenalty =
      Number(
        saving.totalPenalty || 0
      ) +
      penalty;

    saving.totalDaysPaid =
      Number(
        saving.totalDaysPaid || 0
      ) +
      1;

    saving.completedDays =
      saving.totalDaysPaid;

    saving.lastCollectionDate =
      new Date();


    await saving.save();


    // ==========================================
    // RESPONSE
    // ==========================================

    res.status(201).json({

      success: true,

      message:
        "Payment Collected Successfully",

      dailyAmount,

      penalty,

      totalAmount,

      paymentForDate:
        paidDate

    });


  } catch (error) {

    console.error(
      "DAILY COLLECTION ERROR:",
      error
    );


    res.status(500).json({

      success: false,

      message: error.message

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



