const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
{
  name:{
    type:String,
    required:true,
    trim:true
  },

  fatherOrHusbandName:{
    type:String,
    required:true,
    trim:true
  },

  mobile:{
    type:String,
    required:true,
    trim:true
  },

  alternateMobile:{
    type:String,
    default:""
  },

  gender:{
    type:String,
    enum:["Male","Female","Other"],
    required:true
  },

  dob:{
    type:Date,
    required:true
  },

  aadhaarNumber:{
    type:String,
    required:true,
    unique:true
  },

  panNumber:{
    type:String,
    default:""
  },

  occupation:{
    type:String,
    default:""
  },

  address:{
    type:String,
    required:true
  },

  city:{
    type:String,
    default:""
  },

  state:{
    type:String,
    default:""
  },

  pinCode:{
    type:String,
    default:""
  },

  photo:{
    type:String,
    default:""
  },

  guarantorName:{
    type:String,
    default:""
  },

  guarantorMobile:{
    type:String,
    default:""
  },

  remarks:{
    type:String,
    default:""
  },

  status:{
    type:String,
    enum:["ACTIVE","BLOCKED"],
    default:"ACTIVE"
  }

},
{
  timestamps:true
});

module.exports = mongoose.model(
  "Customer",
  customerSchema
);