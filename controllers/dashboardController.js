const Society = require("../models/Society");
const Member = require("../models/daily/DailyMember");
const Payment = require("../models/Payment");

exports.getDashboardStats = async (req, res) => {

  try {

    const totalSocieties =
      await Society.countDocuments();

    const totalMembers =
      await Member.countDocuments();

    const totalCollection =
      await Payment.aggregate([
        {
          $group: {
            _id: null,
            total: {
              $sum: "$amount"
            }
          }
        }
      ]);

    const collection =
      totalCollection.length > 0
      ? totalCollection[0].total
      : 0;

    res.json({

      success: true,

      totalSocieties,

      totalMembers,

      totalCollection: collection

    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }

};