const mongoose = require("mongoose");

const notificationSchema =
new mongoose.Schema({

  title:{
    type:String,
    required:true
  },

  message:{
    type:String,
    required:true
  },

  targetType:{
    type:String,
    enum:[
      "SINGLE",
      "ALL",
      "LOAN_MEMBERS",
      "PENDING_MEMBERS"
    ],
    required:true
  },

  member:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"DailyMember"
  },

  isRead:{
    type:Boolean,
    default:false
  },

  sentBy:{
    type:String,
    default:"ADMIN"
  }

},{
  timestamps:true
});

module.exports =
mongoose.model(
"Notification",
notificationSchema
);