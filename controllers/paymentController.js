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
    const { year = "all", month = "all" } = req.query;

    // =====================================================
    // TODAY
    // =====================================================

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    // =====================================================
    // SELECTED PERIOD
    // =====================================================

    let periodStart = null;
    let periodEnd = null;

    if (year !== "all") {
      if (month !== "all") {
        // Selected Year + Month
        periodStart = new Date(
          Number(year),
          Number(month) - 1,
          1
        );

        periodEnd = new Date(
          Number(year),
          Number(month),
          0,
          23,
          59,
          59,
          999
        );
      } else {
        // Selected Year / All Months
        periodStart = new Date(
          Number(year),
          0,
          1
        );

        periodEnd = new Date(
          Number(year),
          11,
          31,
          23,
          59,
          59,
          999
        );
      }
    }

    // =====================================================
    // ACTIVE MEMBERS
    // =====================================================

    const activeMembers = await Member.find({
      status: {
        $in: [
          "ACTIVE",
          "DUE",
          "OVERDUE"
        ]
      }
    }).lean();

    // =====================================================
    // MONTHLY TARGET
    // =====================================================

    let monthlyTarget = 0;

    for (const member of activeMembers) {
      const joiningDate = new Date(member.joiningDate);

      // Determine target date
      const targetDate = periodStart || today;

      // Member has not joined yet
      if (joiningDate > targetDate) {
        continue;
      }

      // If specific month/year selected,
      // don't include members whose membership ended
      // before that month.
      if (
        year !== "all" &&
        month !== "all"
      ) {
        const selectedYear = Number(year);
        const selectedMonth = Number(month);

        const memberEndDate =
          member.memberEndDate
            ? new Date(member.memberEndDate)
            : null;

        const selectedDate = new Date(
          selectedYear,
          selectedMonth - 1,
          1
        );

        if (
          memberEndDate &&
          selectedDate > memberEndDate
        ) {
          continue;
        }
      }

      monthlyTarget += Number(
        member.monthlyInstallment || 0
      );
    }

    // =====================================================
    // GET ALL PAYMENTS
    //
    // IMPORTANT:
    // We use installmentMonth/installmentYear
    // to know WHICH MONTH the EMI belongs to.
    //
    // We do NOT use paymentDate for monthly EMI collection.
    // =====================================================

    const memberIds = activeMembers.map(
      member => member._id
    );

    const payments = await Payment.find({
      memberId: {
        $in: memberIds
      }
    })
      .select(
        "memberId installmentNo installmentMonth installmentYear installmentAmount penaltyAmount totalReceived paymentDate"
      )
      .lean();

    // =====================================================
    // PAID INSTALLMENT LOOKUP
    // =====================================================

    const paidInstallments = new Set();

    for (const payment of payments) {
      paidInstallments.add(
        `${String(payment.memberId)}_${payment.installmentNo}`
      );
    }

    // =====================================================
    // DETERMINE SELECTED MONTH
    // =====================================================

    let selectedYear;
    let selectedMonth;

    if (
      year !== "all" &&
      month !== "all"
    ) {
      selectedYear = Number(year);
      selectedMonth = Number(month);
    } else {
      // When no filter is selected,
      // Pending (Month) means CURRENT month.
      selectedYear = today.getFullYear();
      selectedMonth = today.getMonth() + 1;
    }

    // =====================================================
    // THIS MONTH / SELECTED MONTH COLLECTION
    //
    // VERY IMPORTANT:
    //
    // A payment collected in September for August
    // must NOT be counted as September EMI collection.
    //
    // We check:
    // installmentMonth
    // installmentYear
    // =====================================================

   let thisMonthCollection = 0;
let thisMonthPenalty = 0;

// OLD DUES COLLECTED THIS MONTH
// Payment was received this month,
// but the installment belongs to an earlier month.
let oldDuesCollectedThisMonth = 0;
let oldDuesPenaltyThisMonth = 0;

for (const payment of payments) {
      if (
        Number(payment.installmentMonth) === selectedMonth &&
        Number(payment.installmentYear) === selectedYear
      ) {
        thisMonthCollection += Number(
          payment.installmentAmount || 0
        );

        thisMonthPenalty += Number(
          payment.penaltyAmount || 0
        );
      }
    }

    // =====================================================
    // TOTAL COLLECTION
    //
    // This remains actual money received.
    // Therefore paymentDate is used here.
    // =====================================================

    let totalCollection = 0;

    for (const payment of payments) {
      const paymentDate = new Date(
        payment.paymentDate
      );

      let includePayment = true;

      if (periodStart) {
        includePayment =
          paymentDate >= periodStart &&
          paymentDate <= periodEnd;
      }

      if (includePayment) {
        totalCollection += Number(
          payment.totalReceived || 0
        );
      }
    }
    // =====================================================
// OLD DUES COLLECTED IN SELECTED/CURRENT MONTH
// =====================================================

