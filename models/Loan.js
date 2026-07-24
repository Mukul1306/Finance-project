const mongoose = require("mongoose");

const loanSchema = new mongoose.Schema({
  societyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Society",
    required: true
  },

  borrowerType: {
    type: String,
    enum: ["MEMBER", "CUSTOMER"],
    required: true
  },

memberId:{
  type:mongoose.Schema.Types.ObjectId,
  ref:"Member",
  default:null
},

customerId:{
  type:mongoose.Schema.Types.ObjectId,
  ref:"Customer",
  default:null
},

  principalAmount: {
    type: Number,
    required: true
  },

  interestPerHundred: {
    type: Number,
    required: true
  },

  monthlyInterest: {
    type: Number,
    required: true
  },

  emiDueDay: {
    type: Number,
    required: true
  },

  emiPenaltyPercentage: {
    type: Number,
    required: true,
    default: 2
  },

  totalPenaltyCollected: {
    type: Number,
    default: 0
  },

  totalInterestCollected: {
    type: Number,
    default: 0
  },

  totalAmountCollected: {
    type: Number,
    default: 0
  },

  loanGivenDate: {
    type: Date,
    required: true
  },

  loanEndDate: {
    type: Date,
    required: true
  },

  status: {
    type: String,
    enum: ["ACTIVE", "CLOSED"],
    default: "ACTIVE"
  },

  paidEmis: {
  type: Number,
  default: 0
},

pendingEmis: {
  type: Number,
  default: 0
},

lastEmiDate: {
  type: Date,
  default: null
}
,
  closedDate: {
    type: Date
  }

}, {
  timestamps: true
});

module.exports = mongoose.model("Loan", loanSchema);