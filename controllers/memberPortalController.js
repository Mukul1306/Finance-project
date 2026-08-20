

const Member = require("../models/Members");
const Society = require("../models/Society");
const Payment = require("../models/Payment");
const Loan = require("../models/Loan");
const LoanPayment = require("../models/LoanPayment");

exports.getDashboard = async (req, res) => {
  try {

    // IMPORTANT:
    // This should come from JWT middleware.
    const memberId = req.memberId;

    const member = await Member.findById(memberId)
      .populate(
        "societyId",
        "societyName durationMonths startDate maxMembers currentMembers status"
      )
      .lean();

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found"
      });
    }

    // ==========================================
    // RECENT PAYMENTS
    // ==========================================

    const recentPayments = await Payment.find({
      memberId: member._id
    })
      .sort({
        paymentDate: -1
      })
      .limit(5)
      .lean();

    // ==========================================
    // NEXT / CURRENT PENDING INSTALLMENT
    // ==========================================

    const nextInstallmentNo =
      (member.paidInstallments || 0) + 1;

    const installmentDate =
      new Date(member.joiningDate);

    installmentDate.setMonth(
      installmentDate.getMonth() +
      (nextInstallmentNo - 1)
    );

    const dueDate =
      new Date(installmentDate);

    dueDate.setDate(
      Number(member.dueDay)
    );

    const today = new Date();

    let penalty = 0;

    const graceEndDate =
      new Date(dueDate);

    graceEndDate.setDate(
      graceEndDate.getDate() +
      Number(member.graceDays || 0)
    );

    if (today > graceEndDate) {

      let delayMonths =
        (
          (today.getFullYear() -
            graceEndDate.getFullYear()) *
          12
        ) +
        (
          today.getMonth() -
          graceEndDate.getMonth()
        ) +
        1;

      if (delayMonths < 1) {
        delayMonths = 1;
      }

      penalty =
        delayMonths *
        Number(member.monthlyPenalty || 0);
    }

    const currentInstallment =
      nextInstallmentNo <=
      member.totalInstallments
        ? {
            installmentNo:
              nextInstallmentNo,

            dueDate,

            amount:
              Number(
                member.monthlyInstallment || 0
              ),

            penalty,

            total:
              Number(
                member.monthlyInstallment || 0
              ) + penalty,

            status:
              today > graceEndDate
                ? "OVERDUE"
                : today > dueDate
                ? "DUE"
                : "UPCOMING"
          }
        : null;

    // ==========================================
    // ACTIVE LOAN
    // ==========================================

    const loan =
      await Loan.findOne({
        memberId: member._id,
        status: {
          $in: ["ACTIVE", "CLOSED"]
        }
      })
      .sort({
        createdAt: -1
      })
      .lean();

    let loanData = null;

    if (loan) {

      const loanPayments =
        await LoanPayment.find({
          loanId: loan._id
        })
          .sort({
            emiNo: 1
          })
          .lean();

      const pendingEmis =
        Math.max(
          0,
          Number(
            loan.totalEmis || 0
          ) -
          Number(
            loan.paidEmis || 0
          )
        );

      loanData = {
        _id: loan._id,

        status:
          loan.status,

        principalAmount:
          loan.principalAmount,

        outstandingPrincipal:
          loan.outstandingPrincipal,

        interestPerHundred:
          loan.interestPerHundred,

        monthlyInterest:
          loan.monthlyInterest,

        totalInterestCollected:
          loan.totalInterestCollected,

        totalPenaltyCollected:
          loan.totalPenaltyCollected,

        totalAmountCollected:
          loan.totalAmountCollected,

        paidEmis:
          loan.paidEmis,

        pendingEmis,

        loanGivenDate:
          loan.loanGivenDate,

        loanEndDate:
          loan.loanEndDate,

        paymentHistory:
          loanPayments
      };
    }

    // ==========================================
    // RESPONSE
    // ==========================================

    return res.json({

      success: true,

      member: {
        _id: member._id,
        memberId: member.memberId,
        name: member.name,
        fatherOrHusbandName:
          member.fatherOrHusbandName,
        mobile: member.mobile,
        email: member.email,
        gender: member.gender,
        dob: member.dob,
        alternateMobile:
          member.alternateMobile,
        address: member.address,
        pinCode: member.pinCode,
        city: member.city,
        district: member.district,
        state: member.state,
        aadhaarNumber:
          member.aadhaarNumber,
        nomineeName:
          member.nomineeName,
        nomineeMobile:
          member.nomineeMobile,
        joiningDate:
          member.joiningDate,
        memberEndDate:
          member.memberEndDate,
        status:
          member.status
      },

      society:
        member.societyId,

      saving: {
        monthlyInstallment:
          member.monthlyInstallment,

        monthlyPenalty:
          member.monthlyPenalty,

        dueDay:
          member.dueDay,

        totalInstallments:
          member.totalInstallments,

        paidInstallments:
          member.paidInstallments,

        pendingInstallments:
          member.pendingInstallments,

        totalPaid:
          member.totalPaid,

        pendingAmount:
          member.pendingAmount,

        currentPenalty:
          member.currentPenalty,

        totalPenaltyPaid:
          member.totalPenaltyPaid,

        lastPaymentDate:
          member.lastPaymentDate
      },

      currentInstallment,

      loan: loanData,

      recentPayments

    });

  } catch (error) {

    console.error(
      "MEMBER DASHBOARD ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// =====================================================
// SOCIETY MEMBER - SAVING PAGE
// =====================================================

exports.getSaving = async (req, res) => {
  try {

    // ================================================
    // LOGGED-IN MEMBER
    // ================================================

    const memberId = req.memberId;

    if (!memberId) {
      return res.status(401).json({
        success: false,
        message:
          "Society member ID missing from authentication"
      });
    }


    // ================================================
    // MEMBER + SOCIETY
    // ================================================

    const member =
      await Member.findById(memberId)
        .populate(
          "societyId",
          "societyName durationMonths startDate maxMembers currentMembers status"
        )
        .lean();


    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Society member not found"
      });
    }


    // ================================================
    // ALL MEMBER PAYMENTS
    // ================================================

    const payments =
      await Payment.find({
        memberId: member._id
      })
        .sort({
          installmentNo: 1
        })
        .lean();


    // ================================================
    // PAID INSTALLMENT NUMBERS
    // ================================================

    const paidInstallments =
      new Set();

    payments.forEach((payment) => {

      if (
        payment.installmentNo !==
          undefined &&
        payment.installmentNo !== null
      ) {

        paidInstallments.add(
          Number(
            payment.installmentNo
          )
        );

      }

    });


    // ================================================
    // BASIC VALUES
    // ================================================

    const totalInstallments =
      Number(
        member.totalInstallments || 0
      );

    const monthlyInstallment =
      Number(
        member.monthlyInstallment || 0
      );

    const monthlyPenalty =
      Number(
        member.monthlyPenalty || 0
      );

    const dueDay =
      Number(
        member.dueDay || 1
      );


    const today =
      new Date();


    // ================================================
    // PENDING INSTALLMENTS
    // ================================================

    const pendingInstallments = [];


    for (
      let installmentNo = 1;
      installmentNo <= totalInstallments;
      installmentNo++
    ) {

      // Already paid
      if (
        paidInstallments.has(
          installmentNo
        )
      ) {
        continue;
      }


      // ----------------------------------------------
      // CALCULATE DUE DATE
      // ----------------------------------------------

      const dueDate =
        new Date(
          member.joiningDate
        );

      dueDate.setHours(
        0,
        0,
        0,
        0
      );


      dueDate.setMonth(
        dueDate.getMonth() +
        (installmentNo - 1)
      );


      dueDate.setDate(
        dueDay
      );


      dueDate.setHours(
        23,
        59,
        59,
        999
      );


      // ----------------------------------------------
      // PENALTY
      // ----------------------------------------------

      let penalty = 0;


      if (
        today > dueDate
      ) {

        let delayedMonths =
          (
            (
              today.getFullYear() -
              dueDate.getFullYear()
            ) * 12
          ) +
          (
            today.getMonth() -
            dueDate.getMonth()
          );


        if (
          today.getDate() >=
          dueDay
        ) {

          delayedMonths += 1;

        }


        if (
          delayedMonths < 1
        ) {

          delayedMonths = 1;

        }


        penalty =
          delayedMonths *
          monthlyPenalty;

      }


      // ----------------------------------------------
      // STATUS
      // ----------------------------------------------

      const status =
        today > dueDate
          ? "OVERDUE"
          : "DUE";


      pendingInstallments.push({

        installmentNo,

        dueDate,

        amount:
          monthlyInstallment,

        penalty,

        total:
          monthlyInstallment +
          penalty,

        status

      });

    }


    // ================================================
    // TOTALS
    // ================================================

    const totalPaid =
      payments.reduce(
        (sum, payment) =>
          sum +
          Number(
            payment.totalReceived || 0
          ),
        0
      );


    const totalPenaltyPaid =
      payments.reduce(
        (sum, payment) =>
          sum +
          Number(
            payment.penaltyAmount || 0
          ),
        0
      );


    const pendingAmount =
      pendingInstallments.reduce(
        (sum, item) =>
          sum +
          Number(
            item.total || 0
          ),
        0
      );


    const pendingPenalty =
      pendingInstallments.reduce(
        (sum, item) =>
          sum +
          Number(
            item.penalty || 0
          ),
        0
      );


    // ================================================
    // RESPONSE
    // ================================================

    return res.status(200).json({

      success: true,

      member: {

        _id:
          member._id,

        memberId:
          member.memberId,

        name:
          member.name,

        mobile:
          member.mobile,

        status:
          member.status

      },


      society:
        member.societyId,


      summary: {

        monthlyInstallment,

        monthlyPenalty,

        dueDay,

        totalInstallments,

        paidInstallments:
          paidInstallments.size,

        pendingInstallments:
          pendingInstallments.length,

        totalPaid,

        pendingAmount,

        totalPenaltyPaid,

        pendingPenalty,

        lastPaymentDate:
          member.lastPaymentDate ||
          null

      },


      pendingInstallments,

      payments

    });

  } catch (error) {

    console.error(
      "SOCIETY MEMBER SAVING ERROR:",
      error
    );

    return res.status(500).json({

      success: false,

      message:
        error.message

    });

  }
};

