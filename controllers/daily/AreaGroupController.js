const AreaGroup =
require("../../models/daily/AreaGroup");


// CREATE AREA GROUP

exports.createAreaGroup = async (req, res) => {

  try {

    const {
      areaName,
      duration,
      durationType,
      maxMembers,
      startDate,
      assignedAgent,
      secondaryAgent
    } = req.body;

    const endDate = new Date(startDate);

    if (durationType === "DAYS") {
      endDate.setDate(endDate.getDate() + Number(duration));
    }

    if (durationType === "MONTHS") {
      endDate.setMonth(endDate.getMonth() + Number(duration));
    }

    if (durationType === "YEARS") {
      endDate.setFullYear(endDate.getFullYear() + Number(duration));
    }

    const group = await AreaGroup.create({

      areaName,

      duration,

      durationType,

      maxMembers,

      startDate,

      endDate,

      assignedAgent,

      secondaryAgent

    });

    res.status(201).json({

      success: true,

      message: "Area Group Created",

      group

    });

  } catch (error) {

    res.status(500).json({

      success: false,

      message: error.message

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
.populate("assignedAgent", "name")
.populate("secondaryAgent", "name")
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

exports.updateAreaGroup = async (req, res) => {

  try {

    const group = await AreaGroup.findById(req.params.id);

    if (!group) {

      return res.status(404).json({

        success: false,

        message: "Area Group Not Found"

      });

    }

    Object.assign(group, req.body);

    const endDate = new Date(group.startDate);

    if (group.durationType === "DAYS") {
      endDate.setDate(endDate.getDate() + Number(group.duration));
    }

    if (group.durationType === "MONTHS") {
      endDate.setMonth(endDate.getMonth() + Number(group.duration));
    }

    if (group.durationType === "YEARS") {
      endDate.setFullYear(endDate.getFullYear() + Number(group.duration));
    }

    group.endDate = endDate;

    await group.save();

    res.status(200).json({

      success: true,

      message: "Area Updated",

      group

    });

  } catch (error) {

    res.status(500).json({

      success: false,

      message: error.message

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