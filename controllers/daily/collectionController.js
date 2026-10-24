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





exports.collectPayment = async (req, res) => {
  try {
    const {
      memberId,
      savingId,
      amount,
      paymentMethod,
      paymentForDate,
    } = req.body;

    if (!memberId || !savingId) {
      return res.status(400).json({
        success: false,
        message: "Member ID and Saving ID are required",
      });
    }

    const member = await DailyMember.findById(memberId);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member Not Found",
      });
    }

    const saving = await DailySaving.findById(savingId);

    if (!saving) {
      return res.status(404).json({
        success: false,
        message: "Saving Account Not Found",
      });
    }

    if (String(saving.member) !== String(member._id)) {
      return res.status(400).json({
        success: false,
        message: "Saving account does not belong to this member",
      });
    }

    if (saving.status !== "ACTIVE") {
      return res.status(400).json({
        success: false,
        message: "This saving account is not active",
      });
    }

    const dailyAmount =
      saving.collectionType === "FIXED"
        ? Number(saving.fixedAmount || 0)
        : Number(amount || 0);

    if (!Number.isFinite(dailyAmount) || dailyAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment amount",
      });
    }

    const paidDate = paymentForDate
      ? new Date(paymentForDate)
      : new Date();

    if (Number.isNaN(paidDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment date",
      });
    }

    paidDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (paidDate > today) {
      return res.status(400).json({
        success: false,
        message: "Future-date payments are not allowed",
      });
    }

    const nextDay = new Date(paidDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const existingPayment = await DailyTransaction.findOne({
      savingAccount: saving._id,
      paymentForDate: {
        $gte: paidDate,
        $lt: nextDay,
      },
    });

    if (existingPayment) {
      return res.status(400).json({
        success: false,
        message: "This day's payment is already collected",
      });
    }

    let penalty = 0;

    const diffDays = Math.floor(
      (today.getTime() - paidDate.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    if (diffDays > Number(saving.graceDays || 0)) {
      if (saving.penaltyType === "FIXED") {
        penalty = Number(saving.penaltyValue || 0);
      } else {
        penalty = Math.round(
          (dailyAmount * Number(saving.penaltyValue || 0)) / 100
        );
      }
    }

    if (!Number.isFinite(penalty) || penalty < 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid penalty configuration",
      });
    }

    const totalAmount = dailyAmount + penalty;

    // Record the payment as collected by Admin.
    await DailyTransaction.create({
      savingAccount: saving._id,
      member: member._id,
      area: saving.areaGroup,
      collectorType: "ADMIN",
      collectorId: null,
      collectionDate: new Date(),
      paymentForDate: paidDate,
      dailyAmount,
      penalty,
      totalAmount,
      paymentMethod,
    });

    member.totalPaid =
      Number(member.totalPaid || 0) + dailyAmount;
    member.totalPenalty =
      Number(member.totalPenalty || 0) + penalty;
    member.totalDaysPaid =
      Number(member.totalDaysPaid || 0) + 1;
    member.lastCollectionDate = new Date();

    await member.save();

    saving.totalSaved =
      Number(saving.totalSaved || 0) + dailyAmount;
    saving.totalPenalty =
      Number(saving.totalPenalty || 0) + penalty;
    saving.totalDaysPaid =
      Number(saving.totalDaysPaid || 0) + 1;
    saving.completedDays = saving.totalDaysPaid;
    saving.lastCollectionDate = new Date();

    // Recalculate pending days using actual payment dates.
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    const startDate = new Date(saving.startDate);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(saving.endDate);
    endDate.setHours(0, 0, 0, 0);

    const allPayments = await DailyTransaction.find({
      savingAccount: saving._id,
    }).select("paymentForDate collectionDate");

    const paidDateSet = new Set(
      allPayments.map((transaction) => {
        const date = new Date(
          transaction.paymentForDate ||
            transaction.collectionDate
        );

        date.setHours(0, 0, 0, 0);
        return date.getTime();
      })
    );

    let pendingDays = 0;
    const checkDate = new Date(startDate);

    while (checkDate <= todayDate && checkDate <= endDate) {
      if (!paidDateSet.has(checkDate.getTime())) {
        pendingDays++;
      }

      checkDate.setDate(checkDate.getDate() + 1);
    }

    saving.pendingDays = pendingDays;
    saving.pendingAmount =
      saving.collectionType === "FIXED"
        ? pendingDays * Number(saving.fixedAmount || 0)
        : 0;

    await saving.save();

    return res.status(201).json({
      success: true,
      message: "Payment Collected Successfully",
      dailyAmount,
      penalty,
      totalAmount,
      paymentForDate: paidDate,
    });
  } catch (error) {
    console.error("DAILY COLLECTION ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
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



