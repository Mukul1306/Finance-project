const Expense =
require("../models/Expense");

exports.addExpense =
async(req,res)=>{

try{

const expense =
await Expense.create(req.body);

res.status(201).json({
success:true,
expense
});

}catch(error){

res.status(500).json({
success:false,
message:error.message
});

}

};

exports.getExpenses =
async(req,res)=>{

try{

const expenses =
await Expense.find()
.sort({createdAt:-1});

res.json({
success:true,
expenses
});

}catch(error){

res.status(500).json({
success:false,
message:error.message
});

}

};

exports.deleteExpense =
async(req,res)=>{

try{

await Expense.findByIdAndDelete(
req.params.id
);

res.json({
success:true,
message:"Expense Deleted"
});

}catch(error){

res.status(500).json({
success:false,
message:error.message
});

}

};