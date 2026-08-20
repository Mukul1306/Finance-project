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