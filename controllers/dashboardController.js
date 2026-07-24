const Society = require("../models/Society");
const Member = require("../models/Members");
const Payment = require("../models/Payment");

exports.getDashboardStats = async (req, res) => {
  try {

    const totalSocieties = await Society.countDocuments();

    const totalMembers = await Member.countDocuments();

    const activeMembers = await Member.countDocuments({
      status: "ACTIVE"
    });

    // Total Collection
    const totalCollectionData = await Payment.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: "$totalReceived" }
        }
      }
    ]);

    const totalCollection =
      totalCollectionData.length > 0
        ? totalCollectionData[0].total
        : 0;

    // Current Month
    const firstDay = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    );

    const lastDay = new Date(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      0,
      23,
      59,
      59
    );

    // This Month Collection
    const monthCollectionData = await Payment.aggregate([
      {
        $match: {
          paymentDate: {
            $gte: firstDay,
            $lte: lastDay
          }
        }
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: "$totalReceived"
          }
        }
      }
    ]);

    const thisMonthCollection =
      monthCollectionData.length > 0
        ? monthCollectionData[0].total
        : 0;

    // Pending Collection
    // We will calculate this after checking your Member model
// Pending Collection (Current Month Only)

const activeMemberList = await Member.find({
  status: { $ne: "COMPLETED" }
});

let pendingCollection = 0;

for (const member of activeMemberList) {

  const payment = await Payment.findOne({
    memberId: member._id,
    paymentDate: {
      $gte: firstDay,
      $lte: lastDay
    }
  });

  if (!payment) {
    pendingCollection += member.monthlyInstallment;
  }

}

   res.json({

success:true,

totalSocieties,

totalMembers,

activeMembers,

totalCollection,

thisMonthCollection,

pendingCollection

});

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }
};