const AgentDeposit = require("../../models/daily/AgentDeposit");
const DailyTransaction = require("../../models/daily/DailyTransaction");
const LoanCollection = require("../../models/daily/LoanCollection");
/*
=====================================
RECEIVE MONEY FROM AGENT
=====================================
*/

exports.receiveMoney = async (req, res) => {

  try {

    const {
      agentId,
      amount,
      paymentMode,
      remark,
      receivedBy
    } = req.body;

    const deposit = await AgentDeposit.create({

      agentId,

      amount,

      paymentMode,

      remark,

      receivedBy

    });

    res.status(201).json({

      success: true,

      message: "Amount Received Successfully",

      deposit

    });

  }

  catch (error) {

    res.status(500).json({

      success: false,

      message: error.message

    });

  }

};


/*
=====================================
GET AGENT CASH SUMMARY
=====================================
*/
const mongoose = require("mongoose");

exports.getAgentCashSummary = async (req, res) => {

  try {

    const { agentId } = req.params;

    const objectId =
      new mongoose.Types.ObjectId(agentId);

    // ===============================
    // DAILY SAVING COLLECTION
    // ===============================

    const savingCollection =
      await DailyTransaction.aggregate([

        {
          $match: {
            collectorId: objectId,
            collectorType: "AGENT"
          }
        },

        {
          $group: {
            _id: null,
            total: {
              $sum: "$totalAmount"
            }
          }
        }

      ]);

    // ===============================
    // LOAN EMI COLLECTION
    // ===============================

  const loanCollection = await LoanCollection.aggregate([
  {
    $match: {
      collectorId: require("mongoose").Types.ObjectId.createFromHexString(agentId),
      collectorType: "AGENT"
    }
  },
  {
    $group: {
      _id: null,
      total: { $sum: "$totalAmount" }
    }
  }
]);

    // ===============================
    // TOTAL COLLECTION
    // ===============================

    const totalSavingCollection =
      savingCollection[0]?.total || 0;

    const totalLoanCollection =
      loanCollection[0]?.total || 0;

   const totalCollection =
    (savingCollection[0]?.total || 0) +
    (loanCollection[0]?.total || 0);

    // ===============================
    // TOTAL DEPOSIT
    // ===============================

    const deposits =
      await AgentDeposit.aggregate([

        {
          $match: {
            agentId: objectId
          }
        },

        {
          $group: {
            _id: null,
            total: {
              $sum: "$amount"
            }
          }
        }

      ]);

    const totalDeposit =
      deposits[0]?.total || 0;

    // ===============================
    // CASH PENDING WITH AGENT
    // ===============================

    const pendingAmount =
      totalCollection -
      totalDeposit;

    // ===============================
    // RESPONSE
    // ===============================

    res.json({

      success: true,

      savingCollection: totalSavingCollection,

      loanCollection: totalLoanCollection,

      totalCollection,

      totalDeposit,

      pendingAmount

    });

  }

  catch (error) {

    res.status(500).json({

      success: false,

      message: error.message

    });

  }

};

/*
=====================================
GET DEPOSIT HISTORY
=====================================
*/

exports.getDepositHistory = async (req, res) => {

  try {

    const deposits = await AgentDeposit.find({

      agentId: req.params.agentId

    })

    .sort({

      depositDate: -1

    });

    res.json({

      success: true,

      deposits

    });

  }

  catch (error) {

    res.status(500).json({

      success: false,

      message: error.message

    });

  }

};