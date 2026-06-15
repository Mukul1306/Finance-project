const mongoose = require("mongoose");

const loanSchema = new mongoose.Schema(
{
  societyId:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Society",
    required:true
  },

  memberId:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Member",
    required:true
  },

  principalAmount:{
    type:Number,
    required:true
  },

  interestPerHundred:{
    type:Number,
    required:true
  },

  monthlyInterest:{
    type:Number,
    required:true
  },

  loanGivenDate:{
    type:Date,
    required:true
  },

  loanEndDate:{
    type:Date,
    required:true
  },

  status:{
    type:String,
    enum:["ACTIVE","CLOSED"],
    default:"ACTIVE"
  },

  closedDate:{
    type:Date
  }

},
{
 timestamps:true
});

module.exports =
mongoose.model(
"Loan",
loanSchema
);