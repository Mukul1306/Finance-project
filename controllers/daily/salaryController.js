const AgentSalary = require("../../models/daily/AgentSalary");
const MonthlySalary = require("../../models/daily/MonthlySalary");

const DailyAgent = require("../../models/daily/Agent");
const DailyTransaction = require("../../models/daily/DailyTransaction");
const LoanCollection = require("../../models/daily/LoanCollection");
const DailyLoan = require("../../models/daily/DailyLoan");


// =====================================================
// ADD AGENT TO SALARY MANAGEMENT
// =====================================================

exports.addAgentToSalary = async (req, res) => {

    try {

      const {
    agentId,
    salaryType,
    commissionRate,
    fixedSalary
} = req.body;

        if (!agentId) {

            return res.status(400).json({
                success: false,
                message: "Agent ID is required"
            });

        }


        const agent =
            await DailyAgent.findById(agentId);


        if (!agent) {

            return res.status(404).json({
                success: false,
                message: "Agent not found"
            });

        }


        const existing =
            await AgentSalary.findOne({
                agent: agentId
            });


        if (existing) {

            return res.status(400).json({
                success: false,
                message: "Agent already added to salary"
            });

        }


    const salary =
    await AgentSalary.create({

        agent: agentId,

        salaryType:
            salaryType || "COMMISSION",

        commissionRate:
            salaryType === "COMMISSION"
                ? Number(commissionRate || 2)
                : 0,

        fixedSalary:
            salaryType === "FIXED"
                ? Number(fixedSalary || 0)
                : 0,

        includeDailySaving: true,

        includeDailyLoan: true,

        includeWeeklyLoan: true,

        excludePenalty: true,

        excludeMonthlyLoan: true,

        excludeFixedLoan: true

    });

        res.status(201).json({

            success: true,

            message:
                "Agent added to salary management",

            salary

        });

    } catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};


// =====================================================
// GET SALARY ENABLED AGENTS
// =====================================================

exports.getSalaryAgents = async (req, res) => {

    try {

        const agents =
            await AgentSalary.find({
                status: "ACTIVE"
            })
            .populate(
                "agent",
                "name mobile operationalArea status"
            )
            .sort({
                createdAt: -1
            });


        res.json({

            success: true,

            agents

        });

    } catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};


// =====================================================
// CALCULATE ONE AGENT MONTHLY SALARY
// =====================================================

