const mongoose = require("mongoose");

const DailyTransaction = require("../../models/daily/DailyTransaction");
const DailyMember = require("../../models/daily/DailyMember");
const DailySaving = require("../../models/daily/DailySaving");
const AreaGroup = require("../../models/daily/AreaGroup");

exports.collectPayment = async (req, res) => {
  try {
    const {
      memberId,
      savingId,
      amount,
      paymentMethod = "CASH",
      paymentForDate,
    } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(memberId) ||
      !mongoose.Types.ObjectId.isValid(savingId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid Member ID and Saving ID are required",
      });
    }

    const paymentAmount = Number(amount);

    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Payment amount must be greater than zero",
      });
    }

    if (!["CASH", "UPI", "BANK"].includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method",
      });
    }

    const member = await DailyMember.findById(memberId);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member Not Found",
      });
    }

    const saving = await DailySaving.findOne({
      _id: savingId,
      member: memberId,
      status: "ACTIVE",
    });

    if (!saving) {
      return res.status(404).json({
        success: false,
        message: "Active Saving Account Not Found",
      });
    }

    const date = paymentForDate
      ? new Date(paymentForDate)
      : new Date();

    if (Number.isNaN(date.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment date",
      });
    }

    // Use the saving's area to preserve its financial history.
    const areaId = saving.areaGroup;

    // Prevent paying the same saving date twice.
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(startOfDay);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

    const existingPayment = await DailyTransaction.findOne({
      savingAccount: saving._id,
      paymentForDate: {
        $gte: startOfDay,
        $lt: endOfDay,
      },
    });

    if (existingPayment) {
      return res.status(400).json({
        success: false,
        message: "Payment already collected for this date",
      });
    }

    const transaction = await DailyTransaction.create({
      member: member._id,
      savingAccount: saving._id,
      area: areaId,

      collectorType: "ADMIN",
      collectorId: null,

      collectionDate: new Date(),
      paymentForDate: date,

      dailyAmount: paymentAmount,
      penalty: 0,
      totalAmount: paymentAmount,
      paymentMethod,
      status: "PAID",
    });

    saving.totalSaved =
      Number(saving.totalSaved || 0) + paymentAmount;

    saving.totalDaysPaid =
      Number(saving.totalDaysPaid || 0) + 1;

    saving.completedDays = saving.totalDaysPaid;
    saving.lastCollectionDate = new Date();

    await saving.save();

    await AreaGroup.findByIdAndUpdate(areaId, {
      $inc: {
        totalCollection: paymentAmount,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Payment Collected Successfully",
      transaction,
      totalSaved: saving.totalSaved,
      totalDaysPaid: saving.totalDaysPaid,
    });
  } catch (error) {
    console.error("COLLECT PAYMENT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};