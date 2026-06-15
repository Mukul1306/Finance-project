const DailyMember =
require("../../models/daily/DailyMember");

const AreaGroup =
require("../../models/daily/AreaGroup");

exports.createMember =
async(req,res)=>{

try{

const area =
await AreaGroup.findById(
req.body.areaGroup
);

if(!area){

return res.status(404).json({

success:false,
message:"Area Group Not Found"

});

}

if(!req.body.assignedAgent){

return res.status(400).json({

success:false,

message:"Please Select Agent"

});

}

const member =
await DailyMember.create({

memberName:req.body.memberName,

fatherName:req.body.fatherName,

mobile:req.body.mobile,

areaGroup:req.body.areaGroup,

assignedAgent:
req.body.assignedAgent,

startDate:req.body.startDate,

endDate:req.body.endDate,

isFlexibleAmount:
req.body.isFlexibleAmount,

fixedDailyAmount:
req.body.fixedDailyAmount,

  totalDaysPaid:0,

residentialAddress:
req.body.residentialAddress,

city:req.body.city,

state:req.body.state,

pincode:req.body.pincode

});

await AreaGroup.findByIdAndUpdate(

req.body.areaGroup,

{
$inc:{
totalMembers:1
}
}

);

res.status(201).json({

success:true,
member

});

}catch(error){

console.log(error);

res.status(500).json({

success:false,
message:error.message

});

}

};

exports.getMembers =
async(req,res)=>{

try{

const members =
await DailyMember
.find()
.populate(
"areaGroup",
"areaName"
);

res.json({

success:true,
members

});

}catch(error){

res.status(500).json({

success:false,
message:error.message

});

}

};
exports.getMemberProfile =
async(req,res)=>{

try{

const member =
await DailyMember
.findById(req.params.id)
.populate(
"areaGroup",
"areaName duration"
);

if(!member){

return res.status(404).json({
success:false,
message:"Member Not Found"
});

}

res.status(200).json({

success:true,
member

});

}catch(error){

res.status(500).json({
success:false,
message:error.message
});

}

};
const DailyTransaction =
require("../../models/daily/DailyTransaction");

exports.getMemberTransactions =
async(req,res)=>{

try{

const transactions =
await DailyTransaction
.find({

member:req.params.id

})
.sort({

collectionDate:-1

});

res.status(200).json({

success:true,
transactions

});

}catch(error){

res.status(500).json({

success:false,
message:error.message

});

}

};

exports.getAgentMembers =
async(req,res)=>{

try{

const members =
await DailyMember
.find({
assignedAgent:
req.params.agentId
})
.populate(
"areaGroup",
"areaName"
);

res.status(200).json({

success:true,
members

});

}catch(error){

res.status(500).json({

success:false,
message:error.message

});

}

};