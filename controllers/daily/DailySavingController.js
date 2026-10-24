
const mongoose = require("mongoose");
const DailySaving =
  require("../../models/daily/DailySaving");

const DailyMember =
  require("../../models/daily/DailyMember");

const DailyTransaction =
  require("../../models/daily/DailyTransaction");



const AreaGroup =
  require("../../models/daily/AreaGroup");


  const {
  applyPenaltyRuleToNewAccount
} = require("../../services/daily/penaltyPolicyService");


// =====================================================
// IST DATE HELPERS
// =====================================================

function getISTDateKey(dateValue) {

  const parts =
    new Intl.DateTimeFormat(
      "en-IN",
      {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }
    ).formatToParts(
      new Date(dateValue)
    );

  const values = {};

  for (const part of parts) {

    if (
      part.type !== "literal"
    ) {

      values[part.type] =
        part.value;

    }

  }

  return (
    `${values.year}-${values.month}-${values.day}`
  );

}


// =====================================================
// ADD DAYS TO YYYY-MM-DD
// =====================================================

function addDaysToDateKey(
  dateKey,
  days
) {

  const [
    year,
    month,
    day
  ] =
    dateKey
      .split("-")
      .map(Number);

  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    );

  date.setUTCDate(
    date.getUTCDate() + days
  );

  return date
    .toISOString()
    .slice(0, 10);

}



function istDateKeyToDate(
  dateKey
) {

  return new Date(
    `${dateKey}T00:00:00+05:30`
  );

}



