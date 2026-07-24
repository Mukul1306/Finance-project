const mongoose = require("mongoose");

const memberSchema = new mongoose.Schema({

  societyId:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Society",
    required:true
  },

  // Member ID
  memberId:{
    type:String,
    required:true,
    unique:true,
    trim:true
  },

  // Personal Details
  name:{
    type:String,
    required:true
  },

  fatherOrHusbandName:{
    type:String,
    required:true
  },

  gender:{
    type:String,
    required:true
  },

  dob:{
    type:Date,
    required:true
  },

  // NEW
  email:{
    type:String,
    default:""
  },

  // Contact
  mobile:{
    type:String,
    required:true
  },

  // NEW
  alternateMobile:{
    type:String,
    default:""
  },

  // Address
  address:{
    type:String,
    required:true
  },

  // NEW
  pinCode:{
    type:String,
    default:""
  },

  // NEW
  city:{
    type:String,
    default:""
  },

  // NEW
  district:{
    type:String,
    default:""
  },

  // NEW
  state:{
    type:String,
    default:""
  },

  // Documents
  aadhaarNumber:{
    type:String,
    required:true
  },

  // Nominee
  nomineeName:{
    type:String,
    required:true
  },

  nomineeMobile:{
    type:String,
    required:true
  },

  // Membership
  joiningDate:{
    type:Date,
    default:Date.now
  },

  memberEndDate:{
    type:Date
  },

  monthlyInstallment:{
    type:Number,
    required:true
  },

  monthlyPenalty:{
    type:Number,
    default:0
  },

  dueDay:{
    type:Number,
    required:true
  },

  // Installments
  totalInstallments:{
    type:Number,
    default:0
  },

  paidInstallments:{
    type:Number,
    default:0
  },

  pendingInstallments:{
    type:Number,
    default:0
  },

  // Amount Details
  totalPaid:{
    type:Number,
    default:0
  },

  pendingAmount:{
    type:Number,
    default:0
  },

  currentPenalty:{
    type:Number,
    default:0
  },

  totalPenaltyPaid:{
    type:Number,
    default:0
  },

  lastPaymentDate:{
    type:Date
  },

  // Status
  status:{
    type:String,
    enum:[
      "ACTIVE",
      "DUE",
      "OVERDUE",
      "COMPLETED"
    ],
    default:"ACTIVE"
  }

},{
  timestamps:true
});

module.exports = mongoose.model("Member", memberSchema);