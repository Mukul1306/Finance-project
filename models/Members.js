const mongoose = require("mongoose");

const memberSchema = new mongoose.Schema({

  societyId:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Society",
    required:true
  },

  name:{
    type:String,
    required:true
  },

  fatherOrHusbandName:{
    type:String,
    required:true
  },

  mobile:{
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

  address:{
    type:String,
    required:true
  },

  aadhaarNumber:{
    type:String,
    required:true
  },

  nomineeName:{
    type:String,
    required:true
  },

  nomineeMobile:{
    type:String,
    required:true
  },

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

module.exports =
mongoose.model(
  "Member",
  memberSchema
);