const mongoose = require("mongoose");

const PenaltyPolicy = require("../../models/daily/PenaltyPolicy");
const DailyMember = require("../../models/daily/DailyMember");
const DailyLoan = require("../../models/daily/DailyLoan");
const DailySaving = require("../../models/daily/DailySaving");

// =====================================================
// DEFAULT RULE
// =====================================================

const DEFAULT_RULE = {
  enabled: true,
  penaltyType: "PERCENTAGE",
  penaltyValue: 0,
  gracePeriod: 0,
  maxPenalty: 0,
};

// =====================================================
// GET /api/daily/penalty-control
// =====================================================

exports.getPenaltyControl = async (
  req,
  res
) => {
  try {
    let policy =
      await PenaltyPolicy.findOne()
        .populate(
          "memberOverrides.member",
          "memberId memberName mobile"
        );

    if (!policy) {
      policy =
        await PenaltyPolicy.create({
          loan: DEFAULT_RULE,
          dailySaving: DEFAULT_RULE,
          memberOverrides: [],
        });
    }

    return res.status(200).json({
      success: true,
      policy,
    });
  } catch (error) {
    console.error(
      "GET PENALTY CONTROL ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// GET MEMBERS
// =====================================================

exports.getPenaltyMembers = async (
  req,
  res
) => {
  try {
    const members =
      await DailyMember.find()
        .select(
          "_id memberId memberName mobile"
        )
        .sort({
          memberName: 1,
        });

    return res.status(200).json({
      success: true,
      members,
    });
  } catch (error) {
    console.error(
      "GET PENALTY MEMBERS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// GET EFFECTIVE POLICY
// =====================================================

exports.getEffectivePenalty = async (
  req,
  res
) => {
  try {
    const {
      memberId,
      type,
    } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(
        memberId
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid Member ID",
      });
    }

    if (
      !["LOAN", "DAILY_SAVING"].includes(
        type
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Type must be LOAN or DAILY_SAVING",
      });
    }

    const policy =
      await PenaltyPolicy.findOne();

    if (!policy) {
      return res.status(200).json({
        success: true,
        rule: DEFAULT_RULE,
      });
    }

    const override =
      policy.memberOverrides
        ?.filter(
          (item) =>
            String(item.member) ===
              String(memberId) &&
            (
              item.appliesTo === type ||
              item.appliesTo === "BOTH"
            )
        )
        ?.sort(
          (a, b) =>
            new Date(b.updatedAt || 0) -
            new Date(a.updatedAt || 0)
        )[0];

    if (override) {
      return res.status(200).json({
        success: true,
        rule: override,
        source: "MEMBER",
      });
    }

    const rule =
      type === "LOAN"
        ? policy.loan
        : policy.dailySaving;

    return res.status(200).json({
      success: true,
      rule,
      source: "GLOBAL",
    });
  } catch (error) {
    console.error(
      "GET EFFECTIVE PENALTY ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// APPLY POLICY
// =====================================================

exports.applyPenaltyPolicy = async (
  req,
  res
) => {
  try {
    const {
      appliesTo,
      scope,
      memberIds = [],
      penaltyType,
      penaltyValue,
      gracePeriod,
      maxPenalty,
      autoPenalty,
    } = req.body;

    // =================================================
    // VALIDATION
    // =================================================

    if (
      !["LOAN", "DAILY_SAVING", "BOTH"].includes(
        appliesTo
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid appliesTo value",
      });
    }

    if (
      !["ALL", "SPECIFIC"].includes(
        scope
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid scope value",
      });
    }

    if (
      !["FIXED", "PERCENTAGE"].includes(
        penaltyType
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid penalty type",
      });
    }

    if (
      scope === "SPECIFIC" &&
      (!Array.isArray(memberIds) ||
        memberIds.length === 0)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please select at least one member",
      });
    }

    const rule = {
      enabled:
        autoPenalty !== false,

      penaltyType,

      penaltyValue: Math.max(
        0,
        Number(penaltyValue || 0)
      ),

      gracePeriod: Math.max(
        0,
        Number(gracePeriod || 0)
      ),

      maxPenalty: Math.max(
        0,
        Number(maxPenalty || 0)
      ),
    };

    // =================================================
    // FIND / CREATE CENTRAL POLICY
    // =================================================

    let policy =
      await PenaltyPolicy.findOne();

    if (!policy) {
      policy =
        await PenaltyPolicy.create({
          loan: DEFAULT_RULE,
          dailySaving: DEFAULT_RULE,
          memberOverrides: [],
        });
    }

    // =================================================
    // APPLY GLOBAL POLICY
    // =================================================

    if (scope === "ALL") {
      if (
        appliesTo === "LOAN" ||
        appliesTo === "BOTH"
      ) {
        policy.loan = rule;
      }

      if (
        appliesTo === "DAILY_SAVING" ||
        appliesTo === "BOTH"
      ) {
        policy.dailySaving = rule;
      }

      await policy.save();

      // ===============================================
      // UPDATE EXISTING LOANS
      // ===============================================

      if (
        appliesTo === "LOAN" ||
        appliesTo === "BOTH"
      ) {
        await DailyLoan.updateMany(
          {},
          {
            $set: {
              autoPenalty:
                rule.enabled,

              gracePeriod:
                rule.gracePeriod,

              penaltyType:
                rule.penaltyType,

              penaltyValue:
                rule.penaltyValue,

              maxPenalty:
                rule.maxPenalty,
            },
          }
        );
      }

      // ===============================================
      // UPDATE EXISTING DAILY SAVINGS
      // ===============================================

      if (
        appliesTo === "DAILY_SAVING" ||
        appliesTo === "BOTH"
      ) {
        await DailySaving.updateMany(
          {},
          {
            $set: {
              autoPenalty:
                rule.enabled,

              graceDays:
                rule.gracePeriod,

              penaltyType:
                rule.penaltyType,

              penaltyValue:
                rule.penaltyValue,

              maxPenalty:
                rule.maxPenalty,
            },
          }
        );
      }

      return res.status(200).json({
        success: true,
        message:
          "Penalty policy applied to all members successfully",
        policy,
      });
    }

    // =================================================
    // SPECIFIC MEMBERS
    // =================================================

    const validMembers =
      await DailyMember.find({
        _id: {
          $in: memberIds,
        },
      }).select("_id");

    const validMemberIds =
      validMembers.map((member) =>
        member._id.toString()
      );

    if (validMemberIds.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "No valid members found",
      });
    }

    // =================================================
    // UPDATE MEMBER OVERRIDES
    // =================================================

    for (
      const memberId of validMemberIds
    ) {
      const existingIndex =
        policy.memberOverrides.findIndex(
          (item) =>
            String(item.member) ===
              String(memberId) &&
            item.appliesTo ===
              appliesTo
        );

      const override = {
        member:
          memberId,

        appliesTo,

        ...rule,
      };

      if (existingIndex >= 0) {
        policy.memberOverrides[
          existingIndex
        ] = override;
      } else {
        policy.memberOverrides.push(
          override
        );
      }
    }

    await policy.save();

    // =================================================
    // UPDATE EXISTING MEMBER LOANS
    // =================================================

    if (
      appliesTo === "LOAN" ||
      appliesTo === "BOTH"
    ) {
      await DailyLoan.updateMany(
        {
          member: {
            $in: validMemberIds,
          },
        },
        {
          $set: {
            autoPenalty:
              rule.enabled,

            gracePeriod:
              rule.gracePeriod,

            penaltyType:
              rule.penaltyType,

            penaltyValue:
              rule.penaltyValue,

            maxPenalty:
              rule.maxPenalty,
          },
        }
      );
    }

    // =================================================
    // UPDATE EXISTING MEMBER SAVINGS
    // =================================================

    if (
      appliesTo === "DAILY_SAVING" ||
      appliesTo === "BOTH"
    ) {
      await DailySaving.updateMany(
        {
          member: {
            $in: validMemberIds,
          },
        },
        {
          $set: {
            autoPenalty:
              rule.enabled,

            graceDays:
              rule.gracePeriod,

            penaltyType:
              rule.penaltyType,

            penaltyValue:
              rule.penaltyValue,

            maxPenalty:
              rule.maxPenalty,
          },
        }
      );
    }

    return res.status(200).json({
      success: true,
      message:
        "Penalty policy applied to selected members successfully",
      policy,
      updatedMembers:
        validMemberIds.length,
    });
  } catch (error) {
    console.error(
      "APPLY PENALTY POLICY ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};