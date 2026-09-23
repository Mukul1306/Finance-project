const mongoose = require("mongoose");
const DailyLoan = require("../../models/daily/DailyLoan");
const DailyMember = require("../../models/daily/DailyMember");
const DailySaving = require("../../models/daily/DailySaving");
const LoanCollection = require("../../models/daily/LoanCollection");
const AreaGroup = require("../../models/daily/AreaGroup");
const Agent = require("../../models/daily/Agent");
const DailyLoanRequest = require("../../models/daily/DailyLoanRequest");


// ==========================================
// LOAN CALCULATION HELPER
// ==========================================

// ==========================================
// LOAN CALCULATION HELPER
// ONE SOURCE OF TRUTH
// ==========================================

const calculateLoanData = (
    loanAmount,
    interestRate,
    loanTenureMonths,
    loanType,
    durationDays,
    durationWeeks,
    durationMonths
) => {

    loanAmount = Number(loanAmount || 0);
    interestRate = Number(interestRate || 0);
    loanTenureMonths = Number(loanTenureMonths || 0);

    durationDays = Number(durationDays || 0);
    durationWeeks = Number(durationWeeks || 0);
    durationMonths = Number(durationMonths || 0);

    let interestMonths = 0;
    let totalInstallments = 1;

    // ======================================
    // DETERMINE ACTUAL INTEREST TENURE
    // ======================================

    switch (loanType) {

        case "DAILY":

            // Example:
            // 100 days = 100 / 30 months
            interestMonths = durationDays / 30;

            totalInstallments = durationDays;

            break;


case "WEEKLY":

    // Weekly loan:
    // Interest is calculated according to
    // Loan Tenure (Months), same as Admin Create Loan.

    interestMonths = loanTenureMonths;

    // Number of weekly EMIs
    totalInstallments = durationWeeks;

    break;


        case "MONTHLY":

            interestMonths = durationMonths;

            totalInstallments = durationMonths;

            break;


        case "FIXED":

            interestMonths = loanTenureMonths;

            totalInstallments = loanTenureMonths;

            break;


        default:

            throw new Error("Invalid Loan Type");
    }


    // ======================================
    // TOTAL INTEREST
    // ======================================

    const totalInterest =
        (loanAmount * interestRate * interestMonths) / 100;


    // ======================================
    // TOTAL PAYABLE
    // ======================================

    const totalPayable =
        loanAmount + totalInterest;


    // ======================================
    // EMI
    // ======================================

    let emiAmount = 0;


    if (loanType === "FIXED") {

        // Fixed = monthly interest only
        emiAmount =
            totalInterest / totalInstallments;

    }  else {

    emiAmount = Math.ceil(
        totalPayable / totalInstallments
    );

  }


    return {

        totalInterest: Number(totalInterest.toFixed(2)),

        totalPayable: Number(totalPayable.toFixed(2)),

        emiAmount: emiAmount,
        totalInstallments

    };

};

// ==========================================
// MONTHLY / FIXED PENALTY HELPER
// ONE PENALTY PER MONTH
// ==========================================
const calculateMonthlyFixedPenalty = ({
    dueDate,
    today,
    gracePeriod,
    penaltyType,
    penaltyValue,
    penaltyBase
}) => {

    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);

    const current = new Date(today);
    current.setHours(0, 0, 0, 0);

    const grace = Number(gracePeriod || 0);

    // ==========================================
    // PENALTY START DATE
    // ==========================================

    const penaltyStartDate = new Date(due);

    penaltyStartDate.setDate(
        penaltyStartDate.getDate() + grace + 1
    );

    penaltyStartDate.setHours(0, 0, 0, 0);

    // Still inside grace period
    if (current < penaltyStartDate) {
        return 0;
    }

    // ==========================================
    // ONE PENALTY AMOUNT
    // ==========================================

    const monthlyPenalty =
        penaltyType === "PERCENTAGE"
            ? Math.round(
                (Number(penaltyBase) *
                 Number(penaltyValue)) / 100
            )
            : Number(penaltyValue);

    // ==========================================
    // COUNT PENALTY MONTHS
    // ==========================================
    //
    // Example:
    //
    // Due       = 3 July
    // Grace     = 3 days
    // Start     = 7 July
    //
    // Today 10 July
    // July penalty = 1
    //
    // Today 10 August
    // July + August = 2
    //
    // Today 10 September
    // July + August + September = 3
    //
    // ==========================================

    const penaltyMonths =
        (
            (current.getFullYear() -
                penaltyStartDate.getFullYear()) * 12
        ) +
        (
            current.getMonth() -
            penaltyStartDate.getMonth()
        ) +
        1;

    return monthlyPenalty * penaltyMonths;
};


// ==========================================
// CALCULATE LOAN API
// ==========================================
exports.calculateLoan = async (req, res) => {

try{

const{

loanAmount,
interestRate,
loanTenureMonths,
loanType,
durationDays,
durationWeeks,
durationMonths

}=req.body;

const result =
calculateLoanData(

loanAmount,
interestRate,
loanTenureMonths,
loanType,
durationDays,
durationWeeks,
durationMonths

);

return res.json({

success:true,

...result

});

}catch(error){

return res.status(500).json({

success:false,

message:error.message

});

}

};






exports.createLoan = async(req,res)=>{

try{

const{

member,

loanAmount,
  loanTenureMonths,
interestRate,

loanType,

loanDate,

durationDays,

durationWeeks,

durationMonths,

gracePeriod,

penaltyType,

penaltyValue,

nomineeName,

nomineeMobile,

passportPhotoSubmitted,

aadhaarNumber,

aadhaarSubmitted,

panNumber,

panSubmitted,

cheque1Number,

cheque2Number,

cheque1Submitted,

cheque2Submitted,

stampPaperSubmitted,

securityType,

securityDetails,

remarks,

guarantor1Name,

guarantor1FatherName,

guarantor1Gender,

guarantor1Dob,

guarantor1Mobile,

guarantor1AlternateMobile,

guarantor1Email,

guarantor1Address,

guarantor1City,

guarantor1District,

guarantor1State,

guarantor1Pincode,

guarantor1PhotoSubmitted,

guarantor1AadhaarNumber,

guarantor1AadhaarSubmitted,

guarantor1PanNumber,

guarantor1PanSubmitted,

guarantor1Cheque1Number,

guarantor1Cheque2Number,

guarantor1Cheque1Submitted,

guarantor1Cheque2Submitted,

guarantor1StampPaperSubmitted,

guarantor1SecurityType,

guarantor1SecurityDetails,

guarantor2Name,

guarantor2FatherName,

guarantor2Gender,

guarantor2Dob,

guarantor2Mobile,

guarantor2AlternateMobile,

guarantor2Email,

guarantor2Address,

guarantor2City,

guarantor2District,

guarantor2State,

guarantor2Pincode,

guarantor2PhotoSubmitted,

guarantor2AadhaarNumber,

guarantor2AadhaarSubmitted,

guarantor2PanNumber,

guarantor2PanSubmitted,

guarantor2Cheque1Number,

guarantor2Cheque2Number,

guarantor2Cheque1Submitted,

guarantor2Cheque2Submitted,

guarantor2StampPaperSubmitted,

guarantor2SecurityType,

guarantor2SecurityDetails

}=req.body;


// ==========================================
// MEMBER VALIDATION
// ==========================================

const memberData = await DailyMember.findById(member)
    .populate("areaGroup", "areaName")
    .populate("assignedAgent", "name mobile");

if (!memberData) {
    return res.status(404).json({
        success: false,
        message: "Member Not Found"
    });
}

if (!memberData.areaGroup) {
    return res.status(400).json({
        success: false,
        message: "Member does not have an Area assigned"
    });
}

if (!memberData.assignedAgent) {
    return res.status(400).json({
        success: false,
        message: "Member does not have an Agent assigned"
    });
}

// ==========================================
// VALIDATION
// ==========================================

if(loanType==="DAILY" && Number(durationDays)<=0){

return res.status(400).json({

success:false,

message:"Invalid Daily Duration"

});

}

if(loanType==="WEEKLY" && Number(durationWeeks)<=0){

return res.status(400).json({

success:false,

message:"Invalid Weekly Duration"

});

}

if(loanType==="MONTHLY" && Number(durationMonths)<=0){

return res.status(400).json({

success:false,

message:"Invalid Monthly Duration"

});

}

// ==========================================
// GENERATE LOAN NUMBER
// ==========================================

const lastLoan = await DailyLoan
.findOne()
.sort({ createdAt: -1 });

let loanNumber = "LN000001";

if (lastLoan && lastLoan.loanNumber) {

    const lastNumber = parseInt(
        lastLoan.loanNumber.replace("LN", "")
    );

    loanNumber =
        "LN" +
        String(lastNumber + 1).padStart(6, "0");
}



// ==========================================
// CALCULATE LOAN
// ==========================================

const{

totalInterest,

totalPayable,

emiAmount,

totalInstallments,


}=calculateLoanData(
    loanAmount,
    interestRate,
    loanTenureMonths,
    loanType,
    durationDays,
    durationWeeks,
    durationMonths
);


// ==========================================
// END DATE
// ==========================================

let endDate =
new Date(loanDate);

if(loanType==="DAILY"){

endDate.setDate(

endDate.getDate()+
Number(durationDays)

);

}

if(loanType==="WEEKLY"){

endDate.setDate(

endDate.getDate()+
(Number(durationWeeks)*7)

);

}

if(loanType==="MONTHLY"){
    endDate.setMonth(
        endDate.getMonth()+Number(durationMonths)
    );
}

if(loanType==="FIXED"){
    endDate.setMonth(
        endDate.getMonth()+Number(loanTenureMonths)
    );
}





// ==========================================
// CREATE LOAN
// ==========================================

const loan =
await DailyLoan.create({

member:memberData._id,

memberId:memberData.memberId,

borrowerName:memberData.memberName,

fatherName:memberData.fatherName,

gender:memberData.gender,

dob:memberData.dob,

mobile:memberData.mobile,

alternateMobile:
memberData.alternateMobile,

email:memberData.email,

address:
memberData.residentialAddress,

city:memberData.city,

district:memberData.district,

state:memberData.state,

pincode:memberData.pincode,

areaName: memberData.areaGroup.areaName,

assignedAgent: memberData.assignedAgent._id,

loanNumber,

loanTenureMonths:
Number(loanTenureMonths),

loanAmount:Number(loanAmount),

interestRate:Number(interestRate),

loanType,

loanDate,

durationDays:Number(durationDays),

durationWeeks:Number(durationWeeks),

durationMonths:Number(durationMonths),

startDate:new Date(loanDate),

endDate,

totalInterest,

totalPayable,

emiAmount,

totalPaid:0,

outstandingAmount:
loanType === "FIXED"
    ? Number(loanAmount)
    : totalPayable,

completedInstallments:0,

pendingInstallments:
totalInstallments,

lastInstallmentNo:0,

gracePeriod:Number(gracePeriod),

penaltyType,

penaltyValue:Number(penaltyValue),

status:"ACTIVE",
// ==========================================
// NOMINEE
// ==========================================

nomineeName,

nomineeMobile,

// ==========================================
// BORROWER DOCUMENTS
// ==========================================

passportPhotoSubmitted,

aadhaarNumber,

aadhaarSubmitted,

panNumber,

panSubmitted,

cheque1Number,

cheque2Number,

cheque1Submitted,

cheque2Submitted,

stampPaperSubmitted,

// ==========================================
// SECURITY
// ==========================================

securityType,

securityDetails,

// ==========================================
// GUARANTOR 1
// ==========================================

guarantor1Name,

guarantor1FatherName,

guarantor1Gender,

guarantor1Dob,

guarantor1Mobile,

guarantor1AlternateMobile,

guarantor1Email,

guarantor1Address,

guarantor1City,

guarantor1District,

guarantor1State,

guarantor1Pincode,

guarantor1PhotoSubmitted,

guarantor1AadhaarNumber,

guarantor1AadhaarSubmitted,

guarantor1PanNumber,

guarantor1PanSubmitted,

guarantor1Cheque1Number,

guarantor1Cheque2Number,

guarantor1Cheque1Submitted,

guarantor1Cheque2Submitted,

guarantor1StampPaperSubmitted,

guarantor1SecurityType,

guarantor1SecurityDetails,

// ==========================================
// GUARANTOR 2
// ==========================================

guarantor2Name,

guarantor2FatherName,

guarantor2Gender,

guarantor2Dob,

guarantor2Mobile,

guarantor2AlternateMobile,

guarantor2Email,

guarantor2Address,

guarantor2City,

guarantor2District,

guarantor2State,

guarantor2Pincode,

guarantor2PhotoSubmitted,

guarantor2AadhaarNumber,

guarantor2AadhaarSubmitted,

guarantor2PanNumber,

guarantor2PanSubmitted,

guarantor2Cheque1Number,

guarantor2Cheque2Number,

guarantor2Cheque1Submitted,

guarantor2Cheque2Submitted,

guarantor2StampPaperSubmitted,

guarantor2SecurityType,

guarantor2SecurityDetails,

// ==========================================
// REMARKS
// ==========================================

remarks

});


// ==========================================
// RESPONSE
// ==========================================

res.status(201).json({

success:true,

message:"Loan Created Successfully",

loan

});

}catch(error){

console.log(error);

res.status(500).json({

success:false,

message:error.message

});

}

};
// ==========================================
// GET ALL LOANS
// ==========================================
// ==========================================
// GET ALL LOANS - OPTIMIZED
// ==========================================
exports.getLoans = async (req, res) => {

  try {

    // ==========================================
    // 1. GET ALL LOANS
    // ==========================================

const [loans, totalLoans] = await Promise.all([
  DailyLoan.find()
    .populate("member", "memberId memberName mobile")
    .populate("assignedAgent", "name mobile")
    .sort({ createdAt: -1 })
    .lean(),

  DailyLoan.countDocuments()
]);


    // No loans
    if (!loans.length) {

  return res.json({
  success: true,
  loans: updatedLoans,
  total: totalLoans
});

    }


    // ==========================================
    // 2. GET ALL COLLECTIONS IN ONE QUERY
    // ==========================================

    const loanIds = loans.map(
      loan => loan._id
    );


    const collections = await LoanCollection.find({

      loan: {
        $in: loanIds
      }

    })
      .select(
        "loan installmentNo"
      )
      .lean();


    // ==========================================
    // 3. GROUP COLLECTIONS BY LOAN
    // ==========================================

    const collectionsByLoan = new Map();


    for (const collection of collections) {

      const loanId =
        collection.loan.toString();


      if (!collectionsByLoan.has(loanId)) {

        collectionsByLoan.set(
          loanId,
          new Set()
        );

      }


      collectionsByLoan
        .get(loanId)
        .add(
          Number(collection.installmentNo)
        );

    }


    // ==========================================
    // 4. TODAY
    // ==========================================

    const today = new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );


    // ==========================================
    // 5. CALCULATE LOANS IN MEMORY
    // ==========================================

    const updatedLoans = loans.map(
      loan => {

        const loanId =
          loan._id.toString();


        // Paid installments
        const paidInstallments =
          collectionsByLoan.get(loanId) ||
          new Set();


        // ==========================================
        // TOTAL INSTALLMENTS
        // ==========================================

        let totalInstallments = 1;


        if (loan.loanType === "DAILY") {

          totalInstallments =
            Number(loan.durationDays || 0);

        }

        else if (loan.loanType === "WEEKLY") {

          totalInstallments =
            Number(loan.durationWeeks || 0);

        }

        else if (loan.loanType === "MONTHLY") {

          totalInstallments =
            Number(loan.durationMonths || 0);

        }

  else if (loan.loanType === "FIXED") {
    // Fixed loan = monthly interest penalty
    // Keep checking every month until today
    const loanDate = new Date(loan.loanDate);
    const todayDate = new Date(today);

    const monthDiff =
        (todayDate.getFullYear() - loanDate.getFullYear()) * 12 +
        (todayDate.getMonth() - loanDate.getMonth());

    totalInstallments = Math.max(0, monthDiff);
}


        // ==========================================
        // DUE INSTALLMENTS TILL TODAY
        // ==========================================

        let dueTillToday =
          totalInstallments;


        const loanDate =
          new Date(loan.loanDate);

        loanDate.setHours(
          0,
          0,
          0,
          0
        );


        // DAILY
        if (loan.loanType === "DAILY") {

          dueTillToday =
            Math.floor(
              (
                today - loanDate
              ) /
              (
                1000 *
                60 *
                60 *
                24
              )
            ) + 1;

        }


        // WEEKLY
        else if (loan.loanType === "WEEKLY") {

          dueTillToday =
            Math.floor(
              (
                today - loanDate
              ) /
              (
                1000 *
                60 *
                60 *
                24 *
                7
              )
            ) + 1;

        }


        // MONTHLY / FIXED
        else if (
          loan.loanType === "MONTHLY" ||
          loan.loanType === "FIXED"
        ) {

          const monthDiff =
            (
              today.getFullYear() -
              loanDate.getFullYear()
            ) * 12
            +
            (
              today.getMonth() -
              loanDate.getMonth()
            );


          if (monthDiff <= 0) {

            dueTillToday = 0;

          }

          else if (
            today.getDate() >=
            loanDate.getDate()
          ) {

            dueTillToday =
              monthDiff;

          }

          else {

            dueTillToday =
              monthDiff - 1;

          }

        }


        // Limit
        dueTillToday =
          Math.min(
            dueTillToday,
            totalInstallments
          );


        if (dueTillToday < 0) {

          dueTillToday = 0;

        }


        // ==========================================
        // PENALTY
        // ==========================================

        let pendingPenalty = 0;


        for (
          let i = 1;
          i <= dueTillToday;
          i++
        ) {


          // Already paid
          if (
            paidInstallments.has(i)
          ) {

            continue;

          }


          // ==========================================
          // CALCULATE DUE DATE
          // ==========================================

          const dueDate =
            new Date(loan.loanDate);


          if (
            loan.loanType === "DAILY"
          ) {

            dueDate.setDate(
              dueDate.getDate() +
              (i - 1)
            );

          }


          else if (
            loan.loanType === "WEEKLY"
          ) {

            dueDate.setDate(
              dueDate.getDate() +
              (
                (i - 1) * 7
              )
            );

          }


          else if (
            loan.loanType === "MONTHLY" ||
            loan.loanType === "FIXED"
          ) {

            dueDate.setMonth(
              dueDate.getMonth() +
              i
            );

          }


          dueDate.setHours(
            0,
            0,
            0,
            0
          );


          // ==========================================
          // DELAY
          // ==========================================

          let delay = 0;


          if (today > dueDate) {


            if (
              loan.loanType === "DAILY"
            ) {

              delay =
                Math.floor(
                  (
                    today - dueDate
                  ) /
                  (
                    1000 *
                    60 *
                    60 *
                    24
                  )
                );

            }


            else if (
              loan.loanType === "WEEKLY"
            ) {

              delay =
                Math.floor(
                  (
                    today - dueDate
                  ) /
                  (
                    1000 *
                    60 *
                    60 *
                    24 *
                    7
                  )
                );

            }


            else {

              // MONTHLY / FIXED
              delay =
                (
                  today.getFullYear() -
                  dueDate.getFullYear()
                ) * 12
                +
                (
                  today.getMonth() -
                  dueDate.getMonth()
                );


              if (
                today.getDate() >
                dueDate.getDate()
              ) {

                delay++;

              }

            }

          }


          // ==========================================
          // PENALTY CALCULATION
          // ==========================================

          if (
            delay >
            Number(loan.gracePeriod || 0)
          ) {


            // ========================================
            // DAILY / WEEKLY
            // ========================================

            if (
              loan.loanType === "DAILY" ||
              loan.loanType === "WEEKLY"
            ) {


              if (
                loan.penaltyType ===
                "PERCENTAGE"
              ) {

                pendingPenalty +=
                  Math.round(
                    (
                      Number(
                        loan.emiAmount || 0
                      ) *
                      Number(
                        loan.penaltyValue || 0
                      )
                    ) / 100
                  );

              }

              else {

                pendingPenalty +=
                  Number(
                    loan.penaltyValue || 0
                  );

              }

            }


            // ========================================
            // MONTHLY / FIXED
            // ========================================

            else {

              let penaltyBase =
                Number(
                  loan.emiAmount || 0
                );


              // FIXED = monthly interest
              if (
                loan.loanType === "FIXED"
              ) {

                penaltyBase =
                  Number(
                    loan.loanTenureMonths || 0
                  ) > 0

                    ? Math.round(
                        Number(
                          loan.totalInterest || 0
                        ) /
                        Number(
                          loan.loanTenureMonths
                        )
                      )

                    : 0;

              }


              pendingPenalty +=
                calculateMonthlyFixedPenalty({

                  dueDate,

                  today,

                  gracePeriod:
                    loan.gracePeriod,

                  penaltyType:
                    loan.penaltyType,

                  penaltyValue:
                    loan.penaltyValue,

                  penaltyBase

                });

            }

          }

        }


        // ==========================================
        // CURRENT LOAN STATUS
        // ==========================================

        let hasOverduePending =
          false;

        let hasPendingDue =
          false;


        for (
          let i = 1;
          i <= dueTillToday;
          i++
        ) {


          if (
            paidInstallments.has(i)
          ) {

            continue;

          }


          hasPendingDue = true;


          const dueDate =
            new Date(
              loan.loanDate
            );


          if (
            loan.loanType === "DAILY"
          ) {

            dueDate.setDate(
              dueDate.getDate() +
              (i - 1)
            );

          }

          else if (
            loan.loanType === "WEEKLY"
          ) {

            dueDate.setDate(
              dueDate.getDate() +
              (
                (i - 1) * 7
              )
            );

          }

     else if (
    loan.loanType === "MONTHLY" ||
    loan.loanType === "FIXED"
) {
    dueDate.setMonth(
        dueDate.getMonth() + i
    );
}

          dueDate.setHours(
            0,
            0,
            0,
            0
          );


          const delayDays =
            Math.max(
              0,
              Math.floor(
                (
                  today - dueDate
                ) /
                (
                  1000 *
                  60 *
                  60 *
                  24
                )
              )
            );


          if (
            delayDays >
            Number(
              loan.gracePeriod || 0
            )
          ) {

            hasOverduePending =
              true;

            break;

          }

        }


      // ==========================================
// FINAL STATUS
// ==========================================

// Count unpaid installments that are actually
// due till today
let duePendingCount = 0;

for (let i = 1; i <= dueTillToday; i++) {

  if (!paidInstallments.has(i)) {
    duePendingCount++;
  }

}

// ==========================================
// STATUS RULE
//
// CLOSED  = account explicitly closed
// PAID    = all installments completed
// DUE     = 1 or 2 installments due
// OVERDUE = more than 2 installments due
// ACTIVE  = no installment due yet
// ==========================================

let currentStatus;

// Account already closed
if (loan.status === "CLOSED") {

  currentStatus = "CLOSED";

}

// Completely paid
else if (
  Number(loan.outstandingAmount || 0) <= 0 ||
  Number(loan.pendingInstallments || 0) === 0
) {

  currentStatus = "PAID";

}

// More than 2 installments due
else if (duePendingCount > 2) {

  currentStatus = "OVERDUE";

}

// 1 or 2 installments due
else if (duePendingCount >= 1) {

  currentStatus = "DUE";

}

// No installment due yet
else {

  currentStatus = "ACTIVE";

}

        // ==========================================
        // RETURN LOAN
        // ==========================================

        return {

          ...loan,

          status:
            currentStatus,

          pendingPenalty

        };

      }
    );


    // ==========================================
    // RESPONSE
    // ==========================================

    return res.json({

      success: true,

      loans: updatedLoans

    });


  }

  catch (error) {

    console.error(
      "GET LOANS ERROR:",
      error
    );


    return res.status(500).json({

      success: false,

      message: error.message

    });

  }

};

