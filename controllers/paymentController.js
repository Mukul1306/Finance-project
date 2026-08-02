const Payment =
require("../models/Payment");

const Member =
require("../models/Members");

exports.collectPayment = async (req, res) => {

  try {

   const {
  memberId,
  installmentNo,
  paymentMode,
  transactionId,
  remarks
} = req.body;

    const member = await Member.findById(memberId);

    if (!member) {

      return res.status(404).json({
        success: false,
        message: "Member Not Found"
      });

    }

    // Already Completed
    if (member.paidInstallments >= member.totalInstallments) {

      return res.status(400).json({
        success: false,
        message: "All Installments Already Paid"
      });

    }


    // Calculate Installment Month & Year
    const installmentDate = new Date(member.joiningDate);

installmentDate.setMonth(
  installmentDate.getMonth() + (installmentNo - 1)
);

    const installmentMonth =
      installmentDate.getMonth() + 1;

    const installmentYear =
      installmentDate.getFullYear();

    // Current Date
    const today = new Date();

   // Due date for selected installment
const dueDate = new Date(installmentDate);

// Use member's configured due day
dueDate.setDate(member.dueDay);

// Add grace days
const graceEndDate = new Date(dueDate);

graceEndDate.setDate(
  graceEndDate.getDate() +
  Number(member.graceDays || 0)
);

let delayMonths = 0;


// Penalty starts AFTER grace period
if (today > graceEndDate) {

  delayMonths =
    (today.getFullYear() - graceEndDate.getFullYear()) * 12 +
    (today.getMonth() - graceEndDate.getMonth()) +
    1;
}

const installmentAmount =
  Number(member.monthlyInstallment || 0);

const penaltyAmount =
  delayMonths *
  Number(member.monthlyPenalty || 0);

    const totalReceived =
      installmentAmount + penaltyAmount;


      const alreadyPaid = await Payment.findOne({
  memberId,
  installmentNo
});

if (alreadyPaid) {
  return res.status(400).json({
    success: false,
    message: "This installment is already paid."
  });
}

    // Save Payment
    const payment = await Payment.create({

      memberId,

      societyId: member.societyId,

      installmentNo,

      installmentMonth,

      installmentYear,

      installmentAmount,

      penaltyAmount,

      totalReceived,

      paymentMode,

      transactionId,

      remarks

    });

    // Update Member
    member.paidInstallments += 1;

    member.pendingInstallments = Math.max(
      0,
      member.totalInstallments -
      member.paidInstallments
    );

    member.totalPaid += installmentAmount;

    member.pendingAmount = Math.max(
      0,
      member.pendingAmount - installmentAmount
    );

    member.totalPenaltyPaid += penaltyAmount;

    member.currentPenalty =
      member.pendingInstallments *
      member.monthlyPenalty;

    member.lastPaymentDate = new Date();

    if (
      member.paidInstallments >=
      member.totalInstallments
    ) {

      member.status = "COMPLETED";

    } else {

      member.status = "ACTIVE";

    }

    await member.save();

    res.status(200).json({

      success: true,

      message: `${installmentDate.toLocaleString("en-IN", {
  month: "long"
})} ${installmentYear} Installment Collected Successfully`,

      payment

    });

  }

  catch (error) {

    res.status(500).json({

      success: false,

      message: error.message

    });

  }

};

