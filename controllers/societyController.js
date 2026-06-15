const Society =
require("../models/Society");
const Payment = require("../models/Payment");

// Create Society

exports.createSociety = async (req, res) => {

  try {

    const {

      societyName,
      startDate,
      durationMonths,
      maxMembers

    } = req.body;

    const society =
    await Society.create({

      societyName,

      startDate,

      durationMonths:
      Number(durationMonths),

      maxMembers,

      currentMembers: 0,

      status: "Active"

    });

    res.status(201).json({

      success: true,

      message:
      "Society Created Successfully",

      society

    });

  }

  catch (error) {

    res.status(500).json({

      success: false,

      message:
      error.message

    });

  }

};


// Get All Societies

exports.getSocieties = async (req, res) => {
  try {

    const societies = await Society.find()
      .sort({ createdAt: -1 });

    const result = [];

    for (const society of societies) {

      const payments = await Payment.aggregate([
        {
          $match: {
            societyId: society._id
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

      result.push({
        ...society.toObject(),

        totalCollection:
          payments.length > 0
            ? payments[0].total
            : 0
      });
    }

    res.status(200).json({
      success: true,
      societies: result
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }
};




// Get Single Society

exports.getSocietyById =
async (req, res) => {

    try {

        const society =
        await Society.findById(
            req.params.id
        );

        if (!society) {

            return res.status(404)
            .json({

                success: false,
                message:
                "Society Not Found"

            });

        }

        res.status(200).json({

            success: true,
            society

        });

    }

    catch (error) {

        res.status(500).json({

            success: false,
            message:
            error.message

        });

    }

};




// Update Society

exports.updateSociety =
async (req, res) => {

    try {

        const society =
        await Society.findByIdAndUpdate(

            req.params.id,

            req.body,

            {
                new: true
            }

        );

        res.status(200).json({

            success: true,
            message:
            "Society Updated",

            society

        });

    }

    catch (error) {

        res.status(500).json({

            success: false,
            message:
            error.message

        });

    }

};




// Delete Society

exports.deleteSociety =
async (req, res) => {

    try {

        await Society.findByIdAndDelete(
            req.params.id
        );

        res.status(200).json({

            success: true,
            message:
            "Society Deleted"

        });

    }

    catch (error) {

        res.status(500).json({

            success: false,
            message:
            error.message

        });

    }

};