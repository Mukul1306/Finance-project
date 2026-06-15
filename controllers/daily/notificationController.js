const Notification =
require("../../models/daily/Notification");

const DailyMember =
require("../../models/daily/DailyMember");

const DailyLoan =
require("../../models/daily/DailyLoan");
exports.sendSingleNotification =
async(req,res)=>{

try{

const {
memberId,
title,
message
}=req.body;

const member =
await DailyMember.findById(
memberId
);

if(!member){

return res.status(404).json({
success:false,
message:"Member Not Found"
});

}

const notification =
await Notification.create({

title,
message,

targetType:"SINGLE",

member:memberId

});

res.json({
success:true,
notification
});

}catch(error){

res.status(500).json({
success:false,
message:error.message
});

}

};

exports.sendAllMembersNotification =
async(req,res)=>{

try{

const {
title,
message
}=req.body;

const members =
await DailyMember.find();

const notifications =
members.map(member=>({

title,
message,

targetType:"ALL",

member:member._id

}));

await Notification.insertMany(
notifications
);

res.json({
success:true,
message:
"Notification Sent To All Members"
});

}catch(error){

res.status(500).json({
success:false,
message:error.message
});

}

};

exports.sendLoanMembersNotification =
async(req,res)=>{

try{

const {
title,
message
}=req.body;

const loans =
await DailyLoan.find({
status:"ACTIVE"
});

const notifications =
loans.map(loan=>({

title,
message,

targetType:
"LOAN_MEMBERS",

member:loan.member

}));

await Notification.insertMany(
notifications
);

res.json({
success:true,
message:
"Notification Sent To Loan Members"
});

}catch(error){

res.status(500).json({
success:false,
message:error.message
});

}

};

exports.sendPendingMembersNotification =
async(req,res)=>{

try{

const {
title,
message
}=req.body;

const loans =
await DailyLoan.find({

status:{
$ne:"CLOSED"
}

});

const notifications =
loans.map(loan=>({

title,
message,

targetType:
"PENDING_MEMBERS",

member:loan.member

}));

await Notification.insertMany(
notifications
);

res.json({
success:true,
message:
"Notification Sent To Pending Members"
});

}catch(error){

res.status(500).json({
success:false,
message:error.message
});

}

};

exports.getNotifications =
async(req,res)=>{

try{

const notifications =
await Notification.find()

.populate(
"member",
"memberName mobile"
)

.sort({
createdAt:-1
});

res.json({
success:true,
notifications
});

}catch(error){

res.status(500).json({
success:false,
message:error.message
});

}

};

exports.getMemberNotifications =
async(req,res)=>{

try{

const notifications =
await Notification.find({

member:req.params.memberId

})

.sort({
createdAt:-1
});

res.json({
success:true,
notifications
});

}catch(error){

res.status(500).json({
success:false,
message:error.message
});

}

};