const Loan = require("../models/Loan");
const Member = require("../models/Members");
const LoanPayment = require("../models/LoanPayment");
const Customer = require("../models/Customer");

/**
 * 
 * Get active members of a society
 */
exports.getMembersBySociety = async (req, res) => {
  try {
    const { societyId } = req.params;

    const members = await Member.find({
      societyId,
      status: {
        $in: ["ACTIVE", "DUE", "OVERDUE"]
      }
    }).select(
      "name fatherOrHusbandName mobile pendingInstallments memberEndDate"
    );

    res.status(200).json({
      success: true,
      count: members.length,
      members,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get single member details
 */
exports.getMemberDetails = async (req, res) => {
  try {
    const { memberId } = req.params;

    const member = await Member.findById(memberId);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    const activeLoan = await Loan.findOne({
      memberId,
      status: "ACTIVE",
    });

    res.status(200).json({
      success: true,
      member,
      hasActiveLoan: !!activeLoan,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Create Loan
 */
exports.createLoan = async (req, res) => {

  try {

    const {

      borrowerType,

      societyId,

      memberId,

      // Customer Fields
      name,
      fatherOrHusbandName,
      mobile,
      alternateMobile,
      gender,
      dob,
      aadhaarNumber,
      panNumber,
      occupation,
      address,
      city,
      state,
      pinCode,
      photo,
      guarantorName,
      guarantorMobile,
      remarks,

      // Loan Fields
      loanAmount,
      interestPerHundred,
      loanGivenDate,
      emiDueDay,
      emiPenaltyPercentage

    } = req.body;

    let finalMemberId = null;
    let finalCustomerId = null;
    let loanEndDate = null;

    // ===========================
    // MEMBER LOAN
    // ===========================

    if (borrowerType === "MEMBER") {

      const member = await Member.findById(memberId);

      if (!member) {

        return res.status(404).json({

          success:false,

          message:"Member not found"

        });

      }

      const existingLoan = await Loan.findOne({

        memberId,

        status:"ACTIVE"

      });

      if(existingLoan){

        return res.status(400).json({

          success:false,

          message:"Member already has an active loan"

        });

      }

      finalMemberId = member._id;

      loanEndDate = member.memberEndDate;

    }

    // ===========================
    // CUSTOMER LOAN
    // ===========================

    else {

      const customer = await Customer.create({

        name,
        fatherOrHusbandName,
        mobile,
        alternateMobile,
        gender,
        dob,
        aadhaarNumber,
        panNumber,
        occupation,
        address,
        city,
        state,
        pinCode,
        photo,
        guarantorName,
        guarantorMobile,
        remarks

      });

      finalCustomerId = customer._id;

      // Default Loan End Date
      loanEndDate = new Date(loanGivenDate);

      loanEndDate.setMonth(

        loanEndDate.getMonth()+12

      );

    }

    // ===========================
    // Monthly Interest
    // ===========================

    const monthlyInterest =

      (Number(loanAmount)/100)

      *

      Number(interestPerHundred);

    // ===========================
    // Create Loan
    // ===========================

    const loan = await Loan.create({

      borrowerType,

      societyId,

      memberId:finalMemberId,

      customerId:finalCustomerId,

      principalAmount:Number(loanAmount),

      interestPerHundred:Number(

        interestPerHundred

      ),

      monthlyInterest,

      emiDueDay:Number(

        emiDueDay

      ),

      emiPenaltyPercentage:Number(

        emiPenaltyPercentage

      ),

      loanGivenDate,

      loanEndDate,

      totalInterestCollected:0,

      totalPenaltyCollected:0,

      totalAmountCollected:0,

      paidEmis:0,

      pendingEmis:0

    });

    res.status(201).json({

      success:true,

      message:"Loan Created Successfully",

      loan

    });

  }

  catch(error){

    console.log(error);

    res.status(500).json({

      success:false,

      message:error.message

    });

  }

};

/**
 * Get all loans
 */
exports.getAllLoans = async (req, res) => {
  try {

    const loans = await Loan.find()
      .populate(
        "memberId",
        "name mobile"
      )
      .populate(
        "societyId",
        "societyName"
      )
      .sort({
        createdAt: -1
      });
const updatedLoans = loans.map((loan) => {

  const data = loan.toObject();

  const today = new Date();

  const loanStartDate = new Date(data.loanGivenDate);

  const loanEndDate = new Date(data.loanEndDate);

  const totalMonths =
    (loanEndDate.getFullYear() - loanStartDate.getFullYear()) * 12 +
    (loanEndDate.getMonth() - loanStartDate.getMonth()) + 1;

  const monthsPassed =
    (today.getFullYear() - loanStartDate.getFullYear()) * 12 +
    (today.getMonth() - loanStartDate.getMonth());

  const pendingEmis = Math.max(
    0,
    Math.min(totalMonths, monthsPassed + 1) - (data.paidEmis || 0)
  );

  data.pendingEmis = pendingEmis;

  data.pendingInterest =
    pendingEmis * (data.monthlyInterest || 0);

  data.outstandingAmount =
    (data.principalAmount || 0) +
    data.pendingInterest;

  data.totalEmis = totalMonths;

  return data;

});
    res.status(200).json({

      success: true,

      count: updatedLoans.length,

      loans: updatedLoans

    });

  } catch (error) {

    console.log(error);

    res.status(500).json({

      success: false,

      message: error.message

    });

  }
};
/**
 * Get single loan
 */
exports.getLoanById = async (req, res) => {
  try {
    const loan = await Loan.findById(
      req.params.id
    )
      .populate("memberId")
      .populate("societyId");

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: "Loan not found",
      });
    }

    res.status(200).json({
      success: true,
      loan,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Close Loan
 */
exports.closeLoan = async (req, res) => {
  try {
    const loan = await Loan.findById(
      req.params.loanId
    );

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: "Loan not found",
      });
    }
loan.status = "CLOSED";
loan.closedDate = new Date();

loan.principalReturned = loan.principalAmount;
loan.principalAmount = 0;

    await loan.save();

    res.status(200).json({
      success: true,
      message:
        "Loan closed successfully",
      loan,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};




exports.getPendingEmis = async (req, res) => {

  try {

    const { loanId } = req.params;

    const loan = await Loan.findById(loanId)
      .populate("memberId", "name memberId");

    if (!loan) {

      return res.status(404).json({

        success: false,

        message: "Loan not found"

      });

    }

    const today = new Date();

    const loanStartDate = new Date(loan.loanGivenDate);

    const loanEndDate = new Date(loan.loanEndDate);

    const totalMonths =
      (loanEndDate.getFullYear() - loanStartDate.getFullYear()) * 12 +
      (loanEndDate.getMonth() - loanStartDate.getMonth()) + 1;

    const monthsPassed =
      (today.getFullYear() - loanStartDate.getFullYear()) * 12 +
      (today.getMonth() - loanStartDate.getMonth());

    const pendingEmis = [];

    for (

      let i = loan.paidEmis;

      i <= monthsPassed && i < totalMonths;

      i++

    ) {

      const emiDate = new Date(loanStartDate);

      emiDate.setMonth(
        loanStartDate.getMonth() + i
      );

      const dueDate = new Date(emiDate);

      dueDate.setDate(loan.emiDueDay);

      const month = dueDate.toLocaleString(
        "en-IN",
        {
          month: "long"
        }
      );

      const year = dueDate.getFullYear();

      let delayMonths = 0;

      if (today > dueDate) {

        delayMonths =
          (today.getFullYear() - dueDate.getFullYear()) * 12 +
          (today.getMonth() - dueDate.getMonth());

        if (today.getDate() < loan.emiDueDay) {

          delayMonths--;

        }

        if (delayMonths < 0) {

          delayMonths = 0;

        }

      }

      const penaltyAmount =
        (
          loan.monthlyInterest *
          loan.emiPenaltyPercentage *
          delayMonths
        ) / 100;

      const total =
        loan.monthlyInterest +
        penaltyAmount;

      pendingEmis.push({

        emiNo: i + 1,

        month,

        year,

        dueDate,

        interestAmount: loan.monthlyInterest,

        penaltyPercentage:
          loan.emiPenaltyPercentage,

        delayMonths,

        penaltyAmount,

        total

      });

    }

    res.status(200).json({

      success: true,

      member: loan.memberId,

      loanId: loan._id,

      monthlyInterest:
        loan.monthlyInterest,

      pendingEmis

    });

  }

  catch (error) {

    console.log(error);

    res.status(500).json({

      success: false,

      message: error.message

    });

  }

};



exports.collectLoanEmi = async (req, res) => {

  try {

    const {

      loanId,

      emiNo,

      month,

      year,

      dueDate,

      interestAmount,

      penaltyAmount,

      paymentMode,

      remarks

    } = req.body;

    const loan = await Loan.findById(loanId);

    if (!loan) {

      return res.status(404).json({

        success:false,

        message:"Loan not found"

      });

    }

    const alreadyPaid = await LoanPayment.findOne({

      loanId,

      emiNo

    });

    if(alreadyPaid){

      return res.status(400).json({

        success:false,

        message:"EMI already collected"

      });

    }

    const totalReceived =
      Number(interestAmount) +
      Number(penaltyAmount);

    await LoanPayment.create({

      loanId,

      memberId:loan.memberId,

      emiNo,

      month,

      year,

      dueDate,

      interestAmount,

      penaltyAmount,

      totalReceived,

      paymentMode,

      remarks

    });

    loan.paidEmis += 1;

    loan.lastEmiDate = new Date();

    loan.totalInterestCollected += Number(interestAmount);

    loan.totalPenaltyCollected += Number(penaltyAmount);

    loan.totalAmountCollected += totalReceived;

    await loan.save();

    res.json({

      success:true,

      message:"EMI Collected Successfully"

    });

  }

  catch(error){

    res.status(500).json({

      success:false,

      message:error.message

    });

  }

};


exports.loanDashboard = async (req, res) => {

  try {

    const today = new Date();

    // ===========================
    // FIRST DAY OF CURRENT MONTH
    // ===========================

    const firstDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      1
    );

    // ===========================
    // ACTIVE / CLOSED LOANS
    // ===========================

    const activeLoans =
      await Loan.countDocuments({
        status: "ACTIVE"
      });

    const closedLoans =
      await Loan.countDocuments({
        status: "CLOSED"
      });

    // ===========================
    // ACTIVE LOANS LIST
    // ===========================

    const loans = await Loan.find({
      status: "ACTIVE"
    });

    let loanDistributed = 0;

    let outstandingAmount = 0;

    let pendingInterest = 0;

    for (const loan of loans) {

      loanDistributed +=
        loan.principalAmount || 0;

      outstandingAmount +=
        loan.principalAmount || 0;

      const start = new Date(
        loan.loanGivenDate
      );

      const monthsPassed =
        (today.getFullYear() - start.getFullYear()) * 12 +
        (today.getMonth() - start.getMonth());

      const pendingMonths =
        Math.max(
          0,
          monthsPassed - loan.paidEmis
        );

      pendingInterest +=
        pendingMonths *
        loan.monthlyInterest;

      outstandingAmount +=
        pendingMonths *
        loan.monthlyInterest;

    }

    // ===========================
    // MONTHLY INTEREST COLLECTION
    // ===========================

    const monthlyCollection =
      await LoanPayment.aggregate([

        {
          $match: {

            createdAt: {

              $gte: firstDay,

              $lte: today

            }

          }

        },

        {

          $group: {

            _id: null,

            total: {

              $sum: "$interestAmount"

            }

          }

        }

      ]);

    // ===========================
    // RESPONSE
    // ===========================

    res.json({

      success: true,

      dashboard: {

        loanDistributed,

        outstandingAmount,

        monthlyInterestCollection:
          monthlyCollection[0]?.total || 0,

        pendingInterest,

        activeLoans,

        closedLoans

      }

    });

  }

  catch (error) {

    res.status(500).json({

      success: false,

      message: error.message

    });

  }

};




exports.getLoanHistory = async (req, res) => {

  try {

    const { loanId } = req.params;

    const payments = await LoanPayment.find({ loanId })
      .sort({ emiNo: 1 });

    res.status(200).json({

      success: true,

      count: payments.length,

      payments

    });

  } catch (error) {

    res.status(500).json({

      success: false,

      message: error.message

    });

  }

};
