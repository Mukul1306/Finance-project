const BusinessFund =
require("../../models/daily/BusinessFund");

// ==========================================
// ADD BUSINESS FUND
// ==========================================

exports.addBusinessFund = async (req, res) => {

  try {

    const fund =
    await BusinessFund.create(req.body);

    res.status(201).json({
      success: true,
      fund
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }

};

// ==========================================
// GET ALL BUSINESS FUNDS
// ==========================================

exports.getBusinessFunds = async (req, res) => {

  try {

    const funds =
    await BusinessFund.find()
    .sort({ fundDate: -1 });

    res.json({
      success: true,
      funds
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }

};

// ==========================================
// DELETE BUSINESS FUND
// ==========================================

exports.deleteBusinessFund = async (req, res) => {

  try {

    await BusinessFund.findByIdAndDelete(
      req.params.id
    );

    res.json({
      success: true,
      message: "Business Fund Deleted"
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }

};