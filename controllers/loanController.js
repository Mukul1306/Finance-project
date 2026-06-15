const Loan = require("../models/Loan");
const Member = require("../models/Members");

/**
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
      societyId,
      memberId,
      loanAmount,
      interestPerHundred,
      loanGivenDate,
    } = req.body;

    if (
      !societyId ||
      !memberId ||
      !loanAmount ||
      !interestPerHundred ||
      !loanGivenDate
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const member = await Member.findById(memberId);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    const existingLoan = await Loan.findOne({
      memberId,
      status: "ACTIVE",
    });

    if (existingLoan) {
      return res.status(400).json({
        success: false,
        message:
          "Member already has an active loan",
      });
    }

    const monthlyInterest =
      (Number(loanAmount) / 100) *
      Number(interestPerHundred);

    const loan = await Loan.create({
      societyId,
      memberId,

      principalAmount: Number(loanAmount),

      interestPerHundred:
        Number(interestPerHundred),

      monthlyInterest,

      loanGivenDate,

      loanEndDate:
        member.memberEndDate,
    });

    res.status(201).json({
      success: true,
      message: "Loan created successfully",
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
        createdAt: -1,
      });

    res.status(200).json({
      success: true,
      count: loans.length,
      loans,
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