exports.getPaymentSummary = async (req, res) => {

  try {

    const today = new Date();

    // =====================================
    // CURRENT MONTH DATE RANGE
    // =====================================

    const firstDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      1
    );

    const lastDay = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0,
      23,
      59,
      59
    );


    // =====================================
    // RUN MAIN DATABASE QUERIES TOGETHER
    // =====================================

    const [
      collection,
      activeMembers
    ] = await Promise.all([

      Payment.aggregate([
        {
          $match: {
            paymentDate: {
              $gte: firstDay,
              $lte: lastDay
            }
          }
        },
        {
          $group: {
            _id: null,

            emiCollection: {
              $sum: "$installmentAmount"
            },

            penaltyCollection: {
              $sum: "$penaltyAmount"
            },

            totalCollection: {
              $sum: "$totalReceived"
            }
          }
        }
      ]),

      Member.find({
        status: {
          $in: [
            "ACTIVE",
            "DUE",
            "OVERDUE"
          ]
        }
      }).lean()

    ]);


    // =====================================
    // COLLECTION SUMMARY
    // =====================================

    const thisMonthCollection =
      collection.length > 0
        ? collection[0].emiCollection
        : 0;

    const thisMonthPenalty =
      collection.length > 0
        ? collection[0].penaltyCollection
        : 0;

    const totalCollection =
      collection.length > 0
        ? collection[0].totalCollection
        : 0;


    // =====================================
    // MONTHLY TARGET
    // =====================================

    const monthlyTarget =
      activeMembers.reduce(
        (sum, member) =>
          sum +
          Number(member.monthlyInstallment || 0),
        0
      );


    // =====================================
    // GET ALL PAYMENTS IN ONE QUERY
    // =====================================

    const memberIds =
      activeMembers.map(
        member => member._id
      );

    const payments = await Payment.find({
      memberId: {
        $in: memberIds
      }
    })
    .select(
      "memberId installmentNo installmentMonth installmentYear"
    )
    .lean();


    // =====================================
    // CREATE FAST LOOKUP SETS
    // =====================================

    const paidInstallments = new Set();

    const paidMonths = new Set();

    for (const payment of payments) {

      const memberId =
        String(payment.memberId);

      paidInstallments.add(
        `${memberId}_${payment.installmentNo}`
      );

      paidMonths.add(
        `${memberId}_${payment.installmentYear}_${payment.installmentMonth}`
      );

    }


    // =====================================
    // PENDING CALCULATION
    // =====================================
let pendingThisMonth = 0;
let pendingTillToday = 0;
let pendingPenaltyTillToday = 0;


    for (const member of activeMembers) {

      const memberId =
        String(member._id);


      // =====================================
      // PENDING THIS MONTH
      // =====================================

      const currentMonthKey =
        `${memberId}_${today.getFullYear()}_${today.getMonth() + 1}`;

      if (
        !paidMonths.has(currentMonthKey)
      ) {

        pendingThisMonth +=
          Number(
            member.monthlyInstallment || 0
          );

      }


      // =====================================
      // MONTHS PASSED
      // =====================================

      const joiningDate =
        new Date(member.joiningDate);

      const monthsPassed =
        (
          today.getFullYear() -
          joiningDate.getFullYear()
        ) * 12 +
        (
          today.getMonth() -
          joiningDate.getMonth()
        );


      // Member hasn't started yet
      if (monthsPassed < 0) {
        continue;
      }


      // =====================================
      // CHECK INSTALLMENTS IN MEMORY
      // NO DATABASE QUERY INSIDE LOOP
      // =====================================

      for (
        let i = 0;
        i <= monthsPassed &&
        i < member.totalInstallments;
        i++
      ) {

        const installmentNo =
          i + 1;

        const paymentKey =
          `${memberId}_${installmentNo}`;


        // Already paid
        if (
          paidInstallments.has(paymentKey)
        ) {
          continue;
        }


        // =====================================
        // INSTALLMENT DATE
        // =====================================

        const installmentDate =
          new Date(joiningDate);

        installmentDate.setMonth(
          installmentDate.getMonth() + i
        );


        // =====================================
        // DUE DATE
        // =====================================

        const dueDate =
          new Date(installmentDate);

        dueDate.setDate(
          member.dueDay
        );


        // =====================================
        // GRACE PERIOD
        // =====================================

        const graceEndDate =
          new Date(dueDate);

        graceEndDate.setDate(
          graceEndDate.getDate() +
          Number(
            member.graceDays || 0
          )
        );


        // =====================================
        // PENALTY
        // =====================================

 let delayMonths = 0;

if (today > graceEndDate) {

  delayMonths =
    (today.getFullYear() - graceEndDate.getFullYear()) * 12 +
    (today.getMonth() - graceEndDate.getMonth());

  if (today.getDate() >= graceEndDate.getDate()) {
    delayMonths++;
  }

}

const penaltyAmount =
  delayMonths * Number(member.monthlyPenalty || 0);

               pendingPenaltyTillToday += penalty;

        pendingTillToday +=
          Number(
            member.monthlyInstallment || 0
          ) +
          penalty;

      }

    }


    // =====================================
    // RESPONSE
    // =====================================

    return res.status(200).json({

      success: true,

      monthlyTarget,

      thisMonthCollection,

      thisMonthPenalty,

      totalCollection,

      pendingThisMonth,

      pendingTillToday,
        pendingPenaltyTillToday

    });


  } catch (error) {

    console.error(
      "Payment Summary Error:",
      error
    );

    return res.status(500).json({

      success: false,

      message: error.message

    });

  }

};

