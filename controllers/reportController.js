const Society = require("../models/Society");
const Member = require("../models/Members");
const Payment = require("../models/Payment");
const PDFDocument =
require("pdfkit");
exports.getDashboardReport = async (req, res) => {

  try {

    const totalSocieties =
      await Society.countDocuments();

    const totalMembers =
      await Member.countDocuments();

    const activeMembers =
      await Member.countDocuments({
        status: "ACTIVE"
      });

    const completedMembers =
      await Member.countDocuments({
        status: "COMPLETED"
      });

    const overdueMembers =
      await Member.countDocuments({
        status: "OVERDUE"
      });

    const collectionData =
      await Payment.aggregate([
        {
          $group: {
            _id: null,
            totalCollection: {
              $sum: "$totalReceived"
            }
          }
        }
      ]);

    const totalCollection =
      collectionData.length > 0
      ? collectionData[0].totalCollection
      : 0;

    const pendingData =
      await Member.aggregate([
        {
          $group: {
            _id: null,
            pendingAmount: {
              $sum: "$pendingAmount"
            }
          }
        }
      ]);

    const pendingCollection =
      pendingData.length > 0
      ? pendingData[0].pendingAmount
      : 0;

    res.status(200).json({

      success: true,

      totalSocieties,
      totalMembers,
      activeMembers,
      completedMembers,
      overdueMembers,

      totalCollection,
      pendingCollection

    });

  }

  catch (error) {

    res.status(500).json({

      success: false,
      message: error.message

    });

  }

};

exports.getSocietyAnalysis =
async(req,res)=>{

try{

const societies =
await Society.find();

const data = [];

for(const society of societies){

const memberCount =
await Member.countDocuments({
societyId:society._id
});

const payments =
await Payment.aggregate([
{
$match:{
societyId:society._id
}
},
{
$group:{
_id:null,
total:{
$sum:"$totalReceived"
}
}
}
]);

const totalCollection =
payments.length > 0
?
payments[0].total
:
0;

const pending =
await Member.aggregate([
{
$match:{
societyId:society._id
}
},
{
$group:{
_id:null,
pending:{
$sum:"$pendingAmount"
}
}
}
]);

const pendingAmount =
pending.length > 0
?
pending[0].pending
:
0;

data.push({

societyId:society._id,

societyName:
society.societyName,

poolSize:
society.maxMembers,


  joinedMembers:
  memberCount,

totalCollection,

pendingAmount,

status:
society.status

});

}

res.json({

success:true,
data

});

}
catch(error){

res.status(500).json({

success:false,
message:error.message

});

}

};