exports.createDailySaving = async (req, res) => {
  try {
    const {
      member,
      collectionType,
      fixedAmount,
      durationDays,
      startDate,
      nomineeName,
      nomineeMobile,
    } = req.body;

    if (!member || !mongoose.Types.ObjectId.isValid(member)) {
      return res.status(400).json({
        success: false,
        message: "Valid Member ID is required",
      });
    }

    if (!["FIXED", "FLEXIBLE"].includes(collectionType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Collection Type",
      });
    }

    const days = Number(durationDays);
    const start = new Date(startDate);

    if (!Number.isInteger(days) || days <= 0) {
      return res.status(400).json({
        success: false,
        message: "Duration must be greater than 0",
      });
    }

    if (!startDate || Number.isNaN(start.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Valid Start Date is required",
      });
    }

    if (
      collectionType === "FIXED" &&
      (!Number.isFinite(Number(fixedAmount)) ||
        Number(fixedAmount) <= 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Fixed Amount must be greater than 0",
      });
    }

    const memberData = await DailyMember.findById(member)
      .populate("areaGroup", "areaName");

    if (!memberData) {
      return res.status(404).json({
        success: false,
        message: "Member Not Found",
      });
    }

    if (memberData.status !== "ACTIVE") {
      return res.status(400).json({
        success: false,
        message: "Only ACTIVE members can create a saving account",
      });
    }

    if (!memberData.areaGroup) {
      return res.status(400).json({
        success: false,
        message: "Member does not have an Area assigned",
      });
    }

    const endDate = new Date(start);
    endDate.setDate(endDate.getDate() + days - 1);

    const saving = new DailySaving({
      member: memberData._id,
      areaGroup: memberData.areaGroup._id,
      collectionType,
      fixedAmount:
        collectionType === "FIXED" ? Number(fixedAmount) : 0,
      durationDays: days,
      startDate: start,
      endDate,
      graceDays: 0,
      penaltyType: "PERCENTAGE",
      penaltyValue: 0,
      maxPenalty: 0,
      autoPenalty: true,
      status: "ACTIVE",
      nomineeName: nomineeName || "",
      nomineeMobile: nomineeMobile || "",
    });

    await applyPenaltyRuleToNewAccount({
      memberId: memberData._id,
      type: "DAILY_SAVING",
      account: saving,
    });

    await saving.save();

    await AreaGroup.findByIdAndUpdate(memberData.areaGroup._id, {
      $inc: { totalMembers: 1 },
    });

    return res.status(201).json({
      success: true,
      message: "Daily Saving Account Created Successfully",
      saving,
    });
  } catch (error) {
    console.error("CREATE DAILY SAVING ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};




exports.getAllDailySavings = async (req, res) => {

  try {

    const savings = await DailySaving.find()
  .populate("member", "memberId memberName mobile city")
  .populate("areaGroup", "areaName")
  .sort({ createdAt: -1 });

    res.status(200).json({

      success: true,

      savings

    });

  } catch (error) {

    res.status(500).json({

      success: false,

      message: error.message

    });

  }

};


exports.getDailySaving = async (req, res) => {

  try {

    const saving = await DailySaving.findById(
      req.params.id
    )

      .populate("member")

      .populate("areaGroup");

    if (!saving) {

      return res.status(404).json({

        success: false,

        message: "Saving Account Not Found"

      });

    }

    res.status(200).json({

      success: true,

      saving

    });

  } catch (error) {

    res.status(500).json({

      success: false,

      message: error.message

    });

  }

};




exports.getSavingDetails = async (req, res) => {

  try {

    const saving =
      await DailySaving.findById(
        req.params.id
      )
        .populate("member")
        .populate(
          "areaGroup",
          "areaName"
        );



    if (!saving) {

      return res.status(404).json({

        success: false,

        message:
          "Saving Account Not Found"

      });

    }


    // ==========================================
    // ALL TRANSACTIONS FOR THIS SAVING
    // ==========================================

    const transactions =
      await DailyTransaction.find({

        savingAccount:
          saving._id

      })
        .sort({
          paymentForDate: -1,
          collectionDate: -1
        })
        .lean();


    // ==========================================
    // RESPONSE
    // ==========================================

    return res.status(200).json({

      success: true,

      member:
        saving.member,

      saving: {

        _id:
          saving._id,

        status:
          saving.status,

        collectionType:
          saving.collectionType,

        fixedAmount:
          Number(
            saving.fixedAmount || 0
          ),

        durationDays:
          Number(
            saving.durationDays || 0
          ),

        startDate:
          saving.startDate,

        endDate:
          saving.endDate,

        graceDays:
          Number(
            saving.graceDays || 0
          ),

        penaltyType:
          saving.penaltyType,

        penaltyValue:
          Number(
            saving.penaltyValue || 0
          ),

        totalSaved:
          Number(
            saving.totalSaved || 0
          ),

        totalPenalty:
          Number(
            saving.totalPenalty || 0
          ),

        totalDaysPaid:
          Number(
            saving.totalDaysPaid || 0
          ),

        completedDays:
          Number(
            saving.completedDays || 0
          ),

        pendingDays:
          Number(
            saving.pendingDays || 0
          ),

        pendingAmount:
          Number(
            saving.pendingAmount || 0
          ),

        lastCollectionDate:
          saving.lastCollectionDate,

        nomineeName:
          saving.nomineeName,

        nomineeMobile:
          saving.nomineeMobile

      },

      area:
        saving.areaGroup,

      assignedAgent:
        saving.assignedAgent,

      transactions

    });


  } catch (error) {

    console.error(
      "GET SAVING DETAILS ERROR:",
      error
    );


    return res.status(500).json({

      success: false,

      message:
        error.message

    });

  }

};

exports.updateDailySaving = async (req, res) => {
  try {

    const saving = await DailySaving.findById(req.params.id);

    if (!saving) {
      return res.status(404).json({
        success: false,
        message: "Saving Account Not Found"
      });
    }

    // Only ACTIVE accounts can be edited
    if (saving.status !== "ACTIVE") {
      return res.status(400).json({
        success: false,
        message: "Only ACTIVE saving accounts can be edited"
      });
    }

    const {
      areaGroup,
      collectionType,
      fixedAmount,
      durationDays,
      startDate,
      graceDays,
      penaltyType,
      penaltyValue,
      nomineeName,
      nomineeMobile
    } = req.body;

    // ==========================================
    // AREA / AGENT
    // ==========================================

   if (areaGroup && areaGroup !== saving.areaGroup.toString()) {
  const newArea = await AreaGroup.findById(areaGroup);

  if (!newArea) {
    return res.status(404).json({
      success: false,
      message: "Area Group Not Found",
    });
  }

  if (saving.areaGroup) {
    await AreaGroup.findByIdAndUpdate(saving.areaGroup, {
      $inc: { totalMembers: -1 },
    });
  }

  saving.areaGroup = newArea._id;

  await AreaGroup.findByIdAndUpdate(newArea._id, {
    $inc: { totalMembers: 1 },
  });
}

    // ==========================================
    // SAVING DETAILS
    // ==========================================

    if (collectionType !== undefined) {
      saving.collectionType = collectionType;
    }

    saving.fixedAmount =
      saving.collectionType === "FIXED"
        ? Number(fixedAmount || 0)
        : 0;

    if (durationDays !== undefined) {
      saving.durationDays = Number(durationDays);
    }

    if (startDate !== undefined) {
      saving.startDate = new Date(startDate);
    }

    if (graceDays !== undefined) {
      saving.graceDays = Number(graceDays || 0);
    }

    if (penaltyType !== undefined) {
      saving.penaltyType = penaltyType;
    }

    if (penaltyValue !== undefined) {
      saving.penaltyValue = Number(penaltyValue || 0);
    }

    saving.nomineeName =
      nomineeName || "";

    saving.nomineeMobile =
      nomineeMobile || "";

    // ==========================================
    // RECALCULATE END DATE
    // ==========================================

    const start = new Date(saving.startDate);

    start.setHours(0, 0, 0, 0);

    const end = new Date(start);

   end.setDate(
  end.getDate() +
  Number(saving.durationDays) -
  1
);

    saving.endDate = end;

    await saving.save();

    res.status(200).json({
      success: true,
      message: "Saving Account Updated Successfully",
      saving
    });

  } catch (error) {

    console.error(
      "UPDATE SAVING ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message
    });

  }
};

exports.terminateDailySaving = async (req, res) => {
  try {

    const {
      reason,
      terminatedBy
    } = req.body;

    const saving = await DailySaving.findById(
      req.params.id
    );

    if (!saving) {
      return res.status(404).json({
        success: false,
        message: "Saving Account Not Found"
      });
    }

    // Only active account can be terminated
    if (saving.status !== "ACTIVE") {
      return res.status(400).json({
        success: false,
        message:
          "Only ACTIVE saving accounts can be terminated"
      });
    }

    // ==========================================
    // TERMINATE ACCOUNT
    // ==========================================

    saving.status = "TERMINATED";

    saving.terminationDate = new Date();

    saving.terminationReason =
      reason || "Account terminated";

    saving.terminatedBy =
      terminatedBy || "ADMIN";

    // Stop future collection
    saving.nextCollectionDate = null;

    await saving.save();

    // ==========================================
    // UPDATE AREA MEMBER COUNT
    // ==========================================

    if (saving.areaGroup) {

      await AreaGroup.findByIdAndUpdate(
        saving.areaGroup,
        {
          $inc: {
            totalMembers: -1
          }
        }
      );

    }

    // ==========================================
    // UPDATE AGENT MEMBER COUNT
    // ==========================================

    if (saving.assignedAgent) {

      await DailyAgent.findByIdAndUpdate(
        saving.assignedAgent,
        {
          $inc: {
            totalMembers: -1
          }
        }
      );

    }

    res.status(200).json({

      success: true,

      message:
        "Daily Saving Account Terminated Successfully",

      saving

    });

  } catch (error) {

    console.error(
      "TERMINATE SAVING ERROR:",
      error
    );

    res.status(500).json({

      success: false,

      message: error.message

    });

  }
};


exports.closeDailySaving = async (req, res) => {

  try {

    const saving =
      await DailySaving.findById(
        req.params.id
      );

    if (!saving) {

      return res.status(404).json({

        success: false,

        message: "Saving Account Not Found"

      });

    }
    await AreaGroup.findByIdAndUpdate(

saving.areaGroup,

{
    $inc:{
        totalMembers:-1
    }
}

);
    saving.status = "CLOSED";

    await saving.save();

    res.status(200).json({

      success: true,

      message:
      "Saving Account Closed"

    });

  } catch (error) {

    res.status(500).json({

      success: false,

      message: error.message

    });

  }

};


/*
=========================================
GET MEMBER DETAILS FOR NEW SAVING
=========================================
*/

exports.getSavingMemberDetails = async (req, res) => {
  try {
   const member = await DailyMember.findById(req.params.memberId)
  .populate("areaGroup", "areaName")
  .populate("assignedAgent", "name mobile");

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member Not Found"
      });
    }

    // Check if member already has an active saving account
   const activeSavings = await DailySaving.find({
  member: member._id,
  status: "ACTIVE"
})
  .populate("areaGroup", "areaName")
  .populate("assignedAgent", "name");

    res.status(200).json({
  success: true,
  member,
  hasSaving: activeSavings.length > 0,
  savings: activeSavings
});

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


