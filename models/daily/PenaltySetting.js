const mongoose = require("mongoose");

const penaltySettingSchema =
new mongoose.Schema({

  fineAmount:{
    type:Number,
    default:50
  },

  graceDays:{
    type:Number,
    default:3
  },

  maxPenalty:{
    type:Number,
    default:500
  },

  autoPenalty:{
    type:Boolean,
    default:true
  }

},{
  timestamps:true
});

module.exports =
mongoose.model(
"PenaltySetting",
penaltySettingSchema
);