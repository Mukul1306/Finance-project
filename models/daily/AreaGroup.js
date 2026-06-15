const mongoose = require("mongoose");

const areaGroupSchema = new mongoose.Schema({

  areaName:{
    type:String,
    required:true
  },

  duration:{
    type:Number,
    required:true
  },

  maxMembers:{
    type:Number,
    required:true
  },

  startDate:{
    type:Date,
    required:true
  },

  assignedAgent:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"DailyAgent",
    required:true
  },

  status:{
    type:String,
    default:"ACTIVE"
  },

  totalMembers:{
    type:Number,
    default:0
  },

  totalCollection:{
    type:Number,
    default:0
  }

},{
  timestamps:true
});

module.exports =
mongoose.model(
  "AreaGroup",
  areaGroupSchema
);