exports.collectAdvancePayment = async (req, res) => {
  try {
    const {
      savingId,
      numberOfDays,
      paymentMethod,
    } = req.body;

    // =====================================================
    // VALIDATION
    // =====================================================

    if (!savingId) {
      return res.status(400).json({
        success: false,
        message: "Saving ID is required"
      });
    }

    const advanceDays = Number(numberOfDays);

    if (
      !Number.isInteger(advanceDays) ||
      advanceDays <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Number of advance days must be greater than 0"
      });
    }

    if (advanceDays > 365) {
      return res.status(400).json({
        success: false,
        message: "Maximum 365 advance days can be collected at once"
      });
    }

    if (!paymentMethod) {
      return res.status(400).json({
        success: false,
        message: "Payment method is required"
      });
    }

    // =====================================================
    // GET SAVING
    // =====================================================

    const saving = await DailySaving.findById(savingId)
      .populate("member")
      .populate("areaGroup");

    if (!saving) {
      return res.status(404).json({
        success: false,
        message: "Saving Account Not Found"
      });
    }

    // =====================================================
    // CHECK SAVING STATUS
    // =====================================================

    if (saving.status !== "ACTIVE") {
      return res.status(400).json({
        success: false,
        message: "This saving account is not active"
      });
    }

    // =====================================================
    // CHECK ASSIGNMENT
    // =====================================================

    if (!saving.member) {
      return res.status(400).json({
        success: false,
        message: "Saving member not found"
      });
    }

    if (!saving.areaGroup) {
      return res.status(400).json({
        success: false,
        message: "Saving Area is not assigned"
      });
    }

    if (!saving.assignedAgent) {
      return res.status(400).json({
        success: false,
        message: "Saving Agent is not assigned"
      });
    }

    // =====================================================
    // DAILY AMOUNT
    // =====================================================

    let dailyAmount = 0;

    if (saving.collectionType === "FIXED") {
      dailyAmount = Number(
        saving.fixedAmount || 0
      );
    } else {
      return res.status(400).json({
        success: false,
        message:
          "Advance collection is currently supported only for FIXED savings"
      });
    }

    if (!dailyAmount || dailyAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid saving daily amount"
      });
    }

    // =====================================================
    // TODAY
    // =====================================================

    const todayKey = getISTDateKey(new Date());

    // =====================================================
    // SAVING START / END
    // =====================================================

    const startKey = getISTDateKey(
      saving.startDate
    );

    const endKey = getISTDateKey(
      saving.endDate
    );

    if (!startKey || !endKey) {
      return res.status(400).json({
        success: false,
        message: "Invalid saving start or end date"
      });
    }

    // =====================================================
    // GET ALL EXISTING PAYMENTS
    // =====================================================

    const transactions = await DailyTransaction.find({
      savingAccount: saving._id
    }).select(
      "paymentForDate collectionDate"
    );

    // =====================================================
    // CREATE PAID DATE SET
    // =====================================================

    const paidDates = new Set();

    for (const transaction of transactions) {
      const paidDate =
        transaction.paymentForDate ||
        transaction.collectionDate;

      if (!paidDate) continue;

      const dateKey =
        getISTDateKey(paidDate);

      if (dateKey) {
        paidDates.add(dateKey);
      }
    }



    const futurePayments = [];

    let currentKey = addDaysToDateKey(
      todayKey,
      1
    );

    while (
      currentKey <= endKey &&
      futurePayments.length < advanceDays
    ) {
      // -----------------------------------------------
      // ALREADY PAID
      // -----------------------------------------------

      if (paidDates.has(currentKey)) {
        currentKey =
          addDaysToDateKey(
            currentKey,
            1
          );

        continue;
      }

      // -----------------------------------------------
      // FUTURE PAYMENT
      // -----------------------------------------------

      const paymentDate =
        istDateKeyToDate(currentKey);

      const installmentNo =
        Math.floor(
          (
            paymentDate -
            istDateKeyToDate(startKey)
          ) /
            (1000 * 60 * 60 * 24)
        ) + 1;

      futurePayments.push({
        installmentNo,
        dateKey: currentKey,
        paymentDate,
        dailyAmount
      });

      currentKey =
        addDaysToDateKey(
          currentKey,
          1
        );
    }

    // =====================================================
    // CHECK AVAILABLE FUTURE DAYS
    // =====================================================

    if (
      futurePayments.length < advanceDays
    ) {
      return res.status(400).json({
        success: false,
        message:
          `Only ${futurePayments.length} future saving days are available for advance payment`,
        availableDays:
          futurePayments.length
      });
    }

    // =====================================================
    // TOTAL AMOUNT
    // =====================================================

    const totalAmount =
      futurePayments.reduce(
        (sum, item) =>
          sum +
          item.dailyAmount,
        0
      );

    // =====================================================
    // CREATE TRANSACTIONS
    // =====================================================

    const transactionDocuments =
      futurePayments.map((item) => ({
        savingAccount:
          saving._id,

        member:
          saving.member._id,

        area:
          saving.areaGroup._id,

       collectorType: "ADMIN",
collectorId: null,

        // Actual date money was collected
        collectionDate:
          new Date(),

        // Future saving day being paid
        paymentForDate:
          item.paymentDate,

        dailyAmount:
          item.dailyAmount,

        penalty: 0,

        totalAmount:
          item.dailyAmount,

        paymentMethod
      }));

    await DailyTransaction.insertMany(
      transactionDocuments
    );

    // =====================================================
    // UPDATE SAVING
    // =====================================================

    saving.totalSaved =
      Number(
        saving.totalSaved || 0
      ) + totalAmount;

    saving.totalDaysPaid =
      Number(
        saving.totalDaysPaid || 0
      ) + futurePayments.length;

    saving.completedDays =
      saving.totalDaysPaid;

    saving.lastCollectionDate =
      new Date();

    await saving.save();

    // =====================================================
    // UPDATE AGENT COLLECTION
    // =====================================================

    if (
      saving.assignedAgent?._id
    ) {
      await DailyAgent.findByIdAndUpdate(
        saving.assignedAgent._id,
        {
          $inc: {
            todayCollection:
              totalAmount,

            totalCollection:
              totalAmount
          }
        }
      );
    }

    // =====================================================
    // UPDATE AREA COLLECTION
    // =====================================================

    if (
      saving.areaGroup?._id
    ) {
      await AreaGroup.findByIdAndUpdate(
        saving.areaGroup._id,
        {
          $inc: {
            totalCollection:
              totalAmount
          }
        }
      );
    }

    // =====================================================
    // RESPONSE
    // =====================================================

    return res.status(201).json({
      success: true,

      message:
        "Advance Payment Collected Successfully",

      savingId:
        saving._id,

      numberOfDays:
        futurePayments.length,

      dailyAmount,

      totalAmount,

      paymentMethod,

      payments:
        futurePayments.map(
          (item) => ({
            installmentNo:
              item.installmentNo,

            paymentForDate:
              item.paymentDate,

            amount:
              item.dailyAmount
          })
        )
    });

  } catch (error) {

    console.error(
      "COLLECT ADVANCE PAYMENT ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};