const calculateAgentSalary = async (
    agentId,
    month,
    year
) => {

    const salaryProfile =
        await AgentSalary.findOne({
            agent: agentId,
            status: "ACTIVE"
        });


    if (!salaryProfile) {

        throw new Error(
            "Agent is not added to salary management"
        );

    }


    const startDate =
        new Date(year, month - 1, 1);

    const endDate =
        new Date(year, month, 1);


    // =================================================
    // DAILY SAVING
    // =================================================

    const dailyTransactions =
        await DailyTransaction.find({

            collectorId: agentId,

            collectorType: "AGENT",

            collectionDate: {
                $gte: startDate,
                $lt: endDate
            }

        });


    let dailySavingCollection = 0;

    let penaltyCollection = 0;


    dailyTransactions.forEach(
        transaction => {

            // BASE AMOUNT ONLY
            dailySavingCollection +=
                Number(
                    transaction.dailyAmount || 0
                );


            // PENALTY IS TRACKED SEPARATELY
            penaltyCollection +=
                Number(
                    transaction.penalty || 0
                );

        }
    );


    // =================================================
    // LOAN COLLECTIONS
    // =================================================

    const loanCollections =
        await LoanCollection.find({

            collectorId: agentId,

            collectorType: "AGENT",

            paymentDate: {
                $gte: startDate,
                $lt: endDate
            },

            status: "PAID"

        }).populate(
            "loan",
            "loanType"
        );


    let dailyLoanCollection = 0;

    let weeklyLoanCollection = 0;

    let monthlyLoanCollection = 0;

    let fixedLoanCollection = 0;


    loanCollections.forEach(
        collection => {

            const loan =
                collection.loan;


            if (!loan) {
                return;
            }


            // BASE EMI = principal + interest
            const baseAmount =
                Number(
                    collection.principalAmount || 0
                ) +
                Number(
                    collection.interestAmount || 0
                );


            const penalty =
                Number(
                    collection.penalty || 0
                );


            penaltyCollection += penalty;


            // ==========================================
            // DAILY
            // ==========================================

            if (
                loan.loanType === "DAILY"
            ) {

                dailyLoanCollection +=
                    baseAmount;

            }


            // ==========================================
            // WEEKLY
            // ==========================================

            else if (
                loan.loanType === "WEEKLY"
            ) {

                weeklyLoanCollection +=
                    baseAmount;

            }


            // ==========================================
            // MONTHLY
            // ==========================================

            else if (
                loan.loanType === "MONTHLY"
            ) {

                monthlyLoanCollection +=
                    baseAmount;

            }


            // ==========================================
            // FIXED
            // ==========================================

            else if (
                loan.loanType === "FIXED"
            ) {

                fixedLoanCollection +=
                    baseAmount;

            }

        }
    );


    // =================================================
    // ELIGIBLE COLLECTION
    // =================================================

    let eligibleCollection = 0;


    if (
        salaryProfile.includeDailySaving
    ) {

        eligibleCollection +=
            dailySavingCollection;

    }


    if (
        salaryProfile.includeDailyLoan
    ) {

        eligibleCollection +=
            dailyLoanCollection;

    }


    if (
        salaryProfile.includeWeeklyLoan
    ) {

        eligibleCollection +=
            weeklyLoanCollection;

    }


    // =================================================
    // COMMISSION
    // =================================================

const commissionRate =
    Number(
        salaryProfile.commissionRate || 0
    );

const fixedSalary =
    Number(
        salaryProfile.fixedSalary || 0
    );


// =================================================
// SALARY CALCULATION
// =================================================

let calculatedSalary = 0;

if (
    salaryProfile.salaryType === "FIXED"
) {

    // Fixed monthly salary
    calculatedSalary = fixedSalary;

} else {

    // Commission salary
    calculatedSalary =
        Number(
            (
                eligibleCollection *
                commissionRate /
                100
            ).toFixed(2)
        );

}


    return {

        dailySavingCollection:
            Number(
                dailySavingCollection.toFixed(2)
            ),

        dailyLoanCollection:
            Number(
                dailyLoanCollection.toFixed(2)
            ),

        weeklyLoanCollection:
            Number(
                weeklyLoanCollection.toFixed(2)
            ),

        penaltyCollection:
            Number(
                penaltyCollection.toFixed(2)
            ),

        monthlyLoanCollection:
            Number(
                monthlyLoanCollection.toFixed(2)
            ),

        fixedLoanCollection:
            Number(
                fixedLoanCollection.toFixed(2)
            ),

        eligibleCollection:
            Number(
                eligibleCollection.toFixed(2)
            ),

       salaryType:
    salaryProfile.salaryType,

commissionRate,

fixedSalary,

calculatedSalary

    };

};


// =====================================================
// GET MONTHLY SALARY TABLE
// =====================================================

