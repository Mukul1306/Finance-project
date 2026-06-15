const DailyLoan = require("../../models/daily/DailyLoan");
const LoanCollection = require("../../models/daily/LoanCollection");
const DailyMember = require("../../models/daily/DailyMember");
const AreaGroup = require("../../models/daily/AreaGroup");

// ==========================================
// 1. CREATE LOAN ENTRY
// ==========================================
exports.createLoan = async (req, res) => {
  try {
    const {
      member,
      loanAmount,
      interestRate,
      loanType,
      durationMonths,
      durationDays,
      guarantor1Name,
      guarantor1Father,
      guarantor1Mobile,
      guarantor1ShapathPatra,
      guarantor2Name,
      guarantor2Father,
      guarantor2Mobile,
      guarantor2ShapathPatra,
      panNumber,
      aadhaarNumber,
      photoSubmitted,
      securityCheque1,
      securityCheque2,
      remarks
    } = req.body;

    // FIX: Must fetch member profile FIRST before mapping fields to DailyLoan.create()
    const memberData = await DailyMember.findById(member).populate(
      "areaGroup",
      "areaName"
    );

    if (!memberData) {
      return res.status(404).json({
        success: false,
        message: "Member Not Found"
      });
    }

    let totalInterest = 0;
    let totalPayable = 0;
    let emiAmount = 0;

    // Calculate core interests base
  const duration =
loanType === "DAILY"
? Math.ceil(durationDays / 30)
: durationMonths;

totalInterest =
(Number(loanAmount) *
Number(interestRate) *
Number(duration))
/100;
    totalPayable = loanAmount + totalInterest;

    // Calculate variations based on loan configuration strategy
if(loanType === "DAILY"){

  totalInterest =
  (Number(loanAmount) *
   Number(interestRate))
   / 100;

  totalPayable =
  Number(loanAmount) +
  totalInterest;

  emiAmount =
  Math.ceil(
    totalPayable /
    Number(durationDays)
  );

}
   if (loanType === "MONTHLY") {




      const amount = Number(loanAmount);
  const rate = Number(interestRate);
  const months = Number(durationMonths);
  totalInterest =
  (amount * rate * months) / 100;

  totalPayable =
  amount + totalInterest;

  emiAmount =
  Math.ceil(totalPayable / months);
  

}
    if (loanType === "FIXED") {

  const amount = Number(loanAmount);
  const rate = Number(interestRate);
  const months = Number(durationMonths);

  const r = (rate / 12) / 100;

  emiAmount = Math.ceil(
    (amount * r * Math.pow(1 + r, months))
    /
    (Math.pow(1 + r, months) - 1)
  );

  totalPayable = emiAmount * months;
  totalInterest = totalPayable - amount;
}
    // Save consolidated record to database cluster
    const loan = await DailyLoan.create({
      member,
      borrowerName: memberData.memberName,
      fatherName: memberData.fatherName,
      mobile: memberData.mobile,
      address: memberData.residentialAddress,
      areaName: memberData.areaGroup?.areaName,
      loanAmount,
      loanType,
      interestRate,
      durationMonths,
      durationDays,
      totalInterest,
      totalPayable,
      emiAmount,
      outstandingAmount: totalPayable,
      guarantor1Name,
      guarantor1Father,
      guarantor1Mobile,
      guarantor1ShapathPatra,
      guarantor2Name,
      guarantor2Father,
      guarantor2Mobile,
      guarantor2ShapathPatra,
      panNumber,
      aadhaarNumber,
      photoSubmitted,
      securityCheque1,
      securityCheque2,
      remarks
    });

    res.status(201).json({
      success: true,
      loan
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==========================================
// 2. GET ALL LOANS
// ==========================================
exports.getLoans = async (req, res) => {
  try {
    const loans = await DailyLoan.find()
      .populate("member", "memberName mobile")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      loans
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==========================================
// 3. GET SINGLE LOAN BY ID
// ==========================================
exports.getLoan = async (req, res) => {
  try {
    const loan = await DailyLoan.findById(req.params.id).populate("member");

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: "Loan record not found"
      });
    }

    res.json({
      success: true,
      loan
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// ==========================================
// 4. COLLECT EMI PAYMENT
// ==========================================
exports.collectEmi = async (req, res) => {
  try {
    const {
      loanId,
      amount,
      collectorType,
      collectorId,
      paymentMethod
    } = req.body;

    const loan = await DailyLoan.findById(loanId);

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: "Loan Not Found"
      });
    }

    // Initialize transaction statement entry
  const lastCollection =
await LoanCollection.findOne({
  loan: loanId
}).sort({
  installmentNo: -1
});

const installmentNo =
lastCollection
  ? lastCollection.installmentNo + 1
  : 1;

await LoanCollection.create({
  loan: loan._id,
  member: loan.member,

  installmentNo,

  amount,
  penalty: 0,
  totalAmount: amount,

  collectorType,
  collectorId,
  paymentMethod
});

    // Update financial limits balances
loan.totalPaid += Number(amount);
loan.outstandingAmount -= Number(amount);

if(loan.outstandingAmount <= 0){

  loan.status = "CLOSED";
  loan.outstandingAmount = 0;

}else{

  loan.status = "ACTIVE";

}

    await loan.save();

    res.json({
      success: true,
      message: "EMI Collected"
    });
  } catch (error) {

  console.log("========== EMI ERROR ==========");
  console.log(error);
  console.log(error.message);

  res.status(500).json({
    success:false,
    message:error.message
  });

}
};

// ==========================================
// 5. GET REGIONAL AREA GROUPS
// ==========================================
exports.getAreas = async (req, res) => {
  try {
    const areas = await AreaGroup.find().sort({ areaName: 1 });

    res.json({
      success: true,
      areas
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==========================================
// 6. GET DISTRICT MEMBERS BY AREA ID
// ==========================================
exports.getMembersByArea = async (req, res) => {
  try {
    const members = await DailyMember.find({
      areaGroup: req.params.areaId
    }).select("memberName mobile");

    res.json({
      success: true,
      members
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==========================================
// 7. GET SINGLE MEMBER PROFILE BY ID
// ==========================================
exports.getMember = async (req, res) => {
  try {
    const member = await DailyMember.findById(req.params.id).populate(
      "areaGroup",
      "areaName"
    );

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member configuration profile not found"
      });
    }

    res.json({
      success: true,
      member
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


exports.getLoanDetails =
async (req,res)=>{

const loan =
await DailyLoan.findById(
req.params.id
);

if(!loan){
  return res.status(404).json({
    success:false,
    message:"Loan not found"
  });
}
const collections =
await LoanCollection.find({
loan:loan._id
}).sort({
installmentNo:1
});

const totalInstallments =
loan.loanType === "DAILY"
? loan.durationDays
: loan.durationMonths;

const paidInstallments =
collections.length;

const pendingInstallments =
totalInstallments -
paidInstallments;

res.json({

loan,

totalInstallments,

paidInstallments,

pendingInstallments,

collections

});

};


exports.closeLoan = async (req, res) => {
  try {

    const loan = await DailyLoan.findById(
      req.params.id
    );

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: "Loan Not Found"
      });
    }

    if (loan.outstandingAmount > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot close loan. Outstanding amount remaining."
      });
    }

    loan.status = "CLOSED";

    await loan.save();

    res.json({
      success: true,
      message: "Loan Closed Successfully"
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }
};