for (const payment of payments) {
  const paymentDate = new Date(payment.paymentDate);

  // Check when the money was actually collected
  let collectedInSelectedPeriod = true;

  if (periodStart) {
    collectedInSelectedPeriod =
      paymentDate >= periodStart &&
      paymentDate <= periodEnd;
  } else {
    // No filter = current month
    collectedInSelectedPeriod =
      paymentDate.getFullYear() === selectedYear &&
      paymentDate.getMonth() + 1 === selectedMonth;
  }

  if (!collectedInSelectedPeriod) {
    continue;
  }

  const duePeriod =
    Number(payment.installmentYear) * 12 +
    Number(payment.installmentMonth);

  const selectedPeriod =
    selectedYear * 12 + selectedMonth;

  // Installment belongs to an earlier month
  if (duePeriod < selectedPeriod) {
    oldDuesCollectedThisMonth += Number(
      payment.installmentAmount || 0
    );

    oldDuesPenaltyThisMonth += Number(
      payment.penaltyAmount || 0
    );
  }
}


    // =====================================================
    // PENDING MONTH
    //
    // REQUIRED BUSINESS LOGIC:
    //
    // Monthly Target
    //        -
    // Selected Month EMI Collection
    //        =
    // Pending Month
    //
    // Example:
    //
    // September Target       = ₹50,000
    // September EMI paid     = ₹30,000
    // August EMI paid in Sep = ₹5,000
    //
    // Pending September      = ₹20,000
    //
    // The ₹5,000 August payment does NOT reduce
    // September pending.
    // =====================================================

    const pendingThisMonth = Math.max(
      monthlyTarget - thisMonthCollection,
      0
    );

    // =====================================================
    // PENDING TILL TODAY
    //
    // This is different from Pending Month.
    //
    // Here we calculate installments whose due date
    // has actually arrived.
    // =====================================================

    let pendingTillToday = 0;
    let pendingPenaltyTillToday = 0;

    // =====================================================
    // DETERMINE PENDING CUTOFF
    // =====================================================

    let pendingCutoffDate = today;

    if (periodEnd) {
      pendingCutoffDate =
        periodEnd < today
          ? periodEnd
          : today;
    }

    // =====================================================
    // LOOP MEMBERS
    // =====================================================

    for (const member of activeMembers) {
      const memberId = String(member._id);

      const joiningDate =
        new Date(member.joiningDate);

      // ===================================================
      // NUMBER OF MONTHS PASSED
      // ===================================================

      let monthsPassed =
        (
          pendingCutoffDate.getFullYear() -
          joiningDate.getFullYear()
        ) * 12
        +
        (
          pendingCutoffDate.getMonth() -
          joiningDate.getMonth()
        );

      if (monthsPassed < 0) {
        continue;
      }

      // ===================================================
      // PENDING INSTALLMENTS
      // ===================================================

      for (
        let i = 0;
        i <= monthsPassed &&
        i < member.totalInstallments;
        i++
      ) {
        const installmentNo = i + 1;

        const paymentKey =
          `${memberId}_${installmentNo}`;

        // Already paid
        if (
          paidInstallments.has(paymentKey)
        ) {
          continue;
        }

        // =================================================
        // INSTALLMENT DATE
        // =================================================

        const installmentDate =
          new Date(joiningDate);

        installmentDate.setMonth(
          joiningDate.getMonth() + i
        );

        // =================================================
        // DUE DATE
        // =================================================

        const dueDate =
          new Date(installmentDate);

        dueDate.setDate(
          member.dueDay
        );

        // Future installment
        if (
          dueDate > pendingCutoffDate
        ) {
          continue;
        }

        const installmentAmount =
          Number(
            member.monthlyInstallment || 0
          );

        // =================================================
        // PENALTY
        // =================================================

        let delayMonths = 0;

        if (
          pendingCutoffDate > dueDate
        ) {
          delayMonths =
            (
              pendingCutoffDate.getFullYear() -
              dueDate.getFullYear()
            ) * 12
            +
            (
              pendingCutoffDate.getMonth() -
              dueDate.getMonth()
            );

          if (
            pendingCutoffDate.getDate() >=
            member.dueDay
          ) {
            delayMonths++;
          }

          if (delayMonths < 1) {
            delayMonths = 1;
          }
        }

        const penaltyAmount =
          delayMonths *
          Number(
            member.monthlyPenalty || 0
          );

        // =================================================
        // PENDING TILL TODAY
        // =================================================

        pendingTillToday +=
          installmentAmount +
          penaltyAmount;

        pendingPenaltyTillToday +=
          penaltyAmount;
      }
    }

    // =====================================================
    // RESPONSE
    // =====================================================

    return res.status(200).json({
      success: true,

      filter: {
        year,
        month
      },

      // Expected EMI for selected month
      monthlyTarget,

      // Only EMI belonging to selected month
     thisMonthCollection,

thisMonthPenalty,

oldDuesCollectedThisMonth,

oldDuesPenaltyThisMonth,

totalCollection,

      // Target - selected month's EMI collection
      pendingThisMonth,

      // All unpaid installments that are actually due
      pendingTillToday,

      // Penalty on overdue installments
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
    const { year = "all", month = "all" } = req.query;

    let match = {};
    const today = new Date();

    // Default: current month
    if (year === "all" && month === "all") {
      match.paymentDate = {
        $gte: new Date(
          today.getFullYear(),
          today.getMonth(),
          1,
          0,
          0,
          0,
          0
        ),
        $lte: new Date(
          today.getFullYear(),
          today.getMonth() + 1,
          0,
          23,
          59,
          59,
          999
        )
      };
    }

    // Selected year + selected month
    else if (year !== "all" && month !== "all") {
      match.paymentDate = {
        $gte: new Date(
          Number(year),
          Number(month) - 1,
          1,
          0,
          0,
          0,
          0
        ),
        $lte: new Date(
          Number(year),
          Number(month),
          0,
          23,
          59,
          59,
          999
        )
      };
    }

    // Selected year + all months
    else if (year !== "all" && month === "all") {
      match.paymentDate = {
        $gte: new Date(
          Number(year),
          0,
          1,
          0,
          0,
          0,
          0
        ),
        $lte: new Date(
          Number(year),
          11,
          31,
          23,
          59,
          59,
          999
        )
      };
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