exports.updateLoan = async (req, res) => {
  try {

    const loan = await DailyLoan.findById(req.params.id);

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: "Loan Not Found"
      });
    }

    // Preserve values that should never be overwritten
    const {
      _id,
      loanNumber,
      totalPaid,
      outstandingAmount,
      completedInstallments,
      pendingInstallments,
      lastInstallmentNo,
      lastPaymentDate,
      status,
      closedDate,
      closedBy,
      createdAt,
      updatedAt,

  // Area & Agent must never be changed manually
  areaName,
  assignedAgent,


      ...data
    } = req.body;

    // Update all editable fields
    Object.assign(loan, data);

  let endDate = new Date(loan.loanDate);

if (loan.loanType === "DAILY") {
  endDate.setDate(
    endDate.getDate() + Number(loan.durationDays)
  );
}

if (loan.loanType === "WEEKLY") {
  endDate.setDate(
    endDate.getDate() + Number(loan.durationWeeks) * 7
  );
}

if (loan.loanType === "MONTHLY") {
  endDate.setMonth(
    endDate.getMonth() + Number(loan.durationMonths)
  );
}

if (loan.loanType === "FIXED") {
  endDate.setMonth(
    endDate.getMonth() + Number(loan.loanTenureMonths)
  );
}

loan.endDate = endDate;
// ============================
// RECALCULATE LOAN
// ============================

const result = calculateLoanData(
  loan.loanAmount,
  loan.interestRate,
  loan.loanTenureMonths,
  loan.loanType,
  loan.durationDays,
  loan.durationWeeks,
  loan.durationMonths
);

loan.totalInterest = result.totalInterest;
loan.totalPayable = result.totalPayable;
loan.emiAmount = result.emiAmount;

// Keep already paid amount
if (loan.loanType === "FIXED") {

    loan.outstandingAmount =
        loan.loanAmount;

} else {

    loan.outstandingAmount =
        result.totalPayable - loan.totalPaid;

}

if (loan.outstandingAmount < 0) {
  loan.outstandingAmount = 0;
}

// Update pending installments
loan.pendingInstallments =
  result.totalInstallments -
  loan.completedInstallments;

