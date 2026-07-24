const mongoose = require("mongoose");

const dailyTransactionSchema =
new mongoose.Schema({


member:{
type:mongoose.Schema.Types.ObjectId,
ref:"DailyMember",
required:true
},
savingAccount: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "DailySaving",
  required: true
},

area:{
type:mongoose.Schema.Types.ObjectId,
ref:"AreaGroup",
required:true
},

collectorType:{
type:String,
enum:["ADMIN","AGENT"],
required:true
},

collectorId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "DailyAgent",
  default: null
},

dailyAmount:{
type:Number,
default:0
},

penalty:{
type:Number,
default:0
},

totalAmount:{
type:Number,
required:true
},

paymentMethod: {
  type: String,
  enum: ["CASH", "UPI", "BANK"],
  default: "CASH"
},

status:{
type:String,
default:"PAID"
},
paymentForDate: {
  type: Date,
  default: Date.now
},

collectionDate:{
type:Date,
default:Date.now
}

},{
timestamps:true
});

module.exports =
mongoose.model(
"DailyTransaction",
dailyTransactionSchema
);