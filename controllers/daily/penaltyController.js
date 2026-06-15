const PenaltySetting =
require("../../models/daily/PenaltySetting");

exports.savePenaltySettings =
async(req,res)=>{

try{

const {

fineAmount,
graceDays,
maxPenalty,
autoPenalty

}=req.body;

let settings =
await PenaltySetting.findOne();

if(settings){

settings.fineAmount =
fineAmount;

settings.graceDays =
graceDays;

settings.maxPenalty =
maxPenalty;

settings.autoPenalty =
autoPenalty;

await settings.save();

}else{

settings =
await PenaltySetting.create({

fineAmount,
graceDays,
maxPenalty,
autoPenalty

});

}

res.status(200).json({

success:true,
settings

});

}catch(error){

res.status(500).json({

success:false,
message:error.message

});

}

};

exports.getPenaltySettings =
async(req,res)=>{

try{

const settings =
await PenaltySetting.findOne();

res.status(200).json({

success:true,
settings

});

}catch(error){

res.status(500).json({

success:false,
message:error.message

});

}

};