exports.downloadSocietyPdf = async (req, res) => {
  try {
    const society = await Society.findById(req.params.id);
    if (!society) {
      return res.status(404).json({ success: false, message: "Society not found" });
    }

    const members = await Member.find({ societyId: society._id });
    const payments = await Payment.find({ societyId: society._id })
      .populate("memberId", "name mobile")
      .sort({ paymentDate: -1 });

    const totalCollection = payments.reduce((sum, p) => sum + p.totalReceived, 0);
    const pendingCollection = members.reduce((sum, m) => sum + m.pendingAmount, 0);
    const totalInstallments = members.reduce((sum, m) => sum + m.totalInstallments, 0);
    const paidInstallments = members.reduce((sum, m) => sum + m.paidInstallments, 0);
    const remainingInstallments = totalInstallments - paidInstallments;

    const doc = new PDFDocument({ margin: 40, size: "A4" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition", 
      `attachment; filename="${society.societyName.replace(/\s+/g, "_")}-Report.pdf"`
    );
    doc.pipe(res);

    // HEADER BANNER
    doc.rect(0, 0, 595, 80).fill("#1E40AF");
    doc.fillColor("white").fontSize(20).font("Helvetica-Bold").text("CODEYART FINANCE MANAGEMENT SYSTEM", 40, 32);
    doc.fillColor("black").font("Helvetica").moveDown(3);

    // SOCIETY DETAILS
    doc.fontSize(18).fillColor("#1E40AF").font("Helvetica-Bold").text("Society Report", { underline: true });
    doc.fillColor("black").font("Helvetica").moveDown(0.5);
    doc.fontSize(11);
    doc.text(`Society Name : ${society.societyName}`);
    doc.text(`Duration : ${society.durationMonths} Months`);
    doc.text(`Pool Size : ${society.maxMembers}`);
    doc.text(`Joined Members : ${members.length}`);
    doc.text(`Status : ${society.status}`);
    doc.text(`Generated On : ${new Date().toLocaleDateString()}`);
    doc.moveDown(1.5);

    // SUMMARY BLOCK
    doc.fontSize(16).fillColor("#1E40AF").font("Helvetica-Bold").text("Collection Summary");
    doc.fillColor("black").font("Helvetica").moveDown(0.5);
    doc.text(`Total Collection : ₹${totalCollection.toLocaleString('en-IN')}`);
    doc.text(`Pending Collection : ₹${pendingCollection.toLocaleString('en-IN')}`);
    doc.text(`Total Installments : ${totalInstallments}`);
    doc.text(`Paid Installments : ${paidInstallments}`);
    doc.text(`Remaining Installments : ${remainingInstallments}`);
    doc.moveDown(1.5);

    // MEMBER DETAILS
    doc.fontSize(16).fillColor("#1E40AF").font("Helvetica-Bold").text("Member Details");
    doc.fillColor("black").font("Helvetica").moveDown(0.5);
    members.forEach((m, index) => {
      const remaining = m.totalInstallments - m.paidInstallments;
      doc.fontSize(12).font("Helvetica-Bold").text(`${index + 1}. ${m.name}`).font("Helvetica");
      doc.fontSize(10);
      doc.text(`Mobile : ${m.mobile}`);
      doc.text(`Monthly EMI : ₹${m.monthlyInstallment}`);
      doc.text(`Total Installments : ${m.totalInstallments}`);
      doc.text(`Paid Installments : ${m.paidInstallments}`);
      doc.text(`Remaining Installments : ${remaining}`);
      doc.text(`Total Paid : ₹${m.totalPaid}`);
      doc.text(`Pending Amount : ₹${m.pendingAmount}`);
      doc.moveDown(0.8);
    });

    // PAYMENT HISTORY
    if (payments.length > 0) {
      doc.addPage();
      doc.fontSize(18).fillColor("#1E40AF").font("Helvetica-Bold").text("Payment History", { underline: true });
      doc.fillColor("black").font("Helvetica").moveDown(0.5);
      payments.forEach((p, index) => {
        doc.fontSize(11).font("Helvetica-Bold").text(`${index + 1}. Date: ${new Date(p.paymentDate).toLocaleDateString()}`).font("Helvetica");
        doc.fontSize(10);
        doc.text(`Member : ${p.memberId?.name || "N/A"}`);
        doc.text(`Mobile : ${p.memberId?.mobile || "N/A"}`);
        doc.text(`Installment No : ${p.installmentNo}`);
        doc.text(`Installment Amount : ₹${p.installmentAmount}`);
        doc.text(`Penalty : ₹${p.penaltyAmount || 0}`);
        doc.text(`Total Received : ₹${p.totalReceived}`);
        doc.text(`Mode : ${p.paymentMode}`);
        doc.moveDown(0.8);
      });
    }

    // FOOTER
    doc.moveDown(2);
    doc.fontSize(9).fillColor("gray").text("Generated by CodeYart Finance Management System", { align: "center" });
    doc.end();

  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

exports.getRecentActivity = async (req,res)=>{

try{

const societies =
await Society.find()
.sort({createdAt:-1})
.limit(3);

const members =
await Member.find()
.sort({createdAt:-1})
.limit(3);

const payments =
await Payment.find()
.sort({createdAt:-1})
.limit(4);

const activities = [];

societies.forEach(item=>{

activities.push({

title:"Society Created",

desc:`${item.societyName} society created`,

time:item.createdAt

});

});

members.forEach(item=>{

activities.push({

title:"Member Added",

desc:`${item.name} joined society`,

time:item.createdAt

});

});

payments.forEach(item=>{

activities.push({

title:"Payment Received",

desc:`₹${item.totalReceived} received`,

time:item.paymentDate

});

});

activities.sort(
(a,b)=>
new Date(b.time) -
new Date(a.time)
);

res.json({
success:true,
activities
});

}
catch(error){

res.status(500).json({
success:false,
message:error.message
});

}

};
exports.getMonthlyCollection = async (req, res) => {

try {


const data =
await Payment.aggregate([

  {
    $group: {
      _id: {
        month: {
          $month: "$paymentDate"
        }
      },
      amount: {
        $sum: "$totalReceived"
      }
    }
  },

  {
    $sort: {
      "_id.month": 1
    }
  }

]);

const months = [
  "Jan","Feb","Mar","Apr",
  "May","Jun","Jul","Aug",
  "Sep","Oct","Nov","Dec"
];

const chartData =
data.map(item => ({

  month:
  months[item._id.month - 1],

  amount:
  item.amount

}));

res.json({

  success: true,

  data: chartData

});


}

catch (error) {


res.status(500).json({

  success: false,

  message: error.message

});


}

};
