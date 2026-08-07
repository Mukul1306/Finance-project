const DailyLoan = require("../../models/daily/DailyLoan");
const DailyMember = require("../../models/daily/DailyMember");
const DailySaving = require("../../models/daily/DailySaving");
const LoanCollection = require("../../models/daily/LoanCollection");
const AreaGroup = require("../../models/daily/AreaGroup");
const Agent = require("../../models/daily/Agent");



// ==========================================
// LOAN CALCULATION HELPER
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

    loanAmount = Number(loanAmount);
    interestRate = Number(interestRate);
    loanTenureMonths = Number(loanTenureMonths);

    durationDays = Number(durationDays);
    durationWeeks = Number(durationWeeks);
    durationMonths = Number(durationMonths);

    let totalInterest = 0;
    let totalPayable = 0;
    let emiAmount = 0;
    let totalInstallments = 1;

    // ======================================
    // TOTAL INTEREST
    // ======================================

    totalInterest = Math.round(
        (loanAmount * interestRate * loanTenureMonths) / 100
    );

    totalPayable =
        loanAmount + totalInterest;

    // ======================================
    // EMI
    // ======================================

    switch (loanType) {

        case "DAILY":

            totalInstallments =
                durationDays;

            emiAmount = Math.ceil(
                totalPayable /
                durationDays
            );

            break;

        case "WEEKLY":

            totalInstallments =
                durationWeeks;

            emiAmount = Math.ceil(
                totalPayable /
                durationWeeks
            );

            break;

        case "MONTHLY":

            totalInstallments =
                durationMonths;

            emiAmount = Math.ceil(
                totalPayable /
                durationMonths
            );

            break;

        case "FIXED":

            totalInstallments = 1;

            emiAmount =
                totalInterest;

            break;

    }

    return {

        totalInterest,

        totalPayable,

        emiAmount,

        totalInstallments

    };

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
const existingLoan = await DailyLoan.findOne({
    member,
    status: "ACTIVE"
});

if(existingLoan){
    return res.status(400).json({
        success:false,
        message:"Member already has Active Loan"
    });
}

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

endDate.getMonth()+
Number(durationMonths)

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
totalPayable,

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

