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
// CLEAN RULE
// =====================================================

function cleanRule(rule = {}) {
    return {
        enabled: rule.enabled !== false,

        penaltyType:
            rule.penaltyType === "FIXED"
                ? "FIXED"
                : "PERCENTAGE",

        penaltyValue: Math.max(
            0,
            Number(rule.penaltyValue || 0)
        ),

        gracePeriod: Math.max(
            0,
            Number(rule.gracePeriod || 0)
        ),

        maxPenalty: Math.max(
            0,
            Number(rule.maxPenalty || 0)
        ),
    };
}

// =====================================================
// GET /api/daily/penalty-control
// =====================================================

exports.getPenaltyControl = async (req, res) => {
    try {

        let policy = await PenaltyPolicy.findOne()
            .populate(
                "memberOverrides.member",
                "memberId memberName mobile"
            );

        // Create policy if not exists
        if (!policy) {

            policy = await PenaltyPolicy.create({
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

exports.getPenaltyMembers = async (req, res) => {
    try {

        const members = await DailyMember.find()
            .select("_id memberId memberName mobile")
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
// Example:
// GET /api/daily/penalty-control/effective/:memberId/LOAN
// =====================================================

exports.getEffectivePenalty = async (req, res) => {

    try {

        const {
            memberId,
            type,
        } = req.params;

        // Validate member ID
        if (
            !mongoose.Types.ObjectId.isValid(memberId)
        ) {

            return res.status(400).json({
                success: false,
                message: "Invalid Member ID",
            });

        }

        // Validate type
        if (
            !["LOAN", "DAILY_SAVING"].includes(type)
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Type must be LOAN or DAILY_SAVING",
            });

        }

        const policy =
            await PenaltyPolicy.findOne();

        // No policy
        if (!policy) {

            return res.status(200).json({
                success: true,
                rule: DEFAULT_RULE,
                source: "DEFAULT",
            });

        }

        // =================================================
        // FIND MEMBER OVERRIDE
        // =================================================

        const override =
            policy.memberOverrides
                ?.filter((item) => {

                    return (
                        String(item.member) ===
                        String(memberId) &&

                        (
                            item.appliesTo === type ||
                            item.appliesTo === "BOTH"
                        )
                    );

                })
                ?.sort(
                    (a, b) =>
                        new Date(b.updatedAt || 0) -
                        new Date(a.updatedAt || 0)
                )[0];

        // Member-specific rule
        if (override) {

            return res.status(200).json({
                success: true,
                rule: cleanRule(override),
                source: "MEMBER",
            });

        }

        // =================================================
        // GLOBAL RULE
        // =================================================

        const rule =
            type === "LOAN"
                ? policy.loan
                : policy.dailySaving;

        return res.status(200).json({
            success: true,
            rule: cleanRule(rule),
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
// APPLY PENALTY POLICY
// =====================================================
//
// Supports:
//
// ALL MEMBERS
// SPECIFIC MEMBERS
//
// LOAN
// DAILY_SAVING
// BOTH
//
// FIXED
// PERCENTAGE
//
// Existing accounts are updated.
// Historical payment transactions are NOT changed.
//
// =====================================================

exports.applyPenaltyPolicy = async (req, res) => {

    try {

        // =================================================
        // IMPORTANT
        // =================================================
        //
        // Your frontend sends:
        //
        // {
        //   appliesTo,
        //   scope,
        //   memberIds,
        //   rule: {
        //      enabled,
        //      penaltyType,
        //      penaltyValue,
        //      gracePeriod,
        //      maxPenalty
        //   }
        // }
        //
        // Therefore we MUST read rule from req.body.rule
        // =================================================

        const {
            appliesTo,
            scope,
            memberIds = [],
            rule: incomingRule = {},
        } = req.body;

        // =================================================
        // NORMALIZE RULE
        // =================================================

        const rule = cleanRule(incomingRule);

        // =================================================
        // LOG REQUEST
        // =================================================

        console.log(
            "========================================"
        );

        console.log(
            "APPLY PENALTY POLICY REQUEST"
        );

        console.log(
            "Applies To:",
            appliesTo
        );

        console.log(
            "Scope:",
            scope
        );

        console.log(
            "Member IDs:",
            memberIds
        );

        console.log(
            "Incoming Rule:",
            incomingRule
        );

        console.log(
            "Clean Rule:",
            rule
        );

        console.log(
            "========================================"
        );

        // =================================================
        // VALIDATION
        // =================================================

        if (
            !["LOAN", "DAILY_SAVING", "BOTH"]
                .includes(appliesTo)
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Invalid appliesTo value",
            });

        }

        if (
            !["ALL", "SPECIFIC"]
                .includes(scope)
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Invalid scope value",
            });

        }

        if (
            !["FIXED", "PERCENTAGE"]
                .includes(rule.penaltyType)
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Invalid penalty type",
            });

        }

        // =================================================
        // SPECIFIC MEMBER VALIDATION
        // =================================================

        if (scope === "SPECIFIC") {

            if (
                !Array.isArray(memberIds) ||
                memberIds.length === 0
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Please select at least one member",
                });

            }

        }

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
        // =================================================
        // ALL MEMBERS
        // =================================================
        // =================================================

        if (scope === "ALL") {

            // =============================================
            // GLOBAL LOAN POLICY
            // =============================================

            if (
                appliesTo === "LOAN" ||
                appliesTo === "BOTH"
            ) {

                policy.loan = rule;

            }

            // =============================================
            // GLOBAL DAILY SAVING POLICY
            // =============================================

            if (
                appliesTo === "DAILY_SAVING" ||
                appliesTo === "BOTH"
            ) {

                policy.dailySaving = rule;

            }

            // Save central policy
            await policy.save();

            // =============================================
            // UPDATE EXISTING LOANS
            // =============================================

            let loanResult = null;

            if (
                appliesTo === "LOAN" ||
                appliesTo === "BOTH"
            ) {

                loanResult =
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

                console.log(
                    "ALL LOANS UPDATED:",
                    loanResult
                );

            }

            // =============================================
            // UPDATE EXISTING DAILY SAVINGS
            // =============================================

            let savingResult = null;

            if (
                appliesTo === "DAILY_SAVING" ||
                appliesTo === "BOTH"
            ) {

                savingResult =
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

                console.log(
                    "ALL SAVINGS UPDATED:",
                    savingResult
                );

            }

            // =============================================
            // RESPONSE
            // =============================================

            return res.status(200).json({

                success: true,

                message:
                    "Penalty policy applied to all members successfully",

                policy,

                loanUpdated:
                    loanResult
                        ? loanResult.modifiedCount
                        : 0,

                savingUpdated:
                    savingResult
                        ? savingResult.modifiedCount
                        : 0,

                rule,

            });

        }

        // =================================================
        // =================================================
        // SPECIFIC MEMBERS
        // =================================================
        // =================================================

        // =============================================
        // VALIDATE MEMBER IDS
        // =============================================

        const validObjectIds =
            memberIds.filter((id) =>
                mongoose.Types.ObjectId.isValid(id)
            );

        if (
            validObjectIds.length === 0
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "No valid member IDs found",
            });

        }

        // =============================================
        // CHECK MEMBERS EXIST
        // =============================================

        const validMembers =
            await DailyMember.find({
                _id: {
                    $in: validObjectIds,
                },
            })
                .select("_id");

        const validMemberIds =
            validMembers.map(
                (member) =>
                    member._id.toString()
            );

        if (
            validMemberIds.length === 0
        ) {

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

            // =============================================
            // If BOTH:
            // We store BOTH.
            //
            // If LOAN:
            // Store LOAN.
            //
            // If DAILY_SAVING:
            // Store DAILY_SAVING.
            // =============================================

            const existingIndex =
                policy.memberOverrides.findIndex(
                    (item) =>
                        String(item.member) ===
                        String(memberId) &&

                        item.appliesTo ===
                        appliesTo
                );

            const override = {
                member: memberId,

                appliesTo,

                enabled:
                    rule.enabled,

                penaltyType:
                    rule.penaltyType,

                penaltyValue:
                    rule.penaltyValue,

                gracePeriod:
                    rule.gracePeriod,

                maxPenalty:
                    rule.maxPenalty,
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

        // Save policy
        await policy.save();

        // =================================================
        // UPDATE EXISTING MEMBER LOANS
        // =================================================

        let loanUpdateResult = null;

        if (
            appliesTo === "LOAN" ||
            appliesTo === "BOTH"
        ) {

            loanUpdateResult =
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

            console.log(
                "========================================"
            );

            console.log(
                "SPECIFIC MEMBER LOAN UPDATE"
            );

            console.log(
                "Members:",
                validMemberIds
            );

            console.log(
                "Rule:",
                rule
            );

            console.log(
                "Matched Loans:",
                loanUpdateResult.matchedCount
            );

            console.log(
                "Modified Loans:",
                loanUpdateResult.modifiedCount
            );

            console.log(
                "========================================"
            );

        }

        // =================================================
        // UPDATE EXISTING MEMBER SAVINGS
        // =================================================

        let savingUpdateResult = null;

        if (
            appliesTo === "DAILY_SAVING" ||
            appliesTo === "BOTH"
        ) {

            savingUpdateResult =
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

            console.log(
                "========================================"
            );

            console.log(
                "SPECIFIC MEMBER SAVING UPDATE"
            );

            console.log(
                "Members:",
                validMemberIds
            );

            console.log(
                "Rule:",
                rule
            );

            console.log(
                "Matched Savings:",
                savingUpdateResult.matchedCount
            );

            console.log(
                "Modified Savings:",
                savingUpdateResult.modifiedCount
            );

            console.log(
                "========================================"
            );

        }

        // =================================================
        // FINAL RESPONSE
        // =================================================

        return res.status(200).json({

            success: true,

            message:
                "Penalty policy applied to selected members successfully",

            policy,

            updatedMembers:
                validMemberIds.length,

            rule,

            loanUpdated:
                loanUpdateResult
                    ? loanUpdateResult.modifiedCount
                    : 0,

            loanMatched:
                loanUpdateResult
                    ? loanUpdateResult.matchedCount
                    : 0,

            savingUpdated:
                savingUpdateResult
                    ? savingUpdateResult.modifiedCount
                    : 0,

            savingMatched:
                savingUpdateResult
                    ? savingUpdateResult.matchedCount
                    : 0,

        });

    } catch (error) {

        console.error(
            "========================================"
        );

        console.error(
            "APPLY PENALTY POLICY ERROR:"
        );

        console.error(error);

        console.error(
            "========================================"
        );

        return res.status(500).json({

            success: false,

            message:
                error.message,

        });

    }

};