const mongoose = require("mongoose");

const dailyLoanRequestSchema = new mongoose.Schema(
  {
    // ==========================================
    // MEMBER
    // ==========================================

    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DailyMember",
      required: true
    },

    memberId: {
      type: String,
      default: ""
    },

    borrowerName: {
      type: String,
      default: ""
    },

    fatherName: {
      type: String,
      default: ""
    },

    gender: {
      type: String,
      default: ""
    },

    dob: {
      type: Date
    },

    mobile: {
      type: String,
      default: ""
    },

    alternateMobile: {
      type: String,
      default: ""
    },

    email: {
      type: String,
      default: ""
    },

    address: {
      type: String,
      default: ""
    },

    city: {
      type: String,
      default: ""
    },

    district: {
      type: String,
      default: ""
    },

    state: {
      type: String,
      default: ""
    },

    pincode: {
      type: String,
      default: ""
    },

    // ==========================================
    // AREA & AGENT
    // ==========================================

    areaName: {
      type: String,
      default: ""
    },

    assignedAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DailyAgent",
      default: null
    },

    // ==========================================
    // REQUESTED LOAN DETAILS
    // ==========================================

    loanAmount: {
      type: Number,
      required: true,
      min: 1
    },

    interestRate: {
      type: Number,
      required: true,
      min: 0
    },

    loanType: {
      type: String,
      enum: [
        "DAILY",
        "WEEKLY",
        "MONTHLY",
        "FIXED"
      ],
      required: true
    },

    durationDays: {
      type: Number,
      default: 0
    },

    durationWeeks: {
      type: Number,
      default: 0
    },

    durationMonths: {
      type: Number,
      default: 0
    },

    loanTenureMonths: {
      type: Number,
      default: 10
    },

    loanDate: {
      type: Date,
      required: true
    },

    startDate: {
      type: Date,
      default: Date.now
    },

    endDate: {
      type: Date
    },

    // ==========================================
    // CALCULATED LOAN DETAILS
    // ==========================================

    totalInterest: {
      type: Number,
      default: 0
    },

    totalPayable: {
      type: Number,
      default: 0
    },

    emiAmount: {
      type: Number,
      default: 0
    },

    totalInstallments: {
      type: Number,
      default: 0
    },

    // ==========================================
    // NOMINEE
    // ==========================================

    nomineeName: {
      type: String,
      default: ""
    },

    nomineeMobile: {
      type: String,
      default: ""
    },

    // ==========================================
    // BORROWER DOCUMENTS
    // ==========================================

    passportPhotoSubmitted: {
      type: Boolean,
      default: false
    },

    aadhaarNumber: {
      type: String,
      default: ""
    },

    aadhaarSubmitted: {
      type: Boolean,
      default: false
    },

    panNumber: {
      type: String,
      default: ""
    },

    panSubmitted: {
      type: Boolean,
      default: false
    },

    cheque1Number: {
      type: String,
      default: ""
    },

    cheque2Number: {
      type: String,
      default: ""
    },

    cheque1Submitted: {
      type: Boolean,
      default: false
    },

    cheque2Submitted: {
      type: Boolean,
      default: false
    },

    stampPaperSubmitted: {
      type: Boolean,
      default: false
    },

    // ==========================================
    // SECURITY
    // ==========================================

    securityType: {
      type: String,
      enum: [
        "SECURED",
        "UNSECURED"
      ],
      default: "UNSECURED"
    },

    securityDetails: {
      type: String,
      default: ""
    },

    // ==========================================
    // GUARANTOR 1
    // ==========================================

    guarantor1Name: {
      type: String,
      default: ""
    },

    guarantor1FatherName: {
      type: String,
      default: ""
    },

    guarantor1Gender: {
      type: String,
      default: ""
    },

    guarantor1Dob: {
      type: Date
    },

    guarantor1Mobile: {
      type: String,
      default: ""
    },

    guarantor1AlternateMobile: {
      type: String,
      default: ""
    },

    guarantor1Email: {
      type: String,
      default: ""
    },

    guarantor1Address: {
      type: String,
      default: ""
    },

    guarantor1City: {
      type: String,
      default: ""
    },

    guarantor1District: {
      type: String,
      default: ""
    },

    guarantor1State: {
      type: String,
      default: ""
    },

    guarantor1Pincode: {
      type: String,
      default: ""
    },

    guarantor1PhotoSubmitted: {
      type: Boolean,
      default: false
    },

    guarantor1AadhaarNumber: {
      type: String,
      default: ""
    },

    guarantor1AadhaarSubmitted: {
      type: Boolean,
      default: false
    },

    guarantor1PanNumber: {
      type: String,
      default: ""
    },

    guarantor1PanSubmitted: {
      type: Boolean,
      default: false
    },

    guarantor1Cheque1Number: {
      type: String,
      default: ""
    },

    guarantor1Cheque2Number: {
      type: String,
      default: ""
    },

    guarantor1Cheque1Submitted: {
      type: Boolean,
      default: false
    },

    guarantor1Cheque2Submitted: {
      type: Boolean,
      default: false
    },

    guarantor1StampPaperSubmitted: {
      type: Boolean,
      default: false
    },

    guarantor1SecurityType: {
      type: String,
      enum: [
        "SECURED",
        "UNSECURED"
      ],
      default: "UNSECURED"
    },

    guarantor1SecurityDetails: {
      type: String,
      default: ""
    },

    // ==========================================
    // GUARANTOR 2
    // ==========================================

    guarantor2Name: {
      type: String,
      default: ""
    },

    guarantor2FatherName: {
      type: String,
      default: ""
    },

    guarantor2Gender: {
      type: String,
      default: ""
    },

    guarantor2Dob: {
      type: Date
    },

    guarantor2Mobile: {
      type: String,
      default: ""
    },

    guarantor2AlternateMobile: {
      type: String,
      default: ""
    },

    guarantor2Email: {
      type: String,
      default: ""
    },

    guarantor2Address: {
      type: String,
      default: ""
    },

    guarantor2City: {
      type: String,
      default: ""
    },

    guarantor2District: {
      type: String,
      default: ""
    },

    guarantor2State: {
      type: String,
      default: ""
    },

    guarantor2Pincode: {
      type: String,
      default: ""
    },

    guarantor2PhotoSubmitted: {
      type: Boolean,
      default: false
    },

    guarantor2AadhaarNumber: {
      type: String,
      default: ""
    },

    guarantor2AadhaarSubmitted: {
      type: Boolean,
      default: false
    },

    guarantor2PanNumber: {
      type: String,
      default: ""
    },

    guarantor2PanSubmitted: {
      type: Boolean,
      default: false
    },

    guarantor2Cheque1Number: {
      type: String,
      default: ""
    },

    guarantor2Cheque2Number: {
      type: String,
      default: ""
    },

    guarantor2Cheque1Submitted: {
      type: Boolean,
      default: false
    },

    guarantor2Cheque2Submitted: {
      type: Boolean,
      default: false
    },

    guarantor2StampPaperSubmitted: {
      type: Boolean,
      default: false
    },

    guarantor2SecurityType: {
      type: String,
      enum: [
        "SECURED",
        "UNSECURED"
      ],
      default: "UNSECURED"
    },

    guarantor2SecurityDetails: {
      type: String,
      default: ""
    },

    // ==========================================
    // PENALTY
    // ==========================================

    gracePeriod: {
      type: Number,
      default: 0
    },

    penaltyType: {
      type: String,
      enum: [
        "FIXED",
        "PERCENTAGE"
      ],
      default: "PERCENTAGE"
    },

    penaltyValue: {
      type: Number,
      default: 0
    },

    // ==========================================
    // REQUEST STATUS
    // ==========================================

    status: {
      type: String,
      enum: [
        "PENDING",
        "APPROVED",
        "REJECTED"
      ],
      default: "PENDING"
    },

    // ==========================================
    // ADMIN APPROVAL
    // ==========================================

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },

    approvedAt: {
      type: Date,
      default: null
    },

    // ==========================================
    // ADMIN REJECTION
    // ==========================================

    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },

    rejectedAt: {
      type: Date,
      default: null
    },

    rejectionReason: {
      type: String,
      default: ""
    },

    // ==========================================
    // REMARKS
    // ==========================================

    remarks: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

// ==========================================
// INDEXES
// ==========================================

dailyLoanRequestSchema.index({
  status: 1,
  createdAt: -1
});

dailyLoanRequestSchema.index({
  assignedAgent: 1,
  status: 1,
  createdAt: -1
});

dailyLoanRequestSchema.index({
  member: 1,
  status: 1,
  createdAt: -1
});

module.exports =
  mongoose.models.DailyLoanRequest ||
  mongoose.model(
    "DailyLoanRequest",
    dailyLoanRequestSchema
  );