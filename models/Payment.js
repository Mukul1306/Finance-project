const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({

  memberId:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Member",
    required:true
  },

  societyId:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Society",
    required:true
  },

  installmentNo:{
    type:Number,
    required:true
  },

  installmentAmount:{
    type:Number,
    required:true
  },

  penaltyAmount:{
    type:Number,
    default:0
  },

  totalReceived:{
    type:Number,
    required:true
  },

  paymentMode:{
    type:String,
    enum:[
      "Cash",
      "UPI",
      "Bank Transfer",
      "Cheque"
    ],
    required:true
  },

  transactionId:{
    type:String,
    default:""
  },

  paymentDate:{
    type:Date,
    default:Date.now
  },

  remarks:{
    type:String,
    default:""
  }

},{
  timestamps:true
});

module.exports =
mongoose.model(
  "Payment",
  paymentSchema
);