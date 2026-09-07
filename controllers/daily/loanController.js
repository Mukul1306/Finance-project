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
areaName,
    assignedAgent,

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

const memberData =
    await DailyMember.findById(member);

if(!memberData){
    return res.status(404).json({
        success:false,
        message:"Member Not Found"
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

areaName,
assignedAgent,

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

    const loans = await DailyLoan.find()
      .populate("member", "memberId memberName mobile")
      .populate("assignedAgent", "name mobile")
      .sort({ createdAt: -1 })
      .lean();


    // No loans
    if (!loans.length) {

      return res.json({
        success: true,
        loans: []
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

          totalInstallments =
            Number(loan.loanTenureMonths || 0);

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

          else {

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

        let currentStatus;


        // FIXED
        if (
          loan.loanType === "FIXED"
        ) {


          if (
            Number(
              loan.outstandingAmount || 0
            ) <= 0
          ) {

            currentStatus =
              "CLOSED";

          }

          else if (
            hasOverduePending
          ) {

            currentStatus =
              "OVERDUE";

          }

          else {

            currentStatus =
              "ACTIVE";

          }

        }


        // DAILY / WEEKLY / MONTHLY
        else {


          if (
            Number(
              loan.pendingInstallments || 0
            ) === 0 ||

            Number(
              loan.outstandingAmount || 0
            ) <= 0
          ) {

            currentStatus =
              "CLOSED";

          }

          else if (
            hasOverduePending
          ) {

            currentStatus =
              "OVERDUE";

          }

          else {

            currentStatus =
              "ACTIVE";

          }

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

    });

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
// GET MEMBER DETAILS
// ==========================================

exports.getLoanMemberDetails = async (req, res) => {

  try {

    const member = await DailyMember.findById(req.params.memberId);

    if (!member) {

      return res.status(404).json({
        success: false,
        message: "Member Not Found"
      });

    }

    res.json({

      success: true,

      member,

      areaGroup: null,

      assignedAgent: null

    });

  } catch (error) {

    res.status(500).json({

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


let displayEmi = loan.emiAmount;

if (loan.loanType === "FIXED") {

    displayEmi = Math.round(
        loan.totalInterest / loan.loanTenureMonths
    );

}

const totalAmount =
displayEmi + penalty;

console.log({
    loanType: loan.loanType,
    loanDate: loan.loanDate,
    today,
    totalInstallments,
    dueTillToday
});


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
    summaryEmi = Math.round(
        loan.totalInterest / loan.loanTenureMonths
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
// NEXT PART STARTS HERE
// UPDATE LOAN
// ==========================================

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


// ==========================================
// COLLECT PRINCIPAL (FIXED LOAN)
// ==========================================

exports.collectPrincipal = async (req, res) => {

try{

const{

loanId,
collectorType,
collectorId,
paymentMethod,
amount,
remarks

}=req.body;

const loan =
await DailyLoan.findById(loanId);

if(!loan){

return res.status(404).json({

success:false,
message:"Loan Not Found"

});

}

const principalAmount =
Number(amount);

if(principalAmount<=0){

return res.status(400).json({

success:false,
message:"Invalid Amount"

});

}

if(principalAmount>loan.outstandingAmount){

return res.status(400).json({

success:false,
message:"Amount exceeds Outstanding Amount"

});

}

const receiptNo =
"PRN-"+Date.now();

// ==========================================
// SAVE COLLECTION
// ==========================================

await LoanCollection.create({

loan:loan._id,

member:loan.member,

installmentNo:0,

emiType:"PRINCIPAL",

dueDate:new Date(),

paymentDate:new Date(),

delayDays:0,

principalAmount,

interestAmount:0,

penalty:0,

totalAmount:principalAmount,

collectorType,

collectorId,

paymentMethod,

receiptNo,

remarks,

status:"PAID"

});

// ==========================================
// UPDATE LOAN
// ==========================================

// Customer paid (EMI + Penalty)

loan.totalPaid += principalAmount;

loan.outstandingAmount -= principalAmount;

if (loan.outstandingAmount < 0) {
    loan.outstandingAmount = 0;
}

loan.lastPaymentDate =
new Date();

// ==========================================
// CLOSE LOAN
// ==========================================

if(loan.outstandingAmount===0){

loan.status="CLOSED";

loan.closedDate=
new Date();

loan.closedBy=
collectorType;

}

await loan.save();

// ==========================================
// RESPONSE
// ==========================================

return res.status(201).json({

success:true,

message:"Principal Collected Successfully",

receiptNo,

collection:{

principalAmount,

paymentDate:new Date()

},

loanSummary:{

totalPaid:
loan.totalPaid,

outstandingAmount:
loan.outstandingAmount,

status:
loan.status

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


        // ==========================================
        // RESPONSE
        // ==========================================

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

exports.getAgentLoans = async (req, res) => {

  try {

    const agentId = req.params.agentId;

    const loans = await DailyLoan.find({

      assignedAgent: agentId,

      status: {
        $in: ["ACTIVE", "DUE", "OVERDUE"]
      }

    })
    .populate("member", "memberName memberId mobile")
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

// ==========================================================
// AGENT - CREATE LOAN REQUEST
// Agent can REQUEST a loan.
// Agent does NOT create the actual DailyLoan.
// ==========================================================

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

      areaName,
      remarks
    } = req.body;

    // ------------------------------------------
    // AGENT ID
    // ------------------------------------------

    const agentId =
      req.user?._id ||
      req.user?.id ||
      req.body.agentId;

    if (!agentId) {
      return res.status(400).json({
        success: false,
        message: "Agent ID is required"
      });
    }

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

    const memberData = await DailyMember.findById(member);

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
    // CHECK AGENT
    // ------------------------------------------

    const agent = await Agent.findById(agentId);

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: "Agent not found"
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
      totalInstallments = 1;

      totalInterest = Math.round(
        (amount * rate) / 100
      );

      totalPayable = amount + totalInterest;

      emiAmount = totalInterest;
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

      areaName: areaName || "",

      assignedAgent: agentId,

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

    const request = await DailyLoanRequest.findById(id);

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
    );

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

      areaName: request.areaName || "",

     assignedAgent:
  request.assignedAgent || null,

loanNumber:
  loanNumber,

loanAmount:
  request.loanAmount,

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
