const mongoose = require("mongoose");

const interestCollectionSchema =
new mongoose.Schema(
{

 loanId:{
  type:mongoose.Schema.Types.ObjectId,
  ref:"Loan",
  required:true
 },

 memberId:{
  type:mongoose.Schema.Types.ObjectId,
  ref:"Member",
  required:true
 },

 month:{
  type:Number,
  required:true
 },

 year:{
  type:Number,
  required:true
 },

 amountPaid:{
  type:Number,
  required:true
 },

 paymentDate:{
  type:Date,
  default:Date.now
 }

},
{
 timestamps:true
});

module.exports =
mongoose.model(
"InterestCollection",
interestCollectionSchema
);