const mongoose = require("mongoose");

const loanCollectionSchema =
new mongoose.Schema({

  loan:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"DailyLoan",
    required:true
  },

  member:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"DailyMember",
    required:true
  },
installmentNo:{
  type:Number,
  required:true
},

paymentDate:{
  type:Date,
  default:Date.now
},

  amount:{
    type:Number,
    required:true
  },

  penalty:{
    type:Number,
    default:0
  },

  totalAmount:{
    type:Number,
    required:true
  },

  collectorType:{
    type:String,
    enum:["ADMIN","AGENT"],
    required:true
  },

  collectorId:{
    type:mongoose.Schema.Types.ObjectId,
    required:true
  },

  paymentMethod:{
    type:String,
    enum:["CASH","UPI"],
    default:"CASH"
  },

  paymentDate:{
    type:Date,
    default:Date.now
  }

},{
  timestamps:true
});

module.exports =
mongoose.model(
"LoanCollection",
loanCollectionSchema
);