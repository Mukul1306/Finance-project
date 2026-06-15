const mongoose = require("mongoose");

const dailyMemberSchema = new mongoose.Schema({

  memberName:{
    type:String,
    required:true
  },

  fatherName:{
    type:String,
    required:true
  },

  mobile:{
    type:String,
    required:true
  },



  areaGroup:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"AreaGroup",
    required:true
  },
assignedAgent:{
  type:mongoose.Schema.Types.ObjectId,
  ref:"DailyAgent",
  required:true
},
  startDate:{
    type:Date,
    required:true
  },

  endDate:{
    type:Date,
    required:true
  },

  lastCollectionDate:{
type:Date
},

totalPenalty:{
type:Number,
default:0
},



  isFlexibleAmount:{
    type:Boolean,
    default:false
  },

  fixedDailyAmount:{
    type:Number,
    default:0
  },

  totalPaid:{
    type:Number,
    default:0
  },
  totalDaysPaid:{
  type:Number,
  default:0
},

  residentialAddress: {
  type: String,
  required: true
},

city: {
  type: String,
  required: true
},

state: {
  type: String,
  required: true
},

pincode: {
  type: String,
  required: true
},

  status:{
    type:String,
    default:"ACTIVE"
  }

},{
  timestamps:true
});

module.exports =
mongoose.model(
  "DailyMember",
  dailyMemberSchema
);