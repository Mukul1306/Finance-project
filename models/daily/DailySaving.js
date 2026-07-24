const mongoose = require("mongoose");

const dailySavingSchema = new mongoose.Schema({

  member:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"DailyMember",
    required:true,
    unique:true
  },
nomineeName: {
    type: String,
    default: ""
},

nomineeMobile: {
    type: String,
    default: ""
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

  collectionType:{
    type:String,
    enum:["FIXED","FLEXIBLE"],
    required:true
  },

  fixedAmount:{
    type:Number,
    default:0
  },

  durationDays:{
    type:Number,
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

  graceDays:{
    type:Number,
    default:0
  },

  penaltyType:{
    type:String,
    enum:["PERCENTAGE","FIXED"],
    default:"PERCENTAGE"
  },

  penaltyValue:{
    type:Number,
    default:0
  },

  status:{
    type:String,
    enum:[
      "ACTIVE",
      "COMPLETED",
      "CLOSED"
    ],
    default:"ACTIVE"
  },

  totalSaved:{
    type:Number,
    default:0
  },

  totalPenalty:{
    type:Number,
    default:0
  },
  completedDays: {
  type: Number,
  default: 0
},

  totalDaysPaid:{
    type:Number,
    default:0
  },

  pendingDays:{
    type:Number,
    default:0
  },
  pendingAmount: {
  type: Number,
  default: 0
},

nextCollectionDate: {
  type: Date
},
completedDate: {
  type: Date
},

  lastCollectionDate:{
    type:Date
  }

},{
  timestamps:true
});

module.exports =
mongoose.model(
"DailySaving",
dailySavingSchema
);