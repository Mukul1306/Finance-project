const DailyMember =
require("../../models/daily/DailyMember");

const DailyTransaction =
require("../../models/daily/DailyTransaction");

const DailyLoan =
require("../../models/daily/DailyLoan");

const LoanCollection =
require("../../models/daily/LoanCollection");
const AreaGroup =
require("../../models/daily/AreaGroup");
exports.dashboardReport =
async(req,res)=>{

try{
const areas =
await AreaGroup.find();

const areaReport = [];

for(const area of areas){

  const members =
  await DailyMember.countDocuments({
    areaGroup: area._id
  });

  const collections =
  await DailyTransaction.aggregate([

    {
      $match:{
        area: area._id
      }
    },

    {
      $group:{
        _id:null,
        total:{
          $sum:"$totalAmount"
        }
      }
    }

  ]);

  areaReport.push({

    areaName:
    area.areaName,

    members,

    totalCollection:
    collections[0]?.total || 0,

    status:
    members > 0
    ? "ACTIVE"
    : "INACTIVE"

  });

}
const totalMembers =
await DailyMember.countDocuments();

const activeLoans =
await DailyLoan.countDocuments({
status:"ACTIVE"
});

const closedLoans =
await DailyLoan.countDocuments({
status:"CLOSED"
});

const dailyCollection =
await DailyTransaction.aggregate([
{
$group:{
_id:null,
total:{
$sum:"$totalAmount"
}
}
}
]);

const loanCollection =
await LoanCollection.aggregate([
{
$group:{
_id:null,
total:{
$sum:"$amount"
}
}
}
]);

res.json({

success:true,

totalMembers,

activeLoans,

closedLoans,

dailySavingCollection:
dailyCollection[0]?.total || 0,

loanCollection:
loanCollection[0]?.total || 0,

monthlyRevenue:
(dailyCollection[0]?.total || 0)
+
(loanCollection[0]?.total || 0),

areas: areaReport

});

}catch(error){

res.status(500).json({
success:false,
message:error.message
});

}

};

exports.dailyCollectionReport =
async(req,res)=>{

try{

const collections =
await DailyTransaction.find()

.populate(
"member",
"memberName mobile"
)

.sort({
collectionDate:-1
});

res.json({
success:true,
collections
});

}catch(error){

res.status(500).json({
success:false,
message:error.message
});

}

};

exports.loanReport =
async(req,res)=>{

try{

const loans =
await DailyLoan.find()

.populate(
"member",
"memberName mobile"
)

.sort({
createdAt:-1
});

res.json({
success:true,
loans
});

}catch(error){

res.status(500).json({
success:false,
message:error.message
});

}

};

exports.pendingLoanReport =
async(req,res)=>{

try{

const loans =
await DailyLoan.find({

status:{
$ne:"CLOSED"
}

});

res.json({
success:true,
loans
});

}catch(error){

res.status(500).json({
success:false,
message:error.message
});

}

};

exports.areaWiseReport =
async(req,res)=>{

try{

const AreaGroup =
require(
"../../models/daily/AreaGroup"
);

const areas =
await AreaGroup.find();

const report = [];

for(const area of areas){

const members =
await DailyMember.countDocuments({
areaGroup:area._id
});

const collections =
await DailyTransaction.aggregate([

{
$match:{
area:area._id
}
},

{
$group:{
_id:null,
total:{
$sum:"$totalAmount"
}
}
}

]);

report.push({

areaName:
area.areaName,

members,

totalCollection:
collections[0]?.total || 0,

status:"ACTIVE"

});

}

res.json({
success:true,
report
});

}catch(error){

res.status(500).json({
success:false,
message:error.message
});

}

};