// =====================================================
// SOCIETY MEMBER - PASSBOOK
// =====================================================

exports.getPassbook = async (req, res) => {
  try {

    const memberId = req.memberId;

    if (!memberId) {
      return res.status(401).json({
        success: false,
        message:
          "Society member ID missing from authentication"
      });
    }

    const member =
      await Member.findById(memberId)
        .populate(
          "societyId",
          "societyName"
        )
        .lean();

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Society member not found"
      });
    }

    // ================================================
    // MEMBER PAYMENTS
    // ================================================

    const payments =
      await Payment.find({
        memberId: member._id
      })
        .sort({
          paymentDate: -1,
          installmentNo: -1
        })
        .lean();

    // ================================================
    // TOTALS
    // ================================================

    let totalReceived = 0;
    let totalPenalty = 0;
    let totalInstallmentAmount = 0;

    payments.forEach((payment) => {

      totalReceived +=
        Number(
          payment.totalReceived || 0
        );

      totalPenalty +=
        Number(
          payment.penaltyAmount || 0
        );

      totalInstallmentAmount +=
        Number(
          payment.installmentAmount || 0
        );

    });

    // ================================================
    // CURRENT MONTH
    // ================================================

    const now = new Date();

    const monthStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );

    const monthEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );

    const currentMonthPayments =
      payments.filter((payment) => {

        if (!payment.paymentDate) {
          return false;
        }

        const paymentDate =
          new Date(
            payment.paymentDate
          );

        return (
          paymentDate >= monthStart &&
          paymentDate <= monthEnd
        );

      });

    const currentMonthCollection =
      currentMonthPayments.reduce(
        (sum, payment) =>
          sum +
          Number(
            payment.totalReceived || 0
          ),
        0
      );

    const currentMonthPenalty =
      currentMonthPayments.reduce(
        (sum, payment) =>
          sum +
          Number(
            payment.penaltyAmount || 0
          ),
        0
      );

    // ================================================
    // FORMAT TRANSACTIONS
    // ================================================

    const transactions =
      payments.map((payment) => ({

        _id:
          payment._id,

        installmentNo:
          payment.installmentNo,

        installmentAmount:
          Number(
            payment.installmentAmount || 0
          ),

        penaltyAmount:
          Number(
            payment.penaltyAmount || 0
          ),

        totalReceived:
          Number(
            payment.totalReceived || 0
          ),

        paymentDate:
          payment.paymentDate || null,

        paymentMode:
          payment.paymentMode || "",

        paymentForMonth:
          payment.paymentForMonth || "",

        paymentForYear:
          payment.paymentForYear || "",

        transactionId:
          payment.transactionId || "",

        remarks:
          payment.remarks || ""

      }));

    // ================================================
    // RESPONSE
    // ================================================

    return res.status(200).json({

      success: true,

      member: {

        _id:
          member._id,

        memberId:
          member.memberId,

        name:
          member.name,

        mobile:
          member.mobile

      },

      society:
        member.societyId,

      summary: {

        totalTransactions:
          payments.length,

        totalInstallmentAmount,

        totalPenalty,

        totalReceived,

        currentMonthCollection,

        currentMonthPenalty

      },

      transactions

    });

  } catch (error) {

    console.error(
      "SOCIETY MEMBER PASSBOOK ERROR:",
      error
    );

    return res.status(500).json({

      success: false,

      message:
        error.message

    });

  }
};
