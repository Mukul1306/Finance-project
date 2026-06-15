const mongoose = require("mongoose");

const dailyTransactionSchema =
new mongoose.Schema({

member:{
type:mongoose.Schema.Types.ObjectId,
ref:"DailyMember",
required:true
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

collectorId:{
type:mongoose.Schema.Types.ObjectId,
default:null
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

paymentMethod:{
type:String,
enum:["CASH","UPI"],
default:"CASH"
},

status:{
type:String,
default:"PAID"
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