exports.getLoans = async (req, res) => {

try{

const loans = await DailyLoan.find()
  .populate("member", "memberId memberName mobile")
  .populate("assignedAgent", "name mobile")
  .sort({ createdAt: -1 });

res.json({

success:true,

loans

});

}catch(error){

res.status(500).json({

success:false,

message:error.message

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
loan.outstandingAmount =
  result.totalPayable - loan.totalPaid;

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

if(loan.loanType==="FIXED"){

return res.json({

success:true,

installments:[]

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

const totalInstallments =

loan.loanType==="DAILY"

? loan.durationDays

: loan.loanType==="WEEKLY"

? loan.durationWeeks

: loan.durationMonths;

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

else if (loan.loanType === "MONTHLY") {

  dueTillToday =
    (today.getFullYear() - loanDate.getFullYear()) * 12 +
    (today.getMonth() - loanDate.getMonth()) + 1;

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

else if(loan.loanType==="MONTHLY"){

dueDate.setMonth(

dueDate.getMonth()+(i-1)

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

else{

delay=

(today.getFullYear()-dueDate.getFullYear())*12+

(today.getMonth()-dueDate.getMonth());

}

}
// ==========================================
// PENALTY CALCULATION
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

    // MONTHLY & FIXED → Old Logic
    else {

        const chargeableDays =
            delay - loan.gracePeriod;

        if (loan.penaltyType === "PERCENTAGE") {

            penalty =
                Math.round(
                    (loan.emiAmount * loan.penaltyValue) / 100
                ) * chargeableDays;

        } else {

            penalty =
                Number(loan.penaltyValue) *
                chargeableDays;

        }

    }

}

const totalAmount =
loan.emiAmount +
penalty;


// ==========================================
// PUSH INSTALLMENT
// ==========================================

installments.push({

    installmentNo: i,

    dueDate,
    
      dueDateString:
        dueDate.toLocaleDateString("en-IN"),



    emiAmount: loan.emiAmount,

    delay,

    gracePeriod: loan.gracePeriod,

    penaltyType: loan.penaltyType,

    penaltyValue: loan.penaltyValue,

    penalty,

    totalAmount

});

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
        loan.emiAmount

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

if(loan.loanType==="FIXED"){

return res.status(400).json({

success:false,
message:"Use Collect Principal API for Fixed Loan."

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

const totalInstallments =

loan.loanType==="DAILY"

? loan.durationDays

: loan.loanType==="WEEKLY"

? loan.durationWeeks

: loan.durationMonths;

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
(Number(installmentNo)-1)

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

else{

delay =

(today.getFullYear()-dueDate.getFullYear())*12+

(today.getMonth()-dueDate.getMonth());

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

    // MONTHLY & FIXED → Existing Logic
    else {

        const chargeableDays =
            delay - loan.gracePeriod;

        if (loan.penaltyType === "PERCENTAGE") {

            penalty =
                Math.round(
                    (loan.emiAmount * loan.penaltyValue) / 100
                ) * chargeableDays;

        } else {

            penalty =
                Number(loan.penaltyValue) *
                chargeableDays;

        }

    }

}

// ==========================================
// PRINCIPAL & INTEREST
// ==========================================

let principalAmount = 0;

let interestAmount = 0;

switch(loan.loanType){

case "DAILY":

interestAmount =
Math.round(
loan.totalInterest /
loan.durationDays
);

principalAmount =
loan.emiAmount -
interestAmount;

break;

case "WEEKLY":

interestAmount =
Math.round(
loan.totalInterest /
loan.durationWeeks
);

principalAmount =
loan.emiAmount -
interestAmount;

break;

case "MONTHLY":

interestAmount =
Math.round(
loan.totalInterest /
loan.durationMonths
);

principalAmount =
loan.emiAmount -
interestAmount;

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

emiType:loan.loanType,

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

loan.totalPaid += totalAmount;
loan.outstandingAmount -= totalAmount;

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

// Recover only loan amount (EMI)
const loanRecovery = principalAmount + interestAmount;

loan.outstandingAmount -= loanRecovery;

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

exports.loanDashboard = async(req,res)=>{

try{

const totalLoans =
await DailyLoan.countDocuments();

const activeLoans =
await DailyLoan.countDocuments({

status:"ACTIVE"

});

const closedLoans =
await DailyLoan.countDocuments({

status:"CLOSED"

});

const overdueLoans =
await DailyLoan.countDocuments({

status:"OVERDUE"

});

const loanSummary =
await DailyLoan.aggregate([

{

$group:{

_id:null,

loanAmount:{

$sum:"$loanAmount"

},

outstanding:{

$sum:"$outstandingAmount"

},

totalPaid:{

$sum:"$totalPaid"

},

interest:{

$sum:"$totalInterest"

}

}

}

]);


const penaltySummary =
await LoanCollection.aggregate([

{

$group:{

_id:null,

penalty:{

$sum:"$penalty"

}

}

}

]);

// ======================================
// PAST DUE EMI (Only overdue installments)
// ======================================

const loans = await DailyLoan.find({
  status: { $in: ["ACTIVE", "OVERDUE"] }
});

const today = new Date();
today.setHours(0, 0, 0, 0);

let overdueEmiAmount = 0;

for (const loan of loans) {

  let dueInstallments = 0;

  const loanDate = new Date(loan.loanDate);
  loanDate.setHours(0, 0, 0, 0);

 if (loan.loanType === "DAILY") {

    dueInstallments =
      Math.floor(
        (today - loanDate) /
        (1000 * 60 * 60 * 24)
      ) + 1;

    dueInstallments = Math.min(
      dueInstallments,
      loan.durationDays
    );

} else if (loan.loanType === "MONTHLY") {

    dueInstallments =
      (today.getFullYear() - loanDate.getFullYear()) * 12 +
      (today.getMonth() - loanDate.getMonth()) + 1;

    dueInstallments = Math.min(
      dueInstallments,
    loan.durationMonths

    );

  }

  if (dueInstallments < 0) dueInstallments = 0;

  const shouldHaveCollected =
    dueInstallments * loan.emiAmount;
console.log("========================");
console.log("Loan No:", loan.loanNumber);
console.log("Loan Type:", loan.loanType);
console.log("Loan Date:", loan.loanDate);
console.log("EMI:", loan.emiAmount);
console.log("Completed Installments:", loan.completedInstallments);
console.log("Total Installments:", loan.totalInstallments);
console.log("Due Installments:", dueInstallments);

const pendingInstallments = Math.max(
  0,
  dueInstallments - loan.completedInstallments
);

console.log("Pending Installments:", pendingInstallments);

const pending = pendingInstallments * loan.emiAmount;

console.log("Pending Amount:", pending);

overdueEmiAmount += pending;
}


const allCollections = await LoanCollection.find();

console.log("========== LOAN COLLECTIONS ==========");

allCollections.forEach(item => {
  console.log(item);
});


// ==========================
// MONTHLY LOAN COLLECTION
// ==========================



const firstDay = new Date(
  today.getFullYear(),
  today.getMonth(),
  1
);

const monthlyLoanCollection = await LoanCollection.aggregate([
  {
    $match: {
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

const monthlyCollection =
  monthlyLoanCollection[0]?.total || 0;

console.log("Monthly Loan Collection:", monthlyCollection);


res.json({

success:true,

dashboard:{

totalLoans,

activeLoans,

closedLoans,

overdueLoans,

loanAmount:

loanSummary[0]?.loanAmount||0,

outstanding:

loanSummary[0]?.outstanding||0,

totalPaid:

loanSummary[0]?.totalPaid||0,

interest:

loanSummary[0]?.interest||0,

penalty:

penaltySummary[0]?.penalty||0, 
   overdueEmiAmount,

  monthlyCollection  

}

});

}catch(error){

res.status(500).json({

success:false,

message:error.message

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