exports.getMonthlySalary = async (req, res) => {

    try {

        const month =
            Number(req.query.month);

        const year =
            Number(req.query.year);


        if (
            !month ||
            !year ||
            month < 1 ||
            month > 12
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Valid month and year are required"

            });

        }


        const salaryProfiles =
            await AgentSalary.find({
                status: "ACTIVE"
            })
            .populate(
                "agent",
                "name mobile operationalArea status"
            );


        const salaries = [];


        for (
            const profile of salaryProfiles
        ) {

            const calculation =
                await calculateAgentSalary(
                    profile.agent._id,
                    month,
                    year
                );


            let monthlySalary =
                await MonthlySalary.findOne({

                    agent: profile.agent._id,

                    month,

                    year

                });


            if (!monthlySalary) {

                monthlySalary =
                    await MonthlySalary.create({

                        agent:
                            profile.agent._id,

                        month,

                        year,

                        ...calculation,

                        paidAmount: 0,

                        pendingAmount:
                            calculation.calculatedSalary,

                        status: "PENDING"

                    });

            } else {

                // Update calculation
                // but preserve payment

                monthlySalary.dailySavingCollection =
                    calculation.dailySavingCollection;

                monthlySalary.dailyLoanCollection =
                    calculation.dailyLoanCollection;

                monthlySalary.weeklyLoanCollection =
                    calculation.weeklyLoanCollection;

                monthlySalary.penaltyCollection =
                    calculation.penaltyCollection;

                monthlySalary.monthlyLoanCollection =
                    calculation.monthlyLoanCollection;

                monthlySalary.fixedLoanCollection =
                    calculation.fixedLoanCollection;

                monthlySalary.eligibleCollection =
                    calculation.eligibleCollection;

             monthlySalary.salaryType =
    calculation.salaryType;

monthlySalary.fixedSalary =
    calculation.fixedSalary;

monthlySalary.commissionRate =
    calculation.commissionRate;

monthlySalary.calculatedSalary =
    calculation.calculatedSalary;


                monthlySalary.pendingAmount =
                    Math.max(
                        0,
                        calculation.calculatedSalary -
                        Number(
                            monthlySalary.paidAmount || 0
                        )
                    );


                if (
                    monthlySalary.paidAmount >=
                    calculation.calculatedSalary
                ) {

                    monthlySalary.status =
                        "PAID";

                } else if (
                    monthlySalary.paidAmount > 0
                ) {

                    monthlySalary.status =
                        "PARTIAL";

                } else {

                    monthlySalary.status =
                        "PENDING";

                }


                await monthlySalary.save();

            }


            salaries.push({

                agent: profile.agent,
salaryProfile: {

    salaryType:
        profile.salaryType,

    commissionRate:
        profile.commissionRate,

    fixedSalary:
        profile.fixedSalary

},

                salary: monthlySalary

            });

        }


        // =================================================
        // SUMMARY
        // =================================================

        const totalSalary =
            salaries.reduce(
                (sum, item) =>
                    sum +
                    Number(
                        item.salary.calculatedSalary || 0
                    ),
                0
            );


        const totalPaid =
            salaries.reduce(
                (sum, item) =>
                    sum +
                    Number(
                        item.salary.paidAmount || 0
                    ),
                0
            );


        const totalPending =
            salaries.reduce(
                (sum, item) =>
                    sum +
                    Number(
                        item.salary.pendingAmount || 0
                    ),
                0
            );


        res.json({

            success: true,

            month,

            year,

            summary: {

                totalStaff:
                    salaries.length,

                totalSalary:
                    Number(totalSalary.toFixed(2)),

                totalPaid:
                    Number(totalPaid.toFixed(2)),

                totalPending:
                    Number(totalPending.toFixed(2))

            },

            salaries

        });

    } catch (error) {

        console.log(error);

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};


// =====================================================
// PAY SALARY
// =====================================================

exports.paySalary = async (req, res) => {

    try {

        const {

            salaryId,

            paidAmount,

            paymentMode,

            paymentReference,

            remarks

        } = req.body;


        const salary =
            await MonthlySalary.findById(
                salaryId
            );


        if (!salary) {

            return res.status(404).json({

                success: false,

                message:
                    "Salary record not found"

            });

        }


        const amount =
            Number(paidAmount);


        if (
            !amount ||
            amount <= 0
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid payment amount"

            });

        }


        const remaining =
            Number(
                salary.calculatedSalary || 0
            ) -
            Number(
                salary.paidAmount || 0
            );


        if (amount > remaining) {

            return res.status(400).json({

                success: false,

                message:
                    "Payment exceeds pending salary"

            });

        }


        salary.paidAmount =
            Number(
                salary.paidAmount || 0
            ) + amount;


        salary.pendingAmount =
            Math.max(
                0,
                salary.calculatedSalary -
                salary.paidAmount
            );


        salary.paidDate =
            new Date();


        salary.paymentMode =
            paymentMode || "BANK";


        salary.paymentReference =
            paymentReference || "";


        salary.remarks =
            remarks || "";


        if (
            salary.pendingAmount === 0
        ) {

            salary.status = "PAID";

        } else {

            salary.status = "PARTIAL";

        }


        await salary.save();


        res.json({

            success: true,

            message:
                "Salary payment recorded",

            salary

        });

    } catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};