exports.getPendingInstallments = async (req, res) => {

  try {

   const member = await Member.findOne({
  memberId: req.params.memberId
});

if (!member) {
  return res.status(404).json({
    success: false,
    message: "Member not found"
  });
}

console.log("Monthly Penalty:", member.monthlyPenalty);
console.log("Member:", member.memberId);

    const currentDate = new Date();

    const joiningDate = new Date(member.joiningDate);

    const monthsPassed =
      (currentDate.getFullYear() - joiningDate.getFullYear()) * 12 +
      (currentDate.getMonth() - joiningDate.getMonth());

    const pending = [];
    console.log("===== PENDING DEBUG =====");
console.log("Member:", member.memberId);
console.log("Mongo Member ID:", member._id);
console.log("Joining:", joiningDate);
console.log("Today:", currentDate);
console.log("Months Passed:", monthsPassed);
console.log("Total Installments:", member.totalInstallments);

for (
  let i = 0;
  i <= monthsPassed &&
  i < member.totalInstallments;
  i++
) {

  // Check if this installment is already paid
  const alreadyPaid = await Payment.findOne({
    memberId: member._id,
    installmentNo: i + 1
  });

  if (alreadyPaid) {
    continue;
  }

  // Installment Date
  const installmentDate = new Date(joiningDate);

  installmentDate.setMonth(
    joiningDate.getMonth() + i
  );

  // Due Date
  const dueDate = new Date(installmentDate);
  dueDate.setDate(member.dueDay);

  // Month Name
  const month = installmentDate.toLocaleString("en-IN", {
    month: "long"
  });

  const year = installmentDate.getFullYear();

  // Delay Calculation
 // Add grace period
const graceEndDate = new Date(dueDate);

graceEndDate.setDate(
  graceEndDate.getDate() +
  Number(member.graceDays || 0)
);

let delayMonths = 0;

if (currentDate > graceEndDate) {

  delayMonths =
    (currentDate.getFullYear() - graceEndDate.getFullYear()) * 12 +
    (currentDate.getMonth() - graceEndDate.getMonth());

  if (currentDate.getDate() >= graceEndDate.getDate()) {
    delayMonths++;
  }

}

const penalty =
  delayMonths *
  Number(member.monthlyPenalty || 0);
  

  pending.push({

    installmentNo: i + 1,

    installmentMonth:
      installmentDate.getMonth() + 1,

    installmentYear: year,

    month,

    dueDate,

    installmentAmount:
      member.monthlyInstallment,

    penaltyAmount: penalty,

    total:
      member.monthlyInstallment + penalty

  });

}

    res.json({

      success: true,

      memberName: member.name,

      memberId: member.memberId,

      pendingInstallments: pending

    });

  }

  catch (error) {

    res.status(500).json({

      success: false,

      message: error.message

    });

  }

};

exports.getPaymentHistory = async (req, res) => {

  try {

    const { memberId } = req.params;

    const member = await Member.findOne({ memberId });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found"
      });
    }

    const history = await Payment.find({
      memberId: member._id
    }).sort({
      installmentNo: 1
    });

    res.json({
      success: true,
      history
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }

};

exports.getPenaltyCollection = async (req, res) => {
  try {

    const { year, month } = req.query;

    let match = {};

    if (year && year !== "all") {

      if (month && month !== "all") {

        match.paymentDate = {
          $gte: new Date(Number(year), Number(month) - 1, 1),
          $lte: new Date(Number(year), Number(month), 0, 23, 59, 59)
        };

      } else {

        match.paymentDate = {
          $gte: new Date(Number(year), 0, 1),
          $lte: new Date(Number(year), 11, 31, 23, 59, 59)
        };

      }

    }

    const result = await Payment.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalPenalty: {
            $sum: "$penaltyAmount"
          }
        }
      }
    ]);

    res.json({
      success: true,
      totalPenalty:
        result.length > 0 ? result[0].totalPenalty : 0
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }
};