if (loan.pendingInstallments < 0) {
  loan.pendingInstallments = 0;
}

    if (loan.outstandingAmount < 0) {
      loan.outstandingAmount = 0;
    }

    await loan.save();

    res.json({
      success: true,
      message: "Loan Updated Successfully",
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
// GET SINGLE LOAN
// ==========================================

exports.getLoan = async(req,res)=>{

try{

const loan =
await DailyLoan.findById(

req.params.id

)

.populate(

"assignedAgent",

"name mobile"

);

if(!loan){

return res.status(404).json({

success:false,

message:"Loan Not Found"

});

}

res.json({

success:true,

loan

});

}catch(error){

res.status(500).json({

success:false,

message:error.message

});

}

};




// ==========================================
// SEARCH LOAN MEMBERS
// ==========================================
exports.searchLoanMembers = async (req, res) => {

  try {

    const keyword = req.params.keyword;

    const members = await DailyMember.find({

      $or: [

        {
          memberId: {
            $regex: keyword,
            $options: "i"
          }
        },

        {
          memberName: {
            $regex: keyword,
            $options: "i"
          }
        },

        {
          mobile: {
            $regex: keyword,
            $options: "i"
          }
        }

      ]

    })

      // IMPORTANT
      // Get Area information
      .populate("areaGroup", "areaName")

      // IMPORTANT
      // Get Agent information
      .populate("assignedAgent", "name mobile email")

      .limit(20);

    return res.json({

      success: true,

      members

    });

  } catch (error) {

    console.error(
      "SEARCH LOAN MEMBERS ERROR:",
      error
    );

    return res.status(500).json({

      success: false,

      message: error.message

    });

  }

};

// ==========================================
// GET MEMBER DETAILS
// ==========================================

exports.getLoanMemberDetails = async (req, res) => {

  try {

    const member = await DailyMember.findById(req.params.memberId)
      .populate("areaGroup", "areaName")
      .populate("assignedAgent", "name mobile email");

    if (!member) {

      return res.status(404).json({
        success: false,
        message: "Member Not Found"
      });

    }

    // ==========================================
    // AREA VALIDATION
    // ==========================================

    if (!member.areaGroup) {

      return res.status(400).json({
        success: false,
        message: "Member does not have an Area assigned"
      });

    }

    // ==========================================
    // AGENT VALIDATION
    // ==========================================

    if (!member.assignedAgent) {

      return res.status(400).json({
        success: false,
        message: "Member does not have an Agent assigned"
      });

    }

    // ==========================================
    // RESPONSE
    // ==========================================

    return res.json({

      success: true,

      member,

      areaGroup: member.areaGroup,

      assignedAgent: member.assignedAgent

    });

  } catch (error) {

    console.error(
      "GET LOAN MEMBER DETAILS ERROR:",
      error
    );

    return res.status(500).json({

      success: false,

      message: error.message

    });
  }
};


// ==========================================
// GET AREA LIST
// ==========================================

exports.getAreas =
async(req,res)=>{

try{

const areas = await AreaGroup.find()
.sort({

areaName:1

});

res.json({

success:true,

areas

});

}catch(error){

res.status(500).json({

success:false,

message:error.message

});

}

};




// ==========================================
// GET MEMBERS BY AREA
// ==========================================

exports.getMembersByArea =
async(req,res)=>{

try{

const savings =
await DailySaving.find({

areaGroup:req.params.areaId,

status:"ACTIVE"

})

.populate(

"member",

"memberId memberName mobile"

);

const members =
savings
.filter(x=>x.member)
.map(x=>({

_id:x.member._id,

memberId:x.member.memberId,

memberName:x.member.memberName,

mobile:x.member.mobile

}));

res.json({

success:true,

members

});

}catch(error){

res.status(500).json({

success:false,

message:error.message

});

}

};




// ==========================================
// GET MEMBER
// ==========================================

exports.getMember =
async(req,res)=>{

try{

const member =
await DailyMember.findById(

req.params.id

);

if(!member){

return res.status(404).json({

success:false,

message:"Member Not Found"

});

}

res.json({

success:true,

member

});

}catch(error){

res.status(500).json({

success:false,

message:error.message

});

}

};

// ==========================================
// GET PENDING INSTALLMENTS
// ==========================================

exports.getPendingInstallments = async (req, res) => {

try{

const loan =
await DailyLoan.findById(
req.params.loanId
);

if(!loan){

return res.status(404).json({

success:false,

message:"Loan Not Found"

});

}



const collections =
await LoanCollection.find({

loan:loan._id

})

.sort({

installmentNo:1

});

const paidInstallments =
collections.map(item => item.installmentNo);

let totalInstallments;

if (loan.loanType === "DAILY")
    totalInstallments = loan.durationDays;

else if (loan.loanType === "WEEKLY")
    totalInstallments = loan.durationWeeks;

else if (
    loan.loanType==="MONTHLY" 
)
    totalInstallments = loan.durationMonths;


else
    totalInstallments = loan.loanTenureMonths;

const today = new Date();
today.setHours(0,0,0,0);

const loanDate = new Date(loan.loanDate);
loanDate.setHours(0, 0, 0, 0);

let dueTillToday = totalInstallments;

if (loan.loanType === "DAILY") {

  dueTillToday = Math.floor(
    (today - loanDate) /
    (1000 * 60 * 60 * 24)
  ) + 1;

}

else if (loan.loanType === "WEEKLY") {

  dueTillToday = Math.floor(
    (today - loanDate) /
    (1000 * 60 * 60 * 24 * 7)
  ) + 1;

}

else if (
    loan.loanType === "MONTHLY" ||
    loan.loanType === "FIXED"
) {

    const monthDiff =
        (today.getFullYear() - loanDate.getFullYear()) * 12 +
        (today.getMonth() - loanDate.getMonth());

    if (monthDiff <= 0) {
        dueTillToday = 0;
    }
    else if (today.getDate() >= loanDate.getDate()) {
        dueTillToday = monthDiff;
    }
    else {
        dueTillToday = monthDiff - 1;
    }
}


if (dueTillToday > totalInstallments) {
  dueTillToday = totalInstallments;
}

if (dueTillToday < 0) {
  dueTillToday = 0;
}

const installments=[];

for (
  let i = 1;
  i <= dueTillToday;
  i++
){

if (

paidInstallments.includes(i)

) {

continue;

}


let dueDate =
new Date(loan.loanDate);

if(loan.loanType==="DAILY"){

dueDate.setDate(

dueDate.getDate()+(i-1)

);

}

else if(loan.loanType==="WEEKLY"){

dueDate.setDate(

dueDate.getDate()+((i-1)*7)

);

}

else if (
    loan.loanType === "MONTHLY" ||
    loan.loanType === "FIXED"
) {
    dueDate.setMonth(
        dueDate.getMonth() + i
    );
}

dueDate.setHours(0,0,0,0);

let delay=0;

if(today>dueDate){

if(loan.loanType==="DAILY"){

delay=Math.floor(

(today-dueDate)/
(1000*60*60*24)

);

}

else if(loan.loanType==="WEEKLY"){

delay=Math.floor(

(today-dueDate)/
(1000*60*60*24*7)

);

}

else {
    // MONTHLY & FIXED
    // Grace period is ALWAYS in DAYS
    delay = Math.floor(
        (today - dueDate) /
        (1000 * 60 * 60 * 24)
    );
}

}
// ==========================================
// PENALTY CALCULATION
// ==========================================

let penalty = 0;

if (delay > loan.gracePeriod) {

    if (
        loan.loanType === "DAILY" ||
        loan.loanType === "WEEKLY"
    ) {

        // DAILY / WEEKLY = ONE TIME PENALTY
        if (loan.penaltyType === "PERCENTAGE") {

            penalty = Math.round(
                (loan.emiAmount * loan.penaltyValue) / 100
            );

        } else {

            penalty = Number(loan.penaltyValue);

        }

    } 
      else {

    // ==========================================
    // MONTHLY / FIXED
    // ONE PENALTY PER MONTH
    // ==========================================

    let penaltyBase = loan.emiAmount;

   if (loan.loanType === "FIXED") {

    // FIXED penalty is calculated on
    // CURRENT monthly interest

    const currentPrincipal =
        Number(
            loan.outstandingAmount ??
            loan.loanAmount ??
            0
        );

    const currentInterest =
        Math.round(
            (
                currentPrincipal *
                Number(loan.interestRate || 0)
            ) / 100
        );

    penaltyBase = currentInterest;
}

    // ==========================================
    // CALCULATE PENALTY
    // ==========================================

    penalty =
        calculateMonthlyFixedPenalty({
            dueDate,
            today,
            gracePeriod: loan.gracePeriod,
            penaltyType: loan.penaltyType,
            penaltyValue: loan.penaltyValue,
            penaltyBase
        });

}
}


let displayEmi = loan.emiAmount;

if (loan.loanType === "FIXED") {

    const currentPrincipal =
        Number(
            loan.outstandingAmount ??
            loan.loanAmount ??
            0
        );

    displayEmi = Math.round(
        (
            currentPrincipal *
            Number(loan.interestRate || 0)
        ) / 100
    );
}

const totalAmount =
displayEmi + penalty;




// ==========================================
// PUSH INSTALLMENT
// ==========================================

installments.push({

    installmentNo: i,

    dueDate,
    
      dueDateString:
        dueDate.toLocaleDateString("en-IN"),



    emiAmount: displayEmi,

    delay,

    gracePeriod: loan.gracePeriod,

    penaltyType: loan.penaltyType,

    penaltyValue: loan.penaltyValue,

    penalty,

    totalAmount

});

}


let summaryEmi = loan.emiAmount;

if (loan.loanType === "FIXED") {

    const currentPrincipal =
        Number(
            loan.outstandingAmount ??
            loan.loanAmount ??
            0
        );

    summaryEmi = Math.round(
        (
            currentPrincipal *
            Number(loan.interestRate || 0)
        ) / 100
    );
}
// ==========================================
// RESPONSE
// ==========================================

res.json({

    success: true,

    loanSummary: {

        loanAmount: loan.loanAmount,

        totalPayable: loan.totalPayable,

        outstandingAmount: loan.outstandingAmount,

        completedInstallments:
        loan.completedInstallments,

        pendingInstallments:
        loan.pendingInstallments,

        emiAmount:
        summaryEmi

    },

    installments

});

}catch(error){

console.log(error);

res.status(500).json({

success:false,

message:error.message

});

}

};

// ==========================================================
// ADVANCE EMI HELPERS
// ==========================================================

const getLoanTotalInstallments = (loan) => {
    if (loan.loanType === "DAILY") {
        return Number(loan.durationDays || 0);
    }

    if (loan.loanType === "WEEKLY") {
        return Number(loan.durationWeeks || 0);
    }

    if (loan.loanType === "MONTHLY") {
        return Number(loan.durationMonths || 0);
    }

    if (loan.loanType === "FIXED") {
        return Number(loan.loanTenureMonths || 0);
    }

    return 0;
};


// ==========================================================
// GET EMI AMOUNT
// ==========================================================

// ==========================================================
// GET CURRENT EMI / MONTHLY INTEREST
// ==========================================================

const getLoanEmiAmount = (loan) => {

    // FIXED LOAN
    // FIXED EMI = current outstanding principal × interest rate
    if (loan.loanType === "FIXED") {

        const currentPrincipal =
            Number(
                loan.outstandingAmount ??
                loan.loanAmount ??
                0
            );

        const interestRate =
            Number(loan.interestRate || 0);

        return Math.round(
            (currentPrincipal * interestRate) / 100
        );
    }

    return Number(loan.emiAmount || 0);
};


// ==========================================================
// GET INSTALLMENT DUE DATE
// ==========================================================

const getInstallmentDueDate = (
    loan,
    installmentNo
) => {

    const dueDate = new Date(loan.loanDate);

    if (Number.isNaN(dueDate.getTime())) {
        return null;
    }

    // IMPORTANT:
    // Loan date itself is NOT installment #1.
    //
    // DAILY:
    // loanDate + 1 day
    //
    // WEEKLY:
    // loanDate + 7 days
    //
    // MONTHLY:
    // loanDate + 1 month
    //
    // FIXED:
    // loanDate + 1 month

    if (loan.loanType === "DAILY") {

        dueDate.setDate(
            dueDate.getDate() +
            Number(installmentNo)
        );

    } else if (loan.loanType === "WEEKLY") {

        dueDate.setDate(
            dueDate.getDate() +
            (
                Number(installmentNo) * 7
            )
        );

    } else if (
        loan.loanType === "MONTHLY" ||
        loan.loanType === "FIXED"
    ) {

        // Safe month calculation
        const originalDay = dueDate.getDate();

        dueDate.setDate(1);

        dueDate.setMonth(
            dueDate.getMonth() +
            Number(installmentNo)
        );

        const lastDay =
            new Date(
                dueDate.getFullYear(),
                dueDate.getMonth() + 1,
                0
            ).getDate();

        dueDate.setDate(
            Math.min(
                originalDay,
                lastDay
            )
        );
    }

    dueDate.setHours(0, 0, 0, 0);

    return dueDate;
};


// ==========================================================
// GET ALREADY PAID INSTALLMENTS
// ==========================================================

const getPaidInstallmentNumbers = async (loanId) => {

    const collections =
        await LoanCollection.find({
            loan: loanId,
            installmentNo: {
                $gt: 0
            },
            status: "PAID"
        })
        .select("installmentNo")
        .lean();

    return new Set(
        collections
            .map(item =>
                Number(item.installmentNo)
            )
            .filter(
                number =>
                    Number.isInteger(number) &&
                    number > 0
            )
    );
};


// ==========================================================
// GET NEXT UNPAID INSTALLMENTS
// ==========================================================

const getNextUnpaidInstallments = async (
    loan,
    advanceCount
) => {

    const totalInstallments =
        getLoanTotalInstallments(loan);

    const paidInstallments =
        await getPaidInstallmentNumbers(
            loan._id
        );

    const result = [];

    for (
        let installmentNo = 1;
        installmentNo <= totalInstallments;
        installmentNo++
    ) {

        if (
            paidInstallments.has(
                installmentNo
            )
        ) {
            continue;
        }

        result.push(
            installmentNo
        );

        if (
            result.length >=
            advanceCount
        ) {
            break;
        }
    }

    return result;
};


// ==========================================================
// ADVANCE EMI PREVIEW
//
// GET:
// /loan/:loanId/advance-preview?count=5
// ==========================================================

exports.advanceEmiPreview = async (
    req,
    res
) => {

    try {

        const {
            loanId
        } = req.params;

        const count =
            Number(req.query.count);

        // ------------------------------------------
        // VALIDATION
        // ------------------------------------------

        if (!loanId) {

            return res.status(400).json({
                success: false,
                message: "Loan ID is required"
            });

        }

        if (
            !Number.isInteger(count) ||
            count <= 0
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Advance EMI count must be a positive integer"
            });

        }


        // ------------------------------------------
        // GET LOAN
        // ------------------------------------------

        const loan =
            await DailyLoan.findById(
                loanId
            );

        if (!loan) {

            return res.status(404).json({
                success: false,
                message: "Loan Not Found"
            });

        }


        if (
            loan.status === "CLOSED"
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "This loan is already closed"
            });

        }


        // ------------------------------------------
        // TOTAL INSTALLMENTS
        // ------------------------------------------

        const totalInstallments =
            getLoanTotalInstallments(
                loan
            );

        if (
            totalInstallments <= 0
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "This loan does not have valid installments"
            });

        }


        // ------------------------------------------
        // NEXT UNPAID INSTALLMENTS
        // ------------------------------------------

        const installmentNumbers =
            await getNextUnpaidInstallments(
                loan,
                count
            );


        if (
            installmentNumbers.length === 0
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "No unpaid installments available"
            });

        }


        // ------------------------------------------
        // CHECK REQUESTED COUNT
        // ------------------------------------------

        if (
            installmentNumbers.length <
            count
        ) {

            return res.status(400).json({
                success: false,
                message:
                    `Only ${installmentNumbers.length} unpaid installment(s) are available`
            });

        }


        // ------------------------------------------
        // EMI
        // ------------------------------------------

        const emiAmount =
            getLoanEmiAmount(
                loan
            );


        // ------------------------------------------
        // BUILD PREVIEW
        // ------------------------------------------

        const installments =
            installmentNumbers.map(
                installmentNo => {

                    const dueDate =
                        getInstallmentDueDate(
                            loan,
                            installmentNo
                        );

                    return {

                        installmentNo,

                        dueDate,

                        emiAmount,

                        penalty: 0,

                        totalAmount:
                            emiAmount

                    };

                }
            );


        const totalAmount =
            installments.reduce(
                (
                    total,
                    item
                ) =>
                    total +
                    Number(
                        item.totalAmount || 0
                    ),
                0
            );


        // ------------------------------------------
        // RESPONSE
        // ------------------------------------------

        return res.json({

            success: true,

            message:
                "Advance EMI preview generated",

            loanId: loan._id,

            loanNumber:
                loan.loanNumber,

            loanType:
                loan.loanType,

            totalInstallments,

            availableAdvanceInstallments:
                installmentNumbers.length,

            advanceCount:
                installmentNumbers.length,

            emiAmount,

            penalty: 0,

            totalAmount,

            installments

        });

    } catch (error) {

        console.error(
            "ADVANCE EMI PREVIEW ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                error.message

        });

    }

};


// ==========================================================
// COLLECT ADVANCE EMI
//
// POST:
// /collect-advance-loan
// ==========================================================

