const AreaGroup =
require("../../models/daily/AreaGroup");


// CREATE AREA GROUP

exports.createAreaGroup =
async(req,res)=>{

try{

const {

  areaName,
  duration,
  maxMembers,
  startDate,
  assignedAgent

} = req.body;

const group =
await AreaGroup.create({

  areaName,
  duration,
  maxMembers,
  startDate,
  assignedAgent

});

res.status(201).json({

  success:true,
  message:"Area Group Created",
  group

});

}catch(error){

res.status(500).json({

  success:false,
  message:error.message

});

}

};


// GET ALL AREA GROUPS

exports.getAreaGroups =
async(req,res)=>{

try{

const groups =
await AreaGroup
.find()
.populate(
"assignedAgent",
"name mobile"
)
.sort({
createdAt:-1
});

res.status(200).json({

success:true,
groups

});

}catch(error){

res.status(500).json({

success:false,
message:error.message

});

}

};


// GET SINGLE AREA GROUP

exports.getAreaGroup =
async(req,res)=>{

try{

const group =
await AreaGroup
.findById(
req.params.id
)
.populate(
"assignedAgent",
"name mobile"
);

if(!group){

return res.status(404).json({

success:false,
message:"Area Group Not Found"

});

}

res.status(200).json({

success:true,
group

});

}catch(error){

res.status(500).json({

success:false,
message:error.message

});

}

};


// UPDATE AREA GROUP

exports.updateAreaGroup =
async(req,res)=>{

try{

const group =
await AreaGroup.findByIdAndUpdate(

req.params.id,

req.body,

{
new:true
}

);

res.status(200).json({

success:true,
message:"Area Updated",
group

});

}catch(error){

res.status(500).json({

success:false,
message:error.message

});

}

};


// DELETE AREA GROUP

exports.deleteAreaGroup =
async(req,res)=>{

try{

const group =
await AreaGroup.findById(
req.params.id
);

if(!group){

return res.status(404).json({

success:false,
message:"Area Group Not Found"

});

}

await group.deleteOne();

res.status(200).json({

success:true,
message:"Area Deleted"

});

}catch(error){

res.status(500).json({

success:false,
message:error.message

});

}

};