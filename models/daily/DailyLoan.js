const mongoose = require("mongoose");

const dailyLoanSchema = new mongoose.Schema({

  member:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"DailyMember",
    required:true
  },

  loanAmount:{
    type:Number,
    required:true
  },

  loanType:{
    type:String,
    enum:["DAILY","MONTHLY","FIXED"],
    required:true
  },

  interestRate:{
    type:Number,
    required:true
  },
durationMonths:{
  type:Number,
  default:0
},
  totalInterest:{
    type:Number,
    default:0
  },

  totalPayable:{
    type:Number,
    default:0
  },

  emiAmount:{
    type:Number,
    default:0
  },

  totalPaid:{
    type:Number,
    default:0
  },

  outstandingAmount:{
    type:Number,
    default:0
  },

  status:{
    type:String,
    enum:["ACTIVE","DUE","OVERDUE","CLOSED"],
    default:"ACTIVE"
  },

  startDate:{
    type:Date,
    default:Date.now
  },
  durationDays:{
  type:Number,
  default:0
},

  endDate:{
    type:Date
  } , 
  borrowerName:{
type:String
},
lastPaymentDate:{
  type:Date
},

fatherName:{
type:String
},

mobile:{
type:String
},

address:{
type:String
},

areaName:{
type:String
},

guarantor1Name:{
type:String
},

guarantor1Father:{
type:String
},

guarantor1Mobile:{
type:String
},

guarantor1ShapathPatra:{
type:Boolean,
default:false
},

guarantor2Name:{
type:String
},

guarantor2Father:{
type:String
},

guarantor2Mobile:{
type:String
},

guarantor2ShapathPatra:{
type:Boolean,
default:false
},

panNumber:{
type:String
},

aadhaarNumber:{
type:String
},

photoSubmitted:{
type:Boolean,
default:false
},

securityCheque1:{
type:Boolean,
default:false
},

securityCheque2:{
type:Boolean,
default:false
},

remarks:{
type:String
}

},{
  timestamps:true
});

module.exports =
mongoose.models.DailyLoan ||
mongoose.model(
"DailyLoan",
dailyLoanSchema
);