exports.collectAdvanceEmi = async (
    req,
    res
) => {

    try {

        const {

            loanId,

            advanceCount,

            collectorType,

            collectorId,

            paymentMethod

        } = req.body;


        // ------------------------------------------
        // VALIDATION
        // ------------------------------------------

        if (
            !loanId ||
            !advanceCount ||
            !collectorType ||
            !paymentMethod
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "loanId, advanceCount, collectorType and paymentMethod are required"

            });

        }


        const count =
            Number(advanceCount);


        if (
            !Number.isInteger(count) ||
            count <= 0
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Advance count must be a positive integer"

            });

        }


        // ------------------------------------------
        // VALIDATE COLLECTOR TYPE
        // ------------------------------------------

        const allowedCollectorTypes = [
            "ADMIN",
            "AGENT"
        ];


        if (
            !allowedCollectorTypes.includes(
                String(
                    collectorType
                ).toUpperCase()
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "collectorType must be ADMIN or AGENT"

            });

        }


        // ------------------------------------------
        // GET LOAN
        // ------------------------------------------

        const loan =
            await DailyLoan.findById(
                loanId
            );


        if (!loan) {

            return res.status(404).json({

                success: false,

                message:
                    "Loan Not Found"

            });

        }


        // ------------------------------------------
        // CLOSED LOAN
        // ------------------------------------------

        if (
            loan.status === "CLOSED"
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "This loan is already closed"

            });

        }


        // ------------------------------------------
        // TOTAL INSTALLMENTS
        // ------------------------------------------

        const totalInstallments =
            getLoanTotalInstallments(
                loan
            );


        if (
            totalInstallments <= 0
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid total installment count"

            });

        }


        // ------------------------------------------
        // GET PAID INSTALLMENTS
        // ------------------------------------------

        const paidInstallments =
            await getPaidInstallmentNumbers(
                loan._id
            );


        // ------------------------------------------
        // FIND NEXT UNPAID INSTALLMENTS
        // ------------------------------------------

        const installmentNumbers = [];


        for (
            let installmentNo = 1;

            installmentNo <=
            totalInstallments;

            installmentNo++
        ) {

            if (
                paidInstallments.has(
                    installmentNo
                )
            ) {
                continue;
            }


            installmentNumbers.push(
                installmentNo
            );


            if (
                installmentNumbers.length >=
                count
            ) {
                break;
            }

        }


        // ------------------------------------------
        // NOT ENOUGH INSTALLMENTS
        // ------------------------------------------

        if (
            installmentNumbers.length <
            count
        ) {

            return res.status(400).json({

                success: false,

                message:
                    `Only ${installmentNumbers.length} unpaid installment(s) are available`

            });

        }


        // ------------------------------------------
        // EMI AMOUNT
        // ------------------------------------------

        const emiAmount =
            getLoanEmiAmount(
                loan
            );


        if (
            !Number.isFinite(
                emiAmount
            ) ||
            emiAmount <= 0
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid EMI amount"

            });

        }


        // ------------------------------------------
        // PAYMENT DATE
        // ------------------------------------------

        const paymentDate =
            new Date();


        // ------------------------------------------
        // BATCH RECEIPT
        // ------------------------------------------

        const batchReceiptNo =
            "ADV-" +
            Date.now();


        // ------------------------------------------
        // CREATE COLLECTIONS
        //
        // ONE DOCUMENT PER INSTALLMENT
        // ------------------------------------------

        const collections = [];


        for (
            const installmentNo
            of installmentNumbers
        ) {

            const dueDate =
                getInstallmentDueDate(
                    loan,
                    installmentNo
                );


            if (!dueDate) {

                throw new Error(
                    `Invalid due date for installment ${installmentNo}`
                );

            }


            // --------------------------------------
            // PRINCIPAL / INTEREST
            // --------------------------------------

            let principalAmount = 0;

            let interestAmount = 0;


            if (
                loan.loanType ===
                "DAILY"
            ) {

                interestAmount =
                    Number(
                        (
                            Number(
                                loan.totalInterest || 0
                            ) /
                            Number(
                                loan.durationDays || 1
                            )
                        ).toFixed(2)
                    );


                principalAmount =
                    Number(
                        (
                            emiAmount -
                            interestAmount
                        ).toFixed(2)
                    );

            }


            else if (
                loan.loanType ===
                "WEEKLY"
            ) {

                interestAmount =
                    Number(
                        (
                            Number(
                                loan.totalInterest || 0
                            ) /
                            Number(
                                loan.durationWeeks || 1
                            )
                        ).toFixed(2)
                    );


                principalAmount =
                    Number(
                        (
                            emiAmount -
                            interestAmount
                        ).toFixed(2)
                    );

            }


            else if (
                loan.loanType ===
                "MONTHLY"
            ) {

                interestAmount =
                    Math.round(
                        Number(
                            loan.totalInterest || 0
                        ) /
                        Number(
                            loan.durationMonths || 1
                        )
                    );


                principalAmount =
                    emiAmount -
                    interestAmount;

            }


            else if (
                loan.loanType ===
                "FIXED"
            ) {

                // FIXED = interest only

                interestAmount =
                    emiAmount;

                principalAmount =
                    0;

            }


            if (
                principalAmount < 0
            ) {

                principalAmount = 0;

            }


            // --------------------------------------
            // ADVANCE EMI HAS ZERO PENALTY
            // --------------------------------------

            const penalty = 0;


            const totalAmount =
                emiAmount;


            // --------------------------------------
            // UNIQUE RECEIPT
            // --------------------------------------

            const receiptNo =
                batchReceiptNo +
                "-" +
                String(
                    installmentNo
                ).padStart(
                    3,
                    "0"
                );


            // --------------------------------------
            // CREATE COLLECTION
            // --------------------------------------

            const collection =
                await LoanCollection.create({

                    loan:
                        loan._id,

                    member:
                        loan.member,

                    installmentNo:
                        installmentNo,

                    emiType:
                        loan.loanType ===
                        "FIXED"

                            ? "FIXED_INTEREST"

                            : loan.loanType,

                    dueDate:

                        dueDate,

                    paymentDate:

                        paymentDate,

                    // Advance payment:
                    // No delay and no penalty.

                    delayDays:
                        0,

                    principalAmount:

                        principalAmount,

                    interestAmount:

                        interestAmount,

                    penalty:

                        0,

                    totalAmount:

                        totalAmount,

                    collectorType:

                        String(
                            collectorType
                        ).toUpperCase(),

                    collectorId:

                        collectorId || null,

                    paymentMethod:

                        paymentMethod,

                    receiptNo:

                        receiptNo,

                    status:

                        "PAID"

                });


            collections.push(
                collection
            );


            // --------------------------------------
            // UPDATE LOAN FINANCIAL DATA
            // --------------------------------------

            if (
                loan.loanType ===
                "FIXED"
            ) {

                // Existing FIXED behavior:
                // EMI is interest only.

                loan.totalPaid =
                    Number(
                        loan.totalPaid || 0
                    ) +
                    totalAmount;

            }

            else {

                const loanRecovery =
                    principalAmount +
                    interestAmount;


                loan.outstandingAmount =
                    Number(
                        loan.outstandingAmount || 0
                    ) -
                    loanRecovery;


                loan.totalPaid =
                    Number(
                        loan.totalPaid || 0
                    ) +
                    totalAmount;

            }

        }


        // ------------------------------------------
        // PROTECT OUTSTANDING
        // ------------------------------------------

        if (
            Number(
                loan.outstandingAmount
            ) < 0
        ) {

            loan.outstandingAmount = 0;

        }


        // ------------------------------------------
        // LAST PAYMENT
        // ------------------------------------------

        loan.lastPaymentDate =
            paymentDate;


        loan.lastInstallmentNo =
            Math.max(
                ...installmentNumbers
            );


        // ------------------------------------------
        // RECALCULATE COMPLETED INSTALLMENTS
        //
        // IMPORTANT:
        // installmentNo = 0 is principal
        // and must NOT be counted.
        // ------------------------------------------

        const paidInstallmentRecords =
            await LoanCollection.find({

                loan:
                    loan._id,

                installmentNo:
                    {
                        $gt: 0
                    },

                status:
                    "PAID"

            })
            .select(
                "installmentNo"
            )
            .lean();


        const uniquePaidInstallments =
            new Set(
                paidInstallmentRecords
                    .map(
                        item =>
                            Number(
                                item.installmentNo
                            )
                    )
                    .filter(
                        number =>
                            number > 0
                    )
            );


        loan.completedInstallments =
            uniquePaidInstallments.size;


        loan.pendingInstallments =
            Math.max(

                0,

                totalInstallments -
                loan.completedInstallments

            );


        // ------------------------------------------
        // UPDATE STATUS
        // ------------------------------------------

        if (
            loan.loanType ===
            "FIXED"
        ) {

            // FIXED principal is separate.
            // Therefore advance interest does not
            // close the loan.

            if (
                Number(
                    loan.outstandingAmount || 0
                ) <= 0
            ) {

                loan.status =
                    "CLOSED";

                loan.closedDate =
                    new Date();

                loan.closedBy =
                    String(
                        collectorType
                    ).toUpperCase();

            }

            else {

                loan.status =
                    "ACTIVE";

            }

        }

        else {

            if (

                loan.outstandingAmount <= 0 &&

                loan.pendingInstallments === 0

            ) {

                loan.status =
                    "CLOSED";

                loan.closedDate =
                    new Date();

                loan.closedBy =
                    String(
                        collectorType
                    ).toUpperCase();

            }

            else {

                loan.status =
                    "ACTIVE";

            }

        }


        // ------------------------------------------
        // SAVE LOAN
        // ------------------------------------------

        await loan.save();


        // ------------------------------------------
        // TOTAL ADVANCE AMOUNT
        // ------------------------------------------

        const totalAdvanceAmount =
            collections.reduce(

                (
                    total,
                    item
                ) =>
                    total +
                    Number(
                        item.totalAmount || 0
                    ),

                0

            );


        // ------------------------------------------
        // RESPONSE
        // ------------------------------------------

        return res.status(201).json({

            success: true,

            message:
                `${collections.length} Advance EMI(s) collected successfully`,

            batchReceiptNo,

            advanceCount:
                collections.length,

            totalAmount:
                totalAdvanceAmount,

            emiAmount,

            penalty:
                0,

            installments:
                collections.map(
                    item => ({

                        installmentNo:
                            item.installmentNo,

                        dueDate:
                            item.dueDate,

                        paymentDate:
                            item.paymentDate,

                        principalAmount:
                            item.principalAmount,

                        interestAmount:
                            item.interestAmount,

                        penalty:
                            0,

                        totalAmount:
                            item.totalAmount,

                        receiptNo:
                            item.receiptNo

                    })
                ),

            loanSummary: {

                totalPaid:
                    loan.totalPaid,

                outstandingAmount:
                    loan.outstandingAmount,

                completedInstallments:
                    loan.completedInstallments,

                pendingInstallments:
                    loan.pendingInstallments,

                lastInstallmentNo:
                    loan.lastInstallmentNo,

                status:
                    loan.status

            }

        });

    } catch (error) {

        console.error(
            "COLLECT ADVANCE EMI ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                error.message

        });

    }

};


// ==========================================
// COLLECT EMI
// ==========================================

exports.collectEmi = async (req, res) => {

try{

const{

loanId,
installmentNo,
collectorType,
collectorId,
paymentMethod

}=req.body;

// ==========================================
// VALIDATION
// ==========================================

if(
!loanId ||
!installmentNo ||
!collectorType ||
!paymentMethod
){

return res.status(400).json({

success:false,
message:"Required fields are missing."

});

}

const loan =
await DailyLoan.findById(loanId);

if(!loan){

return res.status(404).json({

success:false,
message:"Loan Not Found"

});

}



// ==========================================
// CHECK DUPLICATE EMI
// ==========================================

const alreadyPaid =
await LoanCollection.findOne({

loan:loan._id,

installmentNo:Number(installmentNo)

});

if(alreadyPaid){

return res.status(400).json({

success:false,
message:"This EMI has already been collected."

});

}

// ==========================================
// TOTAL INSTALLMENTS
// ==========================================

let totalInstallments;

if (loan.loanType==="DAILY")
    totalInstallments=loan.durationDays;

else if (loan.loanType==="WEEKLY")
    totalInstallments=loan.durationWeeks;

else if (loan.loanType==="MONTHLY")
    totalInstallments=loan.durationMonths;

else
    totalInstallments=loan.loanTenureMonths;

if(

Number(installmentNo) < 1 ||

Number(installmentNo) > totalInstallments

){

return res.status(400).json({

success:false,
message:"Invalid Installment Number."

});

}

// ==========================================
// DUE DATE
// ==========================================

let dueDate =
new Date(loan.loanDate);

switch(loan.loanType){

case "DAILY":

dueDate.setDate(

dueDate.getDate() +
(Number(installmentNo)-1)

);

break;

case "WEEKLY":

dueDate.setDate(

dueDate.getDate() +
((Number(installmentNo)-1)*7)

);

break;

case "MONTHLY":

    dueDate.setMonth(
        dueDate.getMonth() +
        Number(installmentNo)
    );

    break;

case "FIXED":

    dueDate.setMonth(
        dueDate.getMonth() +
        Number(installmentNo)
    );

    break;


}

dueDate.setHours(0,0,0,0);

// ==========================================
// TODAY
// ==========================================

const today =
new Date();

today.setHours(0,0,0,0);

// ==========================================
// DELAY
// ==========================================

let delay = 0;

if(today > dueDate){

if(loan.loanType==="DAILY"){

delay = Math.floor(

(today-dueDate)/
(1000*60*60*24)

);

}

else if(loan.loanType==="WEEKLY"){

delay = Math.floor(

(today-dueDate)/
(1000*60*60*24*7)

);

}

else {

    // MONTHLY & FIXED
    // Grace period is calculated in DAYS
    delay = Math.floor(
        (today - dueDate) /
        (1000 * 60 * 60 * 24)
    );

}

}

// ==========================================
// PENALTY
// ==========================================

let penalty = 0;

if (delay > loan.gracePeriod) {

    // DAILY & WEEKLY → One Time Penalty
    if (
        loan.loanType === "DAILY" ||
        loan.loanType === "WEEKLY"
    ) {

        if (loan.penaltyType === "PERCENTAGE") {

            penalty = Math.round(
                (loan.emiAmount * loan.penaltyValue) / 100
            );

        } else {

            penalty = Number(loan.penaltyValue);

        }

    }

  else {

    // ==========================================
    // MONTHLY / FIXED
    // ONE PENALTY PER MONTH
    // ==========================================

    let penaltyBase = loan.emiAmount;

    // FIXED loan = monthly interest
    if (loan.loanType === "FIXED") {

        penaltyBase = Math.round(
            loan.totalInterest /
            loan.loanTenureMonths
        );

    }

    // ==========================================
    // CALCULATE PENALTY
    // ==========================================

    penalty =
        calculateMonthlyFixedPenalty({
            dueDate,
            today,
            gracePeriod: loan.gracePeriod,
            penaltyType: loan.penaltyType,
            penaltyValue: loan.penaltyValue,
            penaltyBase
        });

}
}

// ==========================================
// PRINCIPAL & INTEREST
// ==========================================

let principalAmount = 0;

let interestAmount = 0;

switch(loan.loanType){

case "DAILY":

    interestAmount = Number(
        (
            loan.totalInterest /
            loan.durationDays
        ).toFixed(2)
    );

    principalAmount = Number(
        (
            loan.emiAmount -
            interestAmount
        ).toFixed(2)
    );

    break;


case "WEEKLY":

    interestAmount = Number(
        (
            loan.totalInterest /
            loan.durationWeeks
        ).toFixed(2)
    );

    principalAmount = Number(
        (
            loan.emiAmount -
            interestAmount
        ).toFixed(2)
    );

    break;

case "MONTHLY":

    interestAmount = Math.round(
        loan.totalInterest / loan.durationMonths
    );

    principalAmount =
        loan.emiAmount - interestAmount;

    break;


case "FIXED":

    // Fixed loan = monthly interest only
    interestAmount = loan.emiAmount;

    // Principal is NEVER collected through EMI
    principalAmount = 0;

    break;

    // Fixed loan = monthly interest only
    interestAmount = loan.emiAmount;

    // Principal is NEVER collected through EMI
    principalAmount = 0;

    break;

default:

interestAmount = 0;

principalAmount =
loan.emiAmount;

}

if(principalAmount < 0){

principalAmount = 0;

}

// ==========================================
// TOTAL AMOUNT
// ==========================================

const totalAmount =
loan.emiAmount +
penalty;

// ==========================================
// RECEIPT NUMBER
// ==========================================

const receiptNo =

"RCPT-" +

Date.now() +

"-" +

String(installmentNo).padStart(3,"0");

// ==========================================
// SAVE COLLECTION
// ==========================================
console.log("Collector Type:", collectorType);
console.log("Collector Id:", collectorId);

await LoanCollection.create({

loan:loan._id,

member:loan.member,

installmentNo:Number(installmentNo),

emiType:
    loan.loanType === "FIXED"
        ? "FIXED_INTEREST"
        : loan.loanType,

dueDate,

paymentDate:new Date(),

delayDays:delay,

principalAmount,

interestAmount,

penalty,

totalAmount,

collectorType,

collectorId,

paymentMethod,

receiptNo,

status:"PAID"

});



// ==========================================
// UPDATE LOAN
// ==========================================

if (loan.loanType === "FIXED") {

    loan.totalPaid += totalAmount;

} else {

    const loanRecovery =
        principalAmount + interestAmount;

    loan.outstandingAmount -= loanRecovery;

    loan.totalPaid += totalAmount;

}


if (loan.outstandingAmount < 0) {
    loan.outstandingAmount = 0;
}

loan.lastPaymentDate = new Date();

loan.lastInstallmentNo = Number(installmentNo);

// ==========================================
// UPDATE INSTALLMENT COUNT
// ==========================================

const paidCount =
await LoanCollection.countDocuments({

    loan: loan._id

});

loan.completedInstallments = paidCount;

loan.pendingInstallments =
Math.max(
    0,
    totalInstallments - paidCount
);

// ==========================================
// UPDATE STATUS
// ==========================================

if (loan.loanType === "FIXED") {

    if (loan.outstandingAmount <= 0) {

        loan.status = "CLOSED";
        loan.closedDate = new Date();
        loan.closedBy = collectorType;

    } else if (delay > loan.gracePeriod) {

        loan.status = "OVERDUE";

    } else {

        loan.status = "ACTIVE";

    }

} else {

    if (
        loan.outstandingAmount <= 0 &&
        loan.pendingInstallments === 0
    ) {

        loan.status = "CLOSED";
        loan.closedDate = new Date();
        loan.closedBy = collectorType;

    } else if (delay > loan.gracePeriod) {

        loan.status = "OVERDUE";

    } else {

        loan.status = "ACTIVE";

    }

}

await loan.save();

// ==========================================
// RESPONSE
// ==========================================

return res.status(201).json({

    success: true,

    message: "EMI Collected Successfully",

    receiptNo,

    collection: {

        installmentNo: Number(installmentNo),

        dueDate,

        paymentDate: new Date(),

        principalAmount,

        interestAmount,

        penalty,

        totalAmount

    },

    loanSummary: {

        totalPaid: loan.totalPaid,

        outstandingAmount: loan.outstandingAmount,

        completedInstallments: loan.completedInstallments,

        pendingInstallments: loan.pendingInstallments,

        status: loan.status

    }

});

}catch(error){

console.log(error);

return res.status(500).json({

    success:false,

    message:error.message

});

}

};





