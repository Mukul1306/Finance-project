const mongoose = require("mongoose");

const dailyLoanSchema = new mongoose.Schema({

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
  borrowerName: String,
  fatherName: String,
  gender: String,
  dob: Date,

  mobile: String,
  alternateMobile: String,
  email: String,

  address: String,
  city: String,
  district: String,
  state: String,
  pincode: String,

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
  // LOAN DETAILS
  // ==========================================

  loanAmount: {
    type: Number,
    required: true
  },

  interestRate: {
    type: Number,
    required: true
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

  startDate: {
    type: Date,
    default: Date.now
  },

  endDate: Date,

  // ==========================================
  // CALCULATED
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

  totalPaid: {
    type: Number,
    default: 0
  },

  outstandingAmount: {
    type: Number,
    default: 0
  },
completedInstallments: {
  type: Number,
  default: 0
},

pendingInstallments: {
  type: Number,
  default: 0
},

lastInstallmentNo: {
  type: Number,
  default: 0
},

  lastPaymentDate: Date,

  status: {
    type: String,
    enum: [
      "ACTIVE",
      "DUE",
      "OVERDUE",
      "CLOSED",
      "REJECTED"
    ],
    default: "ACTIVE"
  },

  closedDate: Date,

closedBy: {
  type: String,
  default: ""
},

loanDate: {
    type: Date,
    required: true
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
  // GUARANTOR 1 (OPTIONAL)
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

  guarantor1Dob: Date,

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
loanTenureMonths: {
    type: Number,
    default: 10,
    required: true
},


guarantor1Cheque2Submitted: {
  type: Boolean,
  default: false
},
guarantor1StampPaperSubmitted: {
  type: Boolean,
  default: false
},
loanNumber:{
type:String,
required:true,
unique:true
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
  // GUARANTOR 2 (OPTIONAL)
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

  guarantor2Dob: Date,

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

  gracePeriod: {
  type: Number,
  default: 0
},

penaltyType: {
  type: String,
  enum: ["FIXED", "PERCENTAGE"],
  default: "PERCENTAGE"
},

penaltyValue: {
  type: Number,
  default: 0
},

  // ==========================================
  // REMARKS
  // ==========================================

  remarks: {
    type: String,
    default: ""
  }

}, {
  timestamps: true
});

module.exports =
mongoose.models.DailyLoan ||
mongoose.model(
  "DailyLoan",
  dailyLoanSchema
);