// ==========================================================
// COLLECT PRINCIPAL - FIXED LOAN
// ==========================================================

exports.collectPrincipal = async (req, res) => {

    try {

        const {
            loanId,
            collectorType,
            collectorId,
            paymentMethod,
            amount,
            remarks
        } = req.body;

        // ------------------------------------------
        // GET LOAN
        // ------------------------------------------

        const loan =
            await DailyLoan.findById(loanId);

        if (!loan) {

            return res.status(404).json({
                success: false,
                message: "Loan Not Found"
            });
        }

        // ------------------------------------------
        // ONLY FIXED LOAN
        // ------------------------------------------

        if (loan.loanType !== "FIXED") {

            return res.status(400).json({
                success: false,
                message:
                    "Principal collection is only available for FIXED loans"
            });
        }

        // ------------------------------------------
        // CURRENT PRINCIPAL
        // ------------------------------------------

        const currentPrincipal =
            Number(
                loan.outstandingAmount ??
                loan.loanAmount ??
                0
            );

        const principalAmount =
            Number(amount);

        // ------------------------------------------
        // VALIDATION
        // ------------------------------------------

        if (
            !Number.isFinite(principalAmount) ||
            principalAmount <= 0
        ) {

            return res.status(400).json({
                success: false,
                message: "Invalid Principal Amount"
            });
        }

        if (principalAmount > currentPrincipal) {

            return res.status(400).json({
                success: false,
                message:
                    `Principal cannot exceed current principal ₹${currentPrincipal}`
            });
        }

        // ------------------------------------------
        // CURRENT MONTHLY INTEREST
        // ------------------------------------------

        const interestAmount =
            Math.round(
                (
                    currentPrincipal *
                    Number(loan.interestRate || 0)
                ) / 100
            );

        // ------------------------------------------
        // RECEIPT
        // ------------------------------------------

        const receiptNo =
            "PRN-" + Date.now();

        // ------------------------------------------
        // SAVE PRINCIPAL COLLECTION
        // ------------------------------------------

        await LoanCollection.create({

            loan: loan._id,

            member: loan.member,

            installmentNo: 0,

            emiType: "PRINCIPAL",

            dueDate: new Date(),

            paymentDate: new Date(),

            delayDays: 0,

            principalAmount,

            interestAmount: 0,

            penalty: 0,

            totalAmount: principalAmount,

            collectorType,

            collectorId,

            paymentMethod,

            receiptNo,

            remarks,

            status: "PAID"
        });

        // ------------------------------------------
        // UPDATE PRINCIPAL
        // ------------------------------------------

        loan.outstandingAmount =
            currentPrincipal - principalAmount;

        if (loan.outstandingAmount < 0) {
            loan.outstandingAmount = 0;
        }

        // ------------------------------------------
        // TOTAL PAID
        // ------------------------------------------

        loan.totalPaid =
            Number(loan.totalPaid || 0) +
            principalAmount;

        loan.lastPaymentDate =
            new Date();

        // ------------------------------------------
        // CLOSE IF PRINCIPAL ZERO
        // ------------------------------------------

        if (
            loan.outstandingAmount <= 0
        ) {

            loan.outstandingAmount = 0;

            loan.status = "CLOSED";

            loan.closedDate =
                new Date();

            loan.closedBy =
                collectorType;
        }

        // ------------------------------------------
        // SAVE
        // ------------------------------------------

        await loan.save();

        // ------------------------------------------
        // NEXT MONTH INTEREST
        // ------------------------------------------

        const nextMonthlyInterest =
            Math.round(
                (
                    Number(
                        loan.outstandingAmount || 0
                    ) *
                    Number(
                        loan.interestRate || 0
                    )
                ) / 100
            );

        // ------------------------------------------
        // RESPONSE
        // ------------------------------------------

        return res.status(201).json({

            success: true,

            message:
                "Principal Collected Successfully",

            receiptNo,

            collection: {

                principalAmount,

                paymentDate: new Date()
            },

            loanSummary: {

                previousPrincipal:
                    currentPrincipal,

                principalPaid:
                    principalAmount,

                currentPrincipal:
                    loan.outstandingAmount,

                interestRate:
                    loan.interestRate,

                nextMonthlyInterest,

                totalPaid:
                    loan.totalPaid,

                status:
                    loan.status
            }
        });

    } catch (error) {

        console.log(
            "COLLECT PRINCIPAL ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                error.message
        });
    }
};



// ==========================================================
// COLLECT FIXED INTEREST + PRINCIPAL
// ==========================================================

exports.collectFixedInterestPrincipal = async (
    req,
    res
) => {

    try {

        const {
            loanId,
            installmentNo,
            principalAmount,
            collectorType,
            collectorId,
            paymentMethod,
            remarks
        } = req.body;

        // ------------------------------------------
        // VALIDATION
        // ------------------------------------------

        if (!loanId) {

            return res.status(400).json({
                success: false,
                message: "Loan ID is required"
            });
        }

        const loan =
            await DailyLoan.findById(loanId);

        if (!loan) {

            return res.status(404).json({
                success: false,
                message: "Loan Not Found"
            });
        }

        if (loan.loanType !== "FIXED") {

            return res.status(400).json({
                success: false,
                message:
                    "This API is only for FIXED loans"
            });
        }

        if (loan.status === "CLOSED") {

            return res.status(400).json({
                success: false,
                message:
                    "This loan is already closed"
            });
        }

        // ------------------------------------------
        // CURRENT PRINCIPAL
        // ------------------------------------------

        const currentPrincipal =
            Number(
                loan.outstandingAmount ??
                loan.loanAmount ??
                0
            );

        // ------------------------------------------
        // PRINCIPAL PAYMENT
        // ------------------------------------------

        const principalPaid =
            Number(principalAmount || 0);

        if (
            !Number.isFinite(principalPaid) ||
            principalPaid < 0
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Invalid principal amount"
            });
        }

        if (
            principalPaid >
            currentPrincipal
        ) {

            return res.status(400).json({
                success: false,
                message:
                    `Principal cannot exceed ₹${currentPrincipal}`
            });
        }

        // ------------------------------------------
        // CURRENT MONTHLY INTEREST
        // ------------------------------------------

        const interestAmount =
            Math.round(
                (
                    currentPrincipal *
                    Number(
                        loan.interestRate || 0
                    )
                ) / 100
            );

        // ------------------------------------------
        // TOTAL
        // ------------------------------------------

        const totalAmount =
            interestAmount +
            principalPaid;

        if (totalAmount <= 0) {

            return res.status(400).json({
                success: false,
                message:
                    "Nothing to collect"
            });
        }

        // ------------------------------------------
        // INSTALLMENT NUMBER
        // ------------------------------------------

       if (
  installmentNo === undefined ||
  installmentNo === null ||
  !Number.isInteger(Number(installmentNo)) ||
  Number(installmentNo) < 1
) {
  return res.status(400).json({
    success: false,
    message: "Valid installmentNo is required",
  });
}

const currentInstallment = Number(installmentNo);

        // ------------------------------------------
        // CHECK DUPLICATE
        // ------------------------------------------

        const existing =
            await LoanCollection.findOne({

                loan: loan._id,

                installmentNo:
                    currentInstallment,

                status: "PAID"
            });

        if (existing) {

            return res.status(400).json({
                success: false,
                message:
                    `Installment ${currentInstallment} is already paid`
            });
        }

        // ------------------------------------------
        // DUE DATE
        // ------------------------------------------

        const dueDate =
            getInstallmentDueDate(
                loan,
                currentInstallment
            );

        // ------------------------------------------
        // RECEIPT
        // ------------------------------------------

        const receiptNo =
            "FIX-" +
            Date.now() +
            "-" +
            String(
                currentInstallment
            ).padStart(3, "0");

        // ------------------------------------------
        // SAVE COLLECTION
        // ------------------------------------------

        await LoanCollection.create({

            loan: loan._id,

            member: loan.member,

            installmentNo:
                currentInstallment,

            emiType:
                "FIXED_INTEREST",

            dueDate,

            paymentDate:
                new Date(),

            delayDays: 0,

            principalAmount:
                principalPaid,

            interestAmount:
                interestAmount,

            penalty: 0,

            totalAmount:
                totalAmount,

            collectorType,

            collectorId,

            paymentMethod,

            receiptNo,

            remarks,

            status: "PAID"
        });

        // ------------------------------------------
        // REDUCE PRINCIPAL
        // ------------------------------------------

        loan.outstandingAmount =
            currentPrincipal -
            principalPaid;

        if (
            loan.outstandingAmount < 0
        ) {
            loan.outstandingAmount = 0;
        }

        // ------------------------------------------
        // TOTAL PAID
        // ------------------------------------------

        loan.totalPaid =
            Number(
                loan.totalPaid || 0
            ) +
            totalAmount;

        loan.lastPaymentDate =
            new Date();

        loan.lastInstallmentNo =
            currentInstallment;

        // ------------------------------------------
        // NEW MONTHLY INTEREST
        // ------------------------------------------

        const nextMonthlyInterest =
            Math.round(
                (
                    Number(
                        loan.outstandingAmount || 0
                    ) *
                    Number(
                        loan.interestRate || 0
                    )
                ) / 100
            );

        // ------------------------------------------
        // STATUS
        // ------------------------------------------

        if (
            loan.outstandingAmount <= 0
        ) {

            loan.status =
                "CLOSED";

            loan.closedDate =
                new Date();

            loan.closedBy =
                collectorType;

        } else {

            loan.status =
                "ACTIVE";
        }

        // ------------------------------------------
        // SAVE
        // ------------------------------------------

        await loan.save();

        // ------------------------------------------
        // RESPONSE
        // ------------------------------------------

        return res.status(201).json({

            success: true,

            message:
                "Fixed Interest + Principal Collected Successfully",

            receiptNo,

            collection: {

                installmentNo:
                    currentInstallment,

                previousPrincipal:
                    currentPrincipal,

                principalPaid,

                interestAmount,

                totalAmount,

                nextPrincipal:
                    loan.outstandingAmount,

                nextMonthlyInterest
            },

            loanSummary: {

                totalPaid:
                    loan.totalPaid,

                outstandingAmount:
                    loan.outstandingAmount,

                currentPrincipal:
                    loan.outstandingAmount,

                nextMonthlyInterest,

                status:
                    loan.status
            }
        });

    } catch (error) {

        console.error(
            "FIXED INTEREST + PRINCIPAL ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                error.message
        });
    }
};


// ==========================================
// GET LOAN DETAILS
// ==========================================

exports.getLoanDetails = async (req, res) => {

try{

const loan = await DailyLoan.findById(req.params.id)
  .populate(
    "member",
    "memberId memberName mobile fatherName"
  )
  .populate(
    "assignedAgent",
    "name mobile"
  );

if(!loan){

return res.status(404).json({

success:false,

message:"Loan Not Found"

});

}

const collections =
await LoanCollection.find({

loan:loan._id

})

.sort({

installmentNo:1,

paymentDate:1

});

res.json({

success:true,

loan,

collections

});

}catch(error){

console.log(error);

res.status(500).json({

success:false,

message:error.message

});

}

};
// ==========================================
// LOAN HISTORY
// ==========================================

exports.getLoanHistory = async(req,res)=>{

try{

const history =
await LoanCollection.find({

loan:req.params.loanId

})

.sort({

paymentDate:-1

});

res.json({

success:true,

history

});

}catch(error){

res.status(500).json({

success:false,

message:error.message

});

}

};
// ==========================================
// LOAN DASHBOARD
// ==========================================
// ==========================================
// LOAN DASHBOARD - TYPE WISE
// ==========================================

exports.loanDashboard = async (req, res) => {

    try {

        // ==========================================
        // GET LOAN TYPE
        // ==========================================

        const loanType = req.query.loanType || "DAILY";

        const allowedTypes = [
            "DAILY",
            "WEEKLY",
            "MONTHLY",
            "FIXED"
        ];

        if (!allowedTypes.includes(loanType)) {

            return res.status(400).json({
                success: false,
                message: "Invalid loan type"
            });

        }


        // ==========================================
        // BASIC LOAN COUNTS
        // ==========================================

        const totalLoans =
            await DailyLoan.countDocuments({
                loanType
            });


        const activeLoans =
            await DailyLoan.countDocuments({
                loanType,
                status: "ACTIVE"
            });


        const closedLoans =
            await DailyLoan.countDocuments({
                loanType,
                status: "CLOSED"
            });


        const overdueLoans =
            await DailyLoan.countDocuments({
                loanType,
                status: "OVERDUE"
            });


        // ==========================================
        // LOAN FINANCIAL SUMMARY
        // ==========================================

        const loanSummary =
            await DailyLoan.aggregate([

                {
                    $match: {
                        loanType
                    }
                },

                {
                    $group: {

                        _id: null,

                        loanAmount: {
                            $sum: "$loanAmount"
                        },

                        outstanding: {
                            $sum: "$outstandingAmount"
                        },

                        totalPaid: {
                            $sum: "$totalPaid"
                        },

                        interest: {
                            $sum: "$totalInterest"
                        }

                    }
                }

            ]);

            // ==========================================
// LOAN AMOUNT CURRENTLY IN FIELD
// IMPORTANT:
// Only loans which are still open.
// CLOSED / REJECTED loans are excluded.
// ==========================================

const loanAmountInFieldSummary =
    await DailyLoan.aggregate([
        {
            $match: {
                loanType,
                status: {
                    $in: [
                        "ACTIVE",
                        "DUE",
                        "OVERDUE"
                    ]
                }
            }
        },
        {
            $group: {
                _id: null,

                loanAmountInField: {
                    $sum: "$loanAmount"
                }
            }
        }
    ]);


        // ==========================================
        // GET ONLY SELECTED TYPE LOANS
        // ==========================================

        const selectedLoans =
            await DailyLoan.find({
                loanType
            }).select("_id");


        const loanIds =
            selectedLoans.map(
                loan => loan._id
            );


        // ==========================================
        // PENALTY - ONLY SELECTED LOAN TYPE
        // ==========================================

        const penaltySummary =
            await LoanCollection.aggregate([

                {
                    $match: {
                        loan: {
                            $in: loanIds
                        }
                    }
                },

                {
                    $group: {

                        _id: null,

                        penalty: {
                            $sum: "$penalty"
                        }

                    }
                }

            ]);


        // ==========================================
        // TODAY
        // ==========================================

        const today = new Date();

        today.setHours(0, 0, 0, 0);


        // ==========================================
        // PENDING / OVERDUE EMI
        // ONLY SELECTED LOAN TYPE
        // ==========================================

        const loans =
            await DailyLoan.find({
                loanType,
                status: {
                    $in: ["ACTIVE", "OVERDUE"]
                }
            });


        let overdueEmiAmount = 0;


        for (const loan of loans) {

            let dueInstallments = 0;


            const loanDate =
                new Date(loan.loanDate);

            loanDate.setHours(0, 0, 0, 0);


            // ======================================
            // DAILY
            // ======================================

            if (loan.loanType === "DAILY") {

                dueInstallments =
                    Math.floor(
                        (today - loanDate) /
                        (1000 * 60 * 60 * 24)
                    ) + 1;


                dueInstallments =
                    Math.min(
                        dueInstallments,
                        loan.durationDays || 0
                    );

            }


            // ======================================
            // WEEKLY
            // ======================================

            else if (loan.loanType === "WEEKLY") {

                dueInstallments =
                    Math.floor(
                        (today - loanDate) /
                        (1000 * 60 * 60 * 24 * 7)
                    ) + 1;


                dueInstallments =
                    Math.min(
                        dueInstallments,
                        loan.durationWeeks || 0
                    );

            }


            // ======================================
            // MONTHLY
            // ======================================

         // ======================================
// MONTHLY
// ======================================

else if (loan.loanType === "MONTHLY") {

    const monthDiff =
        (
            (today.getFullYear() - loanDate.getFullYear()) * 12
        ) +
        (
            today.getMonth() - loanDate.getMonth()
        );

    if (monthDiff <= 0) {

        dueInstallments = 0;

    } else if (
        today.getDate() >= loanDate.getDate()
    ) {

        dueInstallments = monthDiff;

    } else {

        dueInstallments = monthDiff - 1;

    }

    dueInstallments = Math.min(
        dueInstallments,
        loan.durationMonths || 0
    );
}


// ======================================
// FIXED
// ======================================

else if (loan.loanType === "FIXED") {

    const monthDiff =
        (
            (today.getFullYear() - loanDate.getFullYear()) * 12
        ) +
        (
            today.getMonth() - loanDate.getMonth()
        );

    if (monthDiff <= 0) {

        dueInstallments = 0;

    } else if (
        today.getDate() >= loanDate.getDate()
    ) {

        dueInstallments = monthDiff;

    } else {

        dueInstallments = monthDiff - 1;

    }

    dueInstallments = Math.min(
        dueInstallments,
        loan.loanTenureMonths || 0
    );
}


            if (dueInstallments < 0) {
                dueInstallments = 0;
            }


            const pendingInstallments =
                Math.max(
                    0,
                    dueInstallments -
                    (loan.completedInstallments || 0)
                );


            const pending =
                pendingInstallments *
                (loan.emiAmount || 0);


            overdueEmiAmount += pending;

        }


        // ==========================================
        // CURRENT MONTH COLLECTION
        // ONLY SELECTED LOAN TYPE
        // ==========================================

        const firstDay =
            new Date(
                today.getFullYear(),
                today.getMonth(),
                1
            );


        const currentMonthCollection =
            await LoanCollection.aggregate([

                {
                    $match: {

                        loan: {
                            $in: loanIds
                        },

                        paymentDate: {
                            $gte: firstDay,
                            $lte: new Date()
                        }

                    }
                },

                {
                    $group: {

                        _id: null,

                        total: {
                            $sum: "$totalAmount"
                        }

                    }
                }

            ]);


        const collection =
            currentMonthCollection[0]?.total || 0;


// ==========================================
// TODAY'S LOAN TARGET
// ONLY EMI DUE TODAY
// ==========================================

const todayStart = new Date();
todayStart.setHours(0, 0, 0, 0);

const tomorrow = new Date(todayStart);
tomorrow.setDate(
    tomorrow.getDate() + 1
);


let todayTarget = 0;

let todayCollected = 0;


// ==========================================
// GET TODAY'S COLLECTION
// ONLY SELECTED LOAN TYPE
// ==========================================

const todayCollectionSummary =
    await LoanCollection.aggregate([
        {
            $match: {
                loan: {
                    $in: loanIds
                },

                paymentDate: {
                    $gte: todayStart,
                    $lt: tomorrow
                }
            }
        },

        {
            $group: {
                _id: null,

                total: {
                    $sum: "$totalAmount"
                }
            }
        }
    ]);


todayCollected =
    todayCollectionSummary[0]?.total || 0;


// ==========================================
// CALCULATE TODAY'S TARGET
// ==========================================

for (const loan of loans) {

    const loanDate =
        new Date(
            loan.loanDate
        );

    loanDate.setHours(
        0,
        0,
        0,
        0
    );


    const emi =
        Number(
            loan.emiAmount || 0
        );


    let dueToday = false;


    // ==========================================
    // DAILY
    // ==========================================

    if (
        loan.loanType === "DAILY"
    ) {

        const daysPassed =
            Math.floor(
                (
                    todayStart -
                    loanDate
                ) /
                (1000 * 60 * 60 * 24)
            );


        const installmentNo =
            daysPassed + 1;


        if (
            installmentNo >= 1 &&
            installmentNo <=
                Number(
                    loan.durationDays || 0
                )
        ) {

            dueToday = true;

        }

    }


    // ==========================================
    // WEEKLY
    // ==========================================

    else if (
        loan.loanType === "WEEKLY"
    ) {

        const daysPassed =
            Math.floor(
                (
                    todayStart -
                    loanDate
                ) /
                (1000 * 60 * 60 * 24)
            );


        if (
            daysPassed >= 0 &&
            daysPassed % 7 === 0
        ) {

            const installmentNo =
                Math.floor(
                    daysPassed / 7
                ) + 1;


            if (
                installmentNo <=
                Number(
                    loan.durationWeeks || 0
                )
            ) {

                dueToday = true;

            }

        }

    }


    // ==========================================
    // MONTHLY
    // ==========================================

    else if (
        loan.loanType === "MONTHLY" ||
        loan.loanType === "FIXED"
    ) {

        if (
            todayStart >= loanDate &&
            todayStart.getDate() ===
                loanDate.getDate()
        ) {

            const monthDiff =
                (
                    (
                        todayStart.getFullYear() -
                        loanDate.getFullYear()
                    ) * 12
                ) +
                (
                    todayStart.getMonth() -
                    loanDate.getMonth()
                );


            const totalMonths =
                loan.loanType ===
                "MONTHLY"
                    ? Number(
                        loan.durationMonths || 0
                      )
                    : Number(
                        loan.loanTenureMonths || 0
                      );


            if (
                monthDiff >= 1 &&
                monthDiff <= totalMonths
            ) {

                dueToday = true;

            }

        }

    }


    if (dueToday) {

        todayTarget += emi;

    }

}


// ==========================================
// TODAY'S TARGET PENDING
// IMPORTANT:
// ONLY TODAY'S TARGET
// NO OLD OVERDUE AMOUNT
// ==========================================

const todayPending =
    Math.max(
        0,
        todayTarget -
        todayCollected
    );


        // RESPONSE

        res.json({

            success: true,
dashboard: {

    loanType,

    totalLoans,
    activeLoans,
    closedLoans,
    overdueLoans,

   loanAmount:
    loanSummary[0]?.loanAmount || 0,

loanAmountInField:
    loanAmountInFieldSummary[0]?.loanAmountInField || 0,

outstanding:
    loanSummary[0]?.outstanding || 0,


    totalPaid:
        loanSummary[0]?.totalPaid || 0,

    interest:
        loanSummary[0]?.interest || 0,

    penalty:
        penaltySummary[0]?.penalty || 0,

    overdueEmiAmount,

    monthlyCollection:
        collection,

    todayTarget,

    todayCollected,

    todayPending
}

        });


    } catch (error) {

        console.error(
            "Loan Dashboard Error:",
            error
        );

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};

// ==========================================
// CLOSE LOAN
// ==========================================

exports.closeLoan = async(req,res)=>{

try{

const loan =
await DailyLoan.findById(

req.params.id

);

if(!loan){

return res.status(404).json({

success:false,

message:"Loan Not Found"

});

}

loan.status="CLOSED";

loan.outstandingAmount=0;

loan.pendingInstallments=0;

loan.closedDate=

new Date();

loan.closedBy="ADMIN";

await loan.save();

res.json({

success:true,

message:"Loan Closed Successfully"

});

}catch(error){

res.status(500).json({

success:false,

message:error.message

});

}

};
exports.getAgentsByArea = async (req, res) => {
  try {
    const area = await AreaGroup.findById(req.params.areaId)
      .populate("assignedAgent", "name mobile")
      .populate("secondaryAgent", "name mobile");

    if (!area) {
      return res.status(404).json({
        success: false,
        message: "Area not found"
      });
    }

    const agents = [];

    if (area.assignedAgent) {
      agents.push(area.assignedAgent);
    }

    if (area.secondaryAgent) {
      agents.push(area.secondaryAgent);
    }

    res.json({
      success: true,
      agents
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
// ==========================================================
// IST DATE KEY
// ==========================================================

const getISTDateKey = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  const result = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      result[part.type] = part.value;
    }
  }

  return `${result.year}-${result.month}-${result.day}`;
};
// ==========================================================
// ADD MONTHS SAFELY
// ==========================================================
// Prevents JavaScript date overflow.
//
// Example:
// 31 Jan + 1 month
// should become 28 Feb / 29 Feb,
// not March.
//
// Used for MONTHLY and FIXED loan due dates.
// ==========================================================

const addMonthsUTC = (dateValue, months) => {
  const source = new Date(dateValue);

  if (Number.isNaN(source.getTime())) {
    return new Date(NaN);
  }

  const originalDay =
    source.getUTCDate();

  const result =
    new Date(source);

  // Start from day 1 so month changes
  // don't overflow into the next month.
  result.setUTCDate(1);

  result.setUTCMonth(
    result.getUTCMonth() +
    Number(months)
  );

  // Last day of target month
  const lastDay =
    new Date(
      Date.UTC(
        result.getUTCFullYear(),
        result.getUTCMonth() + 1,
        0
      )
    ).getUTCDate();

  result.setUTCDate(
    Math.min(
      originalDay,
      lastDay
    )
  );

  return result;
};


exports.getAgentLoans = async (req, res) => {
  try {

    // ===================================================
    // AGENT ID
    // ===================================================

    const agentId = req.params.agentId;

    // ===================================================
    // VALIDATE AGENT ID
    // ===================================================

    if (
      !agentId ||
      !mongoose.Types.ObjectId.isValid(agentId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid Agent ID"
      });
    }

    // ===================================================
    // GET ACTIVE AGENT LOANS
    // IMPORTANT:
    // areaGroup populate removed because DailyLoan
    // stores areaName as String.
    // ===================================================

    const loans =
      await DailyLoan.find({
        assignedAgent: agentId,

        status: {
          $in: [
            "ACTIVE",
            "DUE",
            "OVERDUE"
          ]
        }
      })
        .populate(
          "member",
          "memberName memberId mobile fatherName"
        )
        .sort({
          createdAt: -1
        })
        .lean();

    // ===================================================
    // GET ALL COLLECTIONS FOR THESE LOANS
    // ONE QUERY
    // ===================================================

    const loanIds =
      loans.map(
        (loan) => loan._id
      );

    const collections =
      loanIds.length > 0
        ? await LoanCollection.find({
            loan: {
              $in: loanIds
            }
          })
            .select(
              "loan installmentNo paymentDate dueDate totalAmount emiType status"
            )
            .lean()
        : [];

    // ===================================================
    // GROUP COLLECTIONS BY LOAN
    // ===================================================

    const collectionsByLoan =
      new Map();

    for (
      const collection of collections
    ) {

      if (!collection?.loan) {
        continue;
      }

      const loanId =
        collection.loan.toString();

      if (
        !collectionsByLoan.has(
          loanId
        )
      ) {
        collectionsByLoan.set(
          loanId,
          []
        );
      }

      collectionsByLoan
        .get(loanId)
        .push(collection);
    }

    // ===================================================
    // TODAY IN IST
    // ===================================================

    const todayKey =
      getISTDateKey(
        new Date()
      );

    const todayDate =
      new Date(
        `${todayKey}T00:00:00+05:30`
      );

    // ===================================================
    // PROCESS EACH LOAN
    // ===================================================

    const updatedLoans =
      loans.map((loan) => {

        // =================================================
        // LOAN ID
        // =================================================

        const loanId =
          loan._id.toString();

        // =================================================
        // GET COLLECTIONS FOR THIS LOAN
        // =================================================

        const loanCollections =
          collectionsByLoan.get(
            loanId
          ) || [];

        // =================================================
        // PAID INSTALLMENTS
        //
        // installmentNo = 0
        // means principal payment.
        //
        // It must NOT be treated as an EMI.
        // =================================================

        const paidInstallments =
          new Set(
            loanCollections
              .map(
                (item) =>
                  Number(
                    item.installmentNo
                  )
              )
              .filter(
                (no) =>
                  Number.isFinite(no)
              )
              .filter(
                (no) =>
                  no > 0
              )
          );

        // =================================================
        // LOAN DATE
        // =================================================

        if (!loan.loanDate) {

          return {
            ...loan,

            pastDueEMIs: 0,
            pastDueEMIAmount: 0,

            todayDueEMI: 0,
            todayDueEMIAmount: 0
          };
        }

        const loanDateKey =
          getISTDateKey(
            loan.loanDate
          );

        if (!loanDateKey) {

          return {
            ...loan,

            pastDueEMIs: 0,
            pastDueEMIAmount: 0,

            todayDueEMI: 0,
            todayDueEMIAmount: 0
          };
        }

        const loanDate =
          new Date(
            `${loanDateKey}T00:00:00+05:30`
          );

        // =================================================
        // TOTAL INSTALLMENTS
        //
        // FIXED:
        // No fixed EMI count.
        // It is monthly interest-only.
        // =================================================

        let totalInstallments = 0;

        if (
          loan.loanType ===
          "DAILY"
        ) {

          totalInstallments =
            Number(
              loan.durationDays || 0
            );

        } else if (
          loan.loanType ===
          "WEEKLY"
        ) {

          totalInstallments =
            Number(
              loan.durationWeeks || 0
            );

        } else if (
          loan.loanType ===
          "MONTHLY"
        ) {

          totalInstallments =
            Number(
              loan.durationMonths || 0
            );

        } else if (
          loan.loanType ===
          "FIXED"
        ) {

          // FIXED = monthly interest only.
          // There is no fixed EMI count.
          totalInstallments = 0;
        }

        // =================================================
        // HOW MANY INSTALLMENTS HAVE BECOME DUE?
        //
        // IMPORTANT:
        //
        // Loan date itself is NOT an EMI date.
        //
        // DAILY:
        // loanDate + 1 day
        //
        // WEEKLY:
        // loanDate + 7 days
        //
        // MONTHLY:
        // loanDate + 1 month
        //
        // FIXED:
        // loanDate + 1 month
        // =================================================

        let dueTillToday = 0;

        // =================================================
        // LOAN HAS NOT STARTED
        // =================================================

        if (
          todayDate <
          loanDate
        ) {

          dueTillToday = 0;

        }

        // =================================================
        // DAILY
        // =================================================

        else if (
          loan.loanType ===
          "DAILY"
        ) {

          const days =
            Math.floor(
              (
                todayDate -
                loanDate
              ) /
              86400000
            );

          // Loan date is NOT EMI date.
          //
          // Example:
          // 14 Sep -> 0
          // 15 Sep -> 1
          // 16 Sep -> 2
          // 17 Sep -> 3

          dueTillToday =
            Math.max(
              0,
              days
            );

          // DAILY has tenure.
          dueTillToday =
            Math.min(
              dueTillToday,
              totalInstallments
            );
        }

        // =================================================
        // WEEKLY
        // =================================================

        else if (
          loan.loanType ===
          "WEEKLY"
        ) {

          const days =
            Math.floor(
              (
                todayDate -
                loanDate
              ) /
              86400000
            );

          // First weekly EMI after 7 days.
          //
          // Example:
          // 14 Sep -> 0
          // 21 Sep -> 1
          // 28 Sep -> 2

          dueTillToday =
            Math.max(
              0,
              Math.floor(
                days / 7
              )
            );

          dueTillToday =
            Math.min(
              dueTillToday,
              totalInstallments
            );
        }

        // =================================================
        // MONTHLY / FIXED
        // =================================================

        else if (
          loan.loanType ===
            "MONTHLY" ||
          loan.loanType ===
            "FIXED"
        ) {

          const monthDiff =
            (
              (
                todayDate.getUTCFullYear() -
                loanDate.getUTCFullYear()
              ) * 12
            ) +
            (
              todayDate.getUTCMonth() -
              loanDate.getUTCMonth()
            );

          // No monthly EMI during same month.
          if (
            monthDiff <= 0
          ) {

            dueTillToday = 0;

          } else {

            // Start with number of months passed.
            let possibleInstallments =
              monthDiff;

            // Check whether the current month's
            // anniversary has actually arrived.
            const currentDueDate =
              addMonthsUTC(
                loanDate,
                possibleInstallments
              );

            if (
              currentDueDate >
              todayDate
            ) {
              possibleInstallments--;
            }

            dueTillToday =
              Math.max(
                0,
                possibleInstallments
              );
          }

          // MONTHLY has fixed tenure.
          if (
            loan.loanType ===
            "MONTHLY"
          ) {

            dueTillToday =
              Math.min(
                dueTillToday,
                totalInstallments
              );
          }

          // FIXED intentionally has
          // NO installment-count cap.
        }

        // =================================================
        // CALCULATE PAST DUE
        // =================================================

        let pastDueEMIs = 0;

        let pastDueEMIAmount = 0;

        let todayDueEMI = 0;

        let todayDueEMIAmount = 0;

        // =================================================
        // CHECK EACH UNPAID INSTALLMENT
        // =================================================

        for (
          let installmentNo = 1;

          installmentNo <=
          dueTillToday;

          installmentNo++
        ) {

          // =================================================
          // ALREADY PAID
          // =================================================

          if (
            paidInstallments.has(
              installmentNo
            )
          ) {
            continue;
          }

          // =================================================
          // CALCULATE CORRECT DUE DATE
          //
          // IMPORTANT:
          //
          // installment 1 is NOT loanDate.
          //
          // DAILY:
          // installment 1 = +1 day
          //
          // WEEKLY:
          // installment 1 = +7 days
          //
          // MONTHLY:
          // installment 1 = +1 month
          //
          // FIXED:
          // installment 1 = +1 month
          // =================================================

          let dueDate;

          if (
            loan.loanType ===
            "DAILY"
          ) {

            dueDate =
              new Date(
                loanDate
              );

            dueDate.setUTCDate(
              dueDate.getUTCDate() +
              installmentNo
            );

          } else if (
            loan.loanType ===
            "WEEKLY"
          ) {

            dueDate =
              new Date(
                loanDate
              );

            dueDate.setUTCDate(
              dueDate.getUTCDate() +
              (
                installmentNo * 7
              )
            );

          } else if (
            loan.loanType ===
              "MONTHLY" ||
            loan.loanType ===
              "FIXED"
          ) {

            dueDate =
              addMonthsUTC(
                loanDate,
                installmentNo
              );

          } else {

            continue;
          }

          // =================================================
          // DUE DATE KEY IN IST
          // =================================================

          const dueDateKey =
            getISTDateKey(
              dueDate
            );

          // =================================================
          // EMI AMOUNT
          // =================================================

          let emiAmount =
            Number(
              loan.emiAmount || 0
            );

          // =================================================
          // FIXED LOAN
          //
          // Monthly interest only.
          //
          // Example:
          // ₹50,000 × 2% = ₹1,000
          // =================================================

          if (
            loan.loanType ===
              "FIXED" &&
            emiAmount <= 0
          ) {

            const principal =
              Number(
                loan.outstandingAmount ??
                loan.loanAmount ??
                0
              );

            const rate =
              Number(
                loan.interestRate ??
                0
              );

            emiAmount =
              Math.round(
                (
                  principal *
                  rate
                ) / 100
              );
          }

          // =================================================
          // PAST DUE
          //
          // ONLY BEFORE TODAY
          //
          // TODAY'S EMI IS NOT PAST DUE.
          // =================================================

          if (
            dueDateKey <
            todayKey
          ) {

            pastDueEMIs += 1;

            pastDueEMIAmount +=
              emiAmount;
          }

          // =================================================
          // TODAY'S EMI
          // =================================================

          else if (
            dueDateKey ===
            todayKey
          ) {

            todayDueEMI += 1;

            todayDueEMIAmount +=
              emiAmount;
          }
        }

        // =================================================
        // RETURN UPDATED LOAN
        // =================================================

        return {
          ...loan,

          // Number of unpaid EMIs whose
          // due date is BEFORE today.
          pastDueEMIs,

          // Total amount of those past-due EMIs.
          pastDueEMIAmount,

          // Today's unpaid EMI count.
          todayDueEMI,

          // Today's unpaid EMI amount.
          todayDueEMIAmount
        };
      });

    // =====================================================
    // RESPONSE
    // =====================================================

    return res.json({
      success: true,
      loans: updatedLoans
    });

  } catch (error) {

    console.error(
      "GET AGENT LOANS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};




exports.createLoanRequest = async (req, res) => {
  try {
    const {
      member,
      loanAmount,
      interestRate,
      loanType,
      loanDate,
      startDate,
      durationDays,
      durationWeeks,
      durationMonths,
      loanTenureMonths,
      gracePeriod,
      penaltyType,
      penaltyValue,

      nomineeName,
      nomineeMobile,

      passportPhotoSubmitted,
      aadhaarNumber,
      aadhaarSubmitted,
      panNumber,
      panSubmitted,
      cheque1Number,
      cheque2Number,
      cheque1Submitted,
      cheque2Submitted,
      stampPaperSubmitted,

      securityType,
      securityDetails,

      guarantor1Name,
      guarantor1FatherName,
      guarantor1Gender,
      guarantor1Dob,
      guarantor1Mobile,
      guarantor1AlternateMobile,
      guarantor1Email,
      guarantor1Address,
      guarantor1City,
      guarantor1District,
      guarantor1State,
      guarantor1Pincode,
      guarantor1PhotoSubmitted,
      guarantor1AadhaarNumber,
      guarantor1AadhaarSubmitted,
      guarantor1PanNumber,
      guarantor1PanSubmitted,
      guarantor1Cheque1Number,
      guarantor1Cheque2Number,
      guarantor1Cheque1Submitted,
      guarantor1Cheque2Submitted,
      guarantor1StampPaperSubmitted,
      guarantor1SecurityType,
      guarantor1SecurityDetails,

      guarantor2Name,
      guarantor2FatherName,
      guarantor2Gender,
      guarantor2Dob,
      guarantor2Mobile,
      guarantor2AlternateMobile,
      guarantor2Email,
      guarantor2Address,
      guarantor2City,
      guarantor2District,
      guarantor2State,
      guarantor2Pincode,
      guarantor2PhotoSubmitted,
      guarantor2AadhaarNumber,
      guarantor2AadhaarSubmitted,
      guarantor2PanNumber,
      guarantor2PanSubmitted,
      guarantor2Cheque1Number,
      guarantor2Cheque2Number,
      guarantor2Cheque1Submitted,
      guarantor2Cheque2Submitted,
      guarantor2StampPaperSubmitted,
      guarantor2SecurityType,
      guarantor2SecurityDetails,
      remarks
    } = req.body;

   

    // ------------------------------------------
    // BASIC VALIDATION
    // ------------------------------------------

    if (!member) {
      return res.status(400).json({
        success: false,
        message: "Member is required"
      });
    }

    if (!loanAmount || Number(loanAmount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid loan amount is required"
      });
    }

    if (!interestRate && Number(interestRate) !== 0) {
      return res.status(400).json({
        success: false,
        message: "Interest rate is required"
      });
    }

    if (!loanType) {
      return res.status(400).json({
        success: false,
        message: "Loan type is required"
      });
    }

    // ------------------------------------------
    // CHECK MEMBER
    // ------------------------------------------

    const memberData = await DailyMember.findById(member)
  .populate("areaGroup", "areaName")
  .populate("assignedAgent", "name mobile");

    if (!memberData) {
      return res.status(404).json({
        success: false,
        message: "Member not found"
      });
    }

    if (memberData.status !== "ACTIVE") {
      return res.status(400).json({
        success: false,
        message: "Member is not active"
      });
    }

// ------------------------------------------
// CHECK AREA & ASSIGNED AGENT
// ------------------------------------------

if (!memberData.areaGroup) {
  return res.status(400).json({
    success: false,
    message: "Member does not have an Area assigned"
  });
}

if (!memberData.assignedAgent) {
  return res.status(400).json({
    success: false,
    message: "Member does not have an Agent assigned"
  });
}

    // ------------------------------------------
    // VALIDATE DURATION
    // ------------------------------------------

    if (loanType === "DAILY" && Number(durationDays) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Duration in days is required"
      });
    }

    if (loanType === "WEEKLY" && Number(durationWeeks) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Duration in weeks is required"
      });
    }

    if (loanType === "MONTHLY" && Number(durationMonths) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Duration in months is required"
      });
    }

    // ------------------------------------------
    // CALCULATE END DATE
    // ------------------------------------------

    const actualStartDate = startDate || loanDate || new Date();

    const calculatedStartDate = new Date(actualStartDate);

    if (Number.isNaN(calculatedStartDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid loan start date"
      });
    }

    const endDate = new Date(calculatedStartDate);

    if (loanType === "DAILY") {
      endDate.setDate(
        endDate.getDate() + Number(durationDays)
      );
    }

    if (loanType === "WEEKLY") {
      endDate.setDate(
        endDate.getDate() + Number(durationWeeks) * 7
      );
    }

    if (loanType === "MONTHLY") {
      endDate.setMonth(
        endDate.getMonth() + Number(durationMonths)
      );
    }

    if (loanType === "FIXED") {
      endDate.setMonth(
        endDate.getMonth() + Number(loanTenureMonths || 1)
      );
    }
    

    // ------------------------------------------
    // CALCULATE LOAN VALUES
    // ------------------------------------------

    const amount = Number(loanAmount);
    const rate = Number(interestRate);

    let totalInterest = 0;
    let totalPayable = 0;
    let emiAmount = 0;
    let totalInstallments = 1;

    if (loanType === "DAILY") {
      totalInstallments = Number(durationDays);

      totalInterest = Math.round(
        (amount * rate * Number(loanTenureMonths || 0)) / 100
      );

      totalPayable = amount + totalInterest;

      emiAmount = Math.ceil(
        totalPayable / totalInstallments
      );
    }

    if (loanType === "WEEKLY") {
      totalInstallments = Number(durationWeeks);

      totalInterest = Math.round(
        (amount * rate * Number(loanTenureMonths || 0)) / 100
      );

      totalPayable = amount + totalInterest;

      emiAmount = Math.ceil(
        totalPayable / totalInstallments
      );
    }

    if (loanType === "MONTHLY") {
      totalInstallments = Number(durationMonths);

      totalInterest = Math.round(
        (amount * rate * Number(loanTenureMonths || 0)) / 100
      );

      totalPayable = amount + totalInterest;

      emiAmount = Math.ceil(
        totalPayable / totalInstallments
      );
    }
if (loanType === "FIXED") {
  // FIXED loan = interest only every month
  // Principal is paid separately when the loan is closed

  totalInstallments = 0;

  // Monthly interest
  const monthlyInterest = Math.round(
    (amount * rate) / 100
  );

  totalInterest = monthlyInterest;

  // Principal remains outstanding
  totalPayable = amount;

  // Monthly amount to collect = interest only
  emiAmount = monthlyInterest;
}
    // ------------------------------------------
    // CREATE REQUEST
    // ------------------------------------------

    const request = await DailyLoanRequest.create({
      member: memberData._id,

      memberId: memberData.memberId,
      borrowerName: memberData.memberName,
      fatherName: memberData.fatherName,
      gender: memberData.gender,
      dob: memberData.dob,
      mobile: memberData.mobile,
      alternateMobile: memberData.alternateMobile,
      email: memberData.email,
      address: memberData.residentialAddress,
      city: memberData.city,
      district: memberData.district,
      state: memberData.state,
      pincode: memberData.pincode,

 areaName: memberData.areaGroup.areaName,
assignedAgent: memberData.assignedAgent._id,

      loanAmount: amount,
      interestRate: rate,
      loanType,

      durationDays: Number(durationDays || 0),
      durationWeeks: Number(durationWeeks || 0),
      durationMonths: Number(durationMonths || 0),
      loanTenureMonths: Number(loanTenureMonths || 10),

      loanDate: calculatedStartDate,
      startDate: calculatedStartDate,
      endDate,

      totalInterest,
      totalPayable,
      emiAmount,
      totalInstallments,

      nomineeName: nomineeName || "",
      nomineeMobile: nomineeMobile || "",

      passportPhotoSubmitted:
        Boolean(passportPhotoSubmitted),

      aadhaarNumber: aadhaarNumber || "",
      aadhaarSubmitted:
        Boolean(aadhaarSubmitted),

      panNumber: panNumber || "",
      panSubmitted:
        Boolean(panSubmitted),

      cheque1Number: cheque1Number || "",
      cheque2Number: cheque2Number || "",

      cheque1Submitted:
        Boolean(cheque1Submitted),

      cheque2Submitted:
        Boolean(cheque2Submitted),

      stampPaperSubmitted:
        Boolean(stampPaperSubmitted),

      securityType:
        securityType || "UNSECURED",

      securityDetails:
        securityDetails || "",

      // GUARANTOR 1
      guarantor1Name: guarantor1Name || "",
      guarantor1FatherName: guarantor1FatherName || "",
      guarantor1Gender: guarantor1Gender || "",
      guarantor1Dob: guarantor1Dob || null,
      guarantor1Mobile: guarantor1Mobile || "",
      guarantor1AlternateMobile:
        guarantor1AlternateMobile || "",
      guarantor1Email: guarantor1Email || "",
      guarantor1Address: guarantor1Address || "",
      guarantor1City: guarantor1City || "",
      guarantor1District: guarantor1District || "",
      guarantor1State: guarantor1State || "",
      guarantor1Pincode: guarantor1Pincode || "",

      guarantor1PhotoSubmitted:
        Boolean(guarantor1PhotoSubmitted),

      guarantor1AadhaarNumber:
        guarantor1AadhaarNumber || "",

      guarantor1AadhaarSubmitted:
        Boolean(guarantor1AadhaarSubmitted),

      guarantor1PanNumber:
        guarantor1PanNumber || "",

      guarantor1PanSubmitted:
        Boolean(guarantor1PanSubmitted),

      guarantor1Cheque1Number:
        guarantor1Cheque1Number || "",

      guarantor1Cheque2Number:
        guarantor1Cheque2Number || "",

      guarantor1Cheque1Submitted:
        Boolean(guarantor1Cheque1Submitted),

      guarantor1Cheque2Submitted:
        Boolean(guarantor1Cheque2Submitted),

      guarantor1StampPaperSubmitted:
        Boolean(guarantor1StampPaperSubmitted),

      guarantor1SecurityType:
        guarantor1SecurityType || "UNSECURED",

      guarantor1SecurityDetails:
        guarantor1SecurityDetails || "",

      // GUARANTOR 2
      guarantor2Name: guarantor2Name || "",
      guarantor2FatherName: guarantor2FatherName || "",
      guarantor2Gender: guarantor2Gender || "",
      guarantor2Dob: guarantor2Dob || null,
      guarantor2Mobile: guarantor2Mobile || "",
      guarantor2AlternateMobile:
        guarantor2AlternateMobile || "",
      guarantor2Email: guarantor2Email || "",
      guarantor2Address: guarantor2Address || "",
      guarantor2City: guarantor2City || "",
      guarantor2District: guarantor2District || "",
      guarantor2State: guarantor2State || "",
      guarantor2Pincode: guarantor2Pincode || "",

      guarantor2PhotoSubmitted:
        Boolean(guarantor2PhotoSubmitted),

      guarantor2AadhaarNumber:
        guarantor2AadhaarNumber || "",

      guarantor2AadhaarSubmitted:
        Boolean(guarantor2AadhaarSubmitted),

      guarantor2PanNumber:
        guarantor2PanNumber || "",

      guarantor2PanSubmitted:
        Boolean(guarantor2PanSubmitted),

      guarantor2Cheque1Number:
        guarantor2Cheque1Number || "",

      guarantor2Cheque2Number:
        guarantor2Cheque2Number || "",

      guarantor2Cheque1Submitted:
        Boolean(guarantor2Cheque1Submitted),

      guarantor2Cheque2Submitted:
        Boolean(guarantor2Cheque2Submitted),

      guarantor2StampPaperSubmitted:
        Boolean(guarantor2StampPaperSubmitted),

      guarantor2SecurityType:
        guarantor2SecurityType || "UNSECURED",

      guarantor2SecurityDetails:
        guarantor2SecurityDetails || "",

      gracePeriod: Number(gracePeriod || 0),

      penaltyType:
        penaltyType || "PERCENTAGE",

      penaltyValue:
        Number(penaltyValue || 0),

      remarks: remarks || "",

      status: "PENDING"
    });

    return res.status(201).json({
      success: true,
      message: "Loan request submitted successfully. Waiting for admin approval.",
      request
    });

  } catch (error) {
    console.error("CREATE LOAN REQUEST ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==========================================================
// ADMIN - GET ALL LOAN REQUESTS
// ==========================================================

exports.getLoanRequests = async (req, res) => {
  try {
    const requests = await DailyLoanRequest.find()
      .populate(
        "member",
        "memberName memberId mobile"
      )
      .populate(
        "assignedAgent",
        "name mobile agentId"
      )
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      requests
    });

  } catch (error) {
    console.error("GET LOAN REQUESTS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// ==========================================================
// AGENT - GET OWN LOAN REQUESTS
// ==========================================================

exports.getLoanRequestsByAgent = async (req, res) => {
  try {
    const { agentId } = req.params;

    const requests = await DailyLoanRequest.find({
      assignedAgent: agentId
    })
      .populate(
        "member",
        "memberName memberId mobile"
      )
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      requests
    });

  } catch (error) {
    console.error(
      "GET AGENT LOAN REQUESTS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==========================================================
// ADMIN - APPROVE LOAN REQUEST
// This is the ONLY point where actual DailyLoan is created.
// ==========================================================

exports.approveLoanRequest = async (req, res) => {
  try {
    
    const { id } = req.params;
    const request = await DailyLoanRequest.
    findById(id);
    if (!request) {

      return res.status(404).json({
        success: false,
        message: "Loan request not found"
      });
    }

    if (request.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: `Request is already ${request.status}`
      });
    }

    // ------------------------------------------
    // MEMBER CHECK
    // ------------------------------------------

   const member = await DailyMember.findById(
  request.member
)
  .populate("areaGroup", "areaName")
  .populate("assignedAgent", "name mobile email");

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found"
      });
    }

    if (member.status !== "ACTIVE") {
      return res.status(400).json({
        success: false,
        message: "Member is not active"
      });
    }
// ------------------------------------------
// AREA & AGENT CHECK
// ------------------------------------------

if (!member.areaGroup) {
  return res.status(400).json({
    success: false,
    message: "Member does not have an Area assigned"
  });
}

if (!member.assignedAgent) {
  return res.status(400).json({
    success: false,
    message: "Member does not have an Agent assigned"
  });
}
    // ------------------------------------------
    // GENERATE UNIQUE LOAN NUMBER
    // ------------------------------------------

    const lastLoan = await DailyLoan.findOne()
      .sort({ createdAt: -1 });

    let nextNumber = 1;

    if (lastLoan?.loanNumber) {
      const match =
        String(lastLoan.loanNumber).match(
          /(\d+)$/
        );

      if (match) {
        nextNumber =
          Number(match[1]) + 1;
      }
    }

    let loanNumber =
      `LN${String(nextNumber).padStart(6, "0")}`;

    // Extra protection against duplicate number
    let exists = await DailyLoan.findOne({
      loanNumber
    });

    while (exists) {
      nextNumber++;

      loanNumber =
        `LN${String(nextNumber).padStart(6, "0")}`;

      exists = await DailyLoan.findOne({
        loanNumber
      });
    }

    // ------------------------------------------
    // CREATE ACTUAL LOAN
    // ------------------------------------------

    const loan = await DailyLoan.create({
      member: member._id,

      memberId: member.memberId,

      borrowerName: member.memberName,
      fatherName: member.fatherName,
      gender: member.gender,
      dob: member.dob,
      mobile: member.mobile,
      alternateMobile: member.alternateMobile,
      email: member.email,

      address: member.residentialAddress,
      city: member.city,
      district: member.district,
      state: member.state,
      pincode: member.pincode,

      areaName: member.areaGroup.areaName,

assignedAgent: member.assignedAgent._id,

loanNumber: loanNumber,

loanAmount: request.loanAmount,

      interestRate:
        request.interestRate,

      loanType:
        request.loanType,

      durationDays:
        request.durationDays || 0,

      durationWeeks:
        request.durationWeeks || 0,

      durationMonths:
        request.durationMonths || 0,

      loanTenureMonths:
        request.loanTenureMonths || 10,

      startDate:
        request.startDate,

      endDate:
        request.endDate,

      loanDate:
        request.loanDate,

      totalInterest:
        request.totalInterest,

      totalPayable:
        request.totalPayable,

      emiAmount:
        request.emiAmount,

      totalPaid: 0,

      outstandingAmount:
        request.loanType === "FIXED"
          ? request.loanAmount
          : request.totalPayable,

      completedInstallments: 0,

      pendingInstallments:
        request.totalInstallments,

      lastInstallmentNo: 0,

      status: "ACTIVE",

      nomineeName:
        request.nomineeName || "",

      nomineeMobile:
        request.nomineeMobile || "",

      passportPhotoSubmitted:
        request.passportPhotoSubmitted,

      aadhaarNumber:
        request.aadhaarNumber || "",

      aadhaarSubmitted:
        request.aadhaarSubmitted,

      panNumber:
        request.panNumber || "",

      panSubmitted:
        request.panSubmitted,

      cheque1Number:
        request.cheque1Number || "",

      cheque2Number:
        request.cheque2Number || "",

      cheque1Submitted:
        request.cheque1Submitted,

      cheque2Submitted:
        request.cheque2Submitted,

      stampPaperSubmitted:
        request.stampPaperSubmitted,

      securityType:
        request.securityType,

      securityDetails:
        request.securityDetails,

      // GUARANTOR 1
      guarantor1Name:
        request.guarantor1Name,

      guarantor1FatherName:
        request.guarantor1FatherName,

      guarantor1Gender:
        request.guarantor1Gender,

      guarantor1Dob:
        request.guarantor1Dob,

      guarantor1Mobile:
        request.guarantor1Mobile,

      guarantor1AlternateMobile:
        request.guarantor1AlternateMobile,

      guarantor1Email:
        request.guarantor1Email,

      guarantor1Address:
        request.guarantor1Address,

      guarantor1City:
        request.guarantor1City,

      guarantor1District:
        request.guarantor1District,

      guarantor1State:
        request.guarantor1State,

      guarantor1Pincode:
        request.guarantor1Pincode,

      guarantor1PhotoSubmitted:
        request.guarantor1PhotoSubmitted,

      guarantor1AadhaarNumber:
        request.guarantor1AadhaarNumber,

      guarantor1AadhaarSubmitted:
        request.guarantor1AadhaarSubmitted,

      guarantor1PanNumber:
        request.guarantor1PanNumber,

      guarantor1PanSubmitted:
        request.guarantor1PanSubmitted,

      guarantor1Cheque1Number:
        request.guarantor1Cheque1Number,

      guarantor1Cheque2Number:
        request.guarantor1Cheque2Number,

      guarantor1Cheque1Submitted:
        request.guarantor1Cheque1Submitted,

      guarantor1Cheque2Submitted:
        request.guarantor1Cheque2Submitted,

      guarantor1StampPaperSubmitted:
        request.guarantor1StampPaperSubmitted,

      guarantor1SecurityType:
        request.guarantor1SecurityType,

      guarantor1SecurityDetails:
        request.guarantor1SecurityDetails,

      // GUARANTOR 2
      guarantor2Name:
        request.guarantor2Name,

      guarantor2FatherName:
        request.guarantor2FatherName,

      guarantor2Gender:
        request.guarantor2Gender,

      guarantor2Dob:
        request.guarantor2Dob,

      guarantor2Mobile:
        request.guarantor2Mobile,

      guarantor2AlternateMobile:
        request.guarantor2AlternateMobile,

      guarantor2Email:
        request.guarantor2Email,

      guarantor2Address:
        request.guarantor2Address,

      guarantor2City:
        request.guarantor2City,

      guarantor2District:
        request.guarantor2District,

      guarantor2State:
        request.guarantor2State,

      guarantor2Pincode:
        request.guarantor2Pincode,

      guarantor2PhotoSubmitted:
        request.guarantor2PhotoSubmitted,

      guarantor2AadhaarNumber:
        request.guarantor2AadhaarNumber,

      guarantor2AadhaarSubmitted:
        request.guarantor2AadhaarSubmitted,

      guarantor2PanNumber:
        request.guarantor2PanNumber,

      guarantor2PanSubmitted:
        request.guarantor2PanSubmitted,

      guarantor2Cheque1Number:
        request.guarantor2Cheque1Number,

      guarantor2Cheque2Number:
        request.guarantor2Cheque2Number,

      guarantor2Cheque1Submitted:
        request.guarantor2Cheque1Submitted,

      guarantor2Cheque2Submitted:
        request.guarantor2Cheque2Submitted,

      guarantor2StampPaperSubmitted:
        request.guarantor2StampPaperSubmitted,

      guarantor2SecurityType:
        request.guarantor2SecurityType,

      guarantor2SecurityDetails:
        request.guarantor2SecurityDetails,

      gracePeriod:
        request.gracePeriod,

      penaltyType:
        request.penaltyType,

      penaltyValue:
        request.penaltyValue,

      remarks:
        request.remarks
    });

    // ------------------------------------------
    // UPDATE REQUEST
    // ------------------------------------------

    request.status = "APPROVED";
    request.approvedBy =
      req.user?._id || req.user?.id || null;
    request.approvedAt = new Date();

    await request.save();

    return res.json({
      success: true,
      message: "Loan approved successfully",
      loan
    });

  } catch (error) {
    console.error(
      "APPROVE LOAN REQUEST ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// ==========================================================
// ADMIN - REJECT LOAN REQUEST
// ==========================================================

exports.rejectLoanRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      rejectionReason
    } = req.body;

    const request =
      await DailyLoanRequest.findById(id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Loan request not found"
      });
    }

    if (request.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: `Request is already ${request.status}`
      });
    }

    request.status = "REJECTED";

    request.rejectedBy =
      req.user?._id ||
      req.user?.id ||
      null;

    request.rejectedAt =
      new Date();

    request.rejectionReason =
      rejectionReason || "Rejected by admin";

    await request.save();

    return res.json({
      success: true,
      message: "Loan request rejected successfully"
    });

  } catch (error) {
    console.error(
      "REJECT LOAN REQUEST ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


exports.giveMoreLoan = async (req, res) => {
  try {
    const {
      loanId,
      additionalAmount,
      collectorType,
      collectorId
    } = req.body;

    if (!loanId) {
      return res.status(400).json({
        success: false,
        message: "Loan ID is required"
      });
    }

    const amount = Number(additionalAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid additional loan amount"
      });
    }

    const loan = await DailyLoan.findById(loanId);

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: "Loan not found"
      });
    }

    if (loan.loanType !== "FIXED") {
      return res.status(400).json({
        success: false,
        message: "Additional loan is allowed only for FIXED loans"
      });
    }

    // Current outstanding principal
    const currentPrincipal = Number(
      loan.outstandingAmount ?? loan.loanAmount ?? 0
    );

    // Add new loan amount
    const newPrincipal = currentPrincipal + amount;

    loan.outstandingAmount = newPrincipal;

    // Recalculate monthly interest
    const interestRate = Number(loan.interestRate || 0);

    const newMonthlyInterest = Math.round(
      (newPrincipal * interestRate) / 100
    );

    // For FIXED loan, emiAmount represents monthly interest
    loan.emiAmount = newMonthlyInterest;

    // IMPORTANT:
    // Do NOT increase totalPaid.
    // Additional loan is money given, not money collected.

    await loan.save();

    return res.status(200).json({
      success: true,
      message: "Additional Loan Given Successfully",
      loan,
      additionalAmount: amount,
      previousPrincipal: currentPrincipal,
      newPrincipal,
      monthlyInterest: newMonthlyInterest
    });

  } catch (error) {
    console.error("GIVE MORE LOAN ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
