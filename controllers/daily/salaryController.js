const AgentSalary = require("../../models/daily/AgentSalary");
const MonthlySalary = require("../../models/daily/MonthlySalary");

const DailyAgent = require("../../models/daily/Agent");
const DailyTransaction = require("../../models/daily/DailyTransaction");
const LoanCollection = require("../../models/daily/LoanCollection");
const DailyLoan = require("../../models/daily/DailyLoan");


//=====================================================
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
// UPDATE AGENT SALARY PROFILE
// =====================================================

exports.updateAgentSalary = async (req, res) => {
    try {

        const salaryId = req.params.id;

        const {
            salaryType,
            commissionRate,
            fixedSalary
        } = req.body;


        // FIND SALARY PROFILE
        const salary =
            await AgentSalary.findById(
                salaryId
            );


        if (!salary) {

            return res.status(404).json({
                success: false,
                message: "Salary record not found"
            });

        }


        // VALIDATE SALARY TYPE
        if (
            !["COMMISSION", "FIXED"]
                .includes(salaryType)
        ) {

            return res.status(400).json({
                success: false,
                message: "Invalid salary type"
            });

        }


        // VALIDATE COMMISSION
        if (
            salaryType === "COMMISSION" &&
            Number(commissionRate || 0) < 0
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Commission rate cannot be negative"
            });

        }


        // VALIDATE FIXED SALARY
        if (
            salaryType === "FIXED" &&
            Number(fixedSalary || 0) < 0
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Fixed salary cannot be negative"
            });

        }


        // UPDATE
        salary.salaryType =
            salaryType;


        salary.commissionRate =
            salaryType === "COMMISSION"
                ? Number(commissionRate || 0)
                : 0;


        salary.fixedSalary =
            salaryType === "FIXED"
                ? Number(fixedSalary || 0)
                : 0;


        await salary.save();


        res.json({

            success: true,

            message:
                "Agent salary profile updated successfully",

            salary

        });


    } catch (error) {

        console.error(
            "UPDATE AGENT SALARY ERROR:",
            error
        );


        res.status(500).json({

            success: false,

            message:
                error.message

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
// ULTRA FAST: GET MONTHLY SALARY TABLE
// =====================================================

exports.getMonthlySalary = async (req, res) => {
  try {
    const month = Number(req.query.month);
    const year = Number(req.query.year);

    if (
      !month ||
      !year ||
      month < 1 ||
      month > 12
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid month and year are required"
      });
    }

    // =================================================
    // DATE RANGE
    // =================================================

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    // =================================================
    // 1. GET ALL ACTIVE SALARY PROFILES
    // =================================================

    const salaryProfiles = await AgentSalary.find({
      status: "ACTIVE"
    })
      .populate(
        "agent",
        "name mobile operationalArea status"
      )
      .sort({
        createdAt: -1
      })
      .lean();

    if (!salaryProfiles.length) {
      return res.json({
        success: true,
        month,
        year,
        summary: {
          totalStaff: 0,
          totalSalary: 0,
          totalPaid: 0,
          totalPending: 0
        },
        salaries: []
      });
    }

    // =================================================
    // AGENT IDS
    // =================================================

    const agentIds = salaryProfiles
      .map((profile) => profile.agent?._id)
      .filter(Boolean);

    // =================================================
    // 2 + 3. FETCH COLLECTION DATA IN PARALLEL
    // =================================================

    const [
      dailyCollectionData,
      loanCollectionData,
      existingMonthlySalaries
    ] = await Promise.all([

      // ===============================================
      // DAILY SAVING COLLECTION
      // ===============================================

      DailyTransaction.aggregate([
        {
          $match: {
            collectorId: {
              $in: agentIds
            },

            collectorType: "AGENT",

            collectionDate: {
              $gte: startDate,
              $lt: endDate
            }
          }
        },

        {
          $group: {
            _id: "$collectorId",

            dailySavingCollection: {
              $sum: {
                $convert: {
                  input: "$dailyAmount",
                  to: "double",
                  onError: 0,
                  onNull: 0
                }
              }
            },

            penaltyCollection: {
              $sum: {
                $convert: {
                  input: "$penalty",
                  to: "double",
                  onError: 0,
                  onNull: 0
                }
              }
            }
          }
        }
      ]),

      // ===============================================
      // LOAN COLLECTION
      // ===============================================

      LoanCollection.aggregate([
        {
          $match: {
            collectorId: {
              $in: agentIds
            },

            collectorType: "AGENT",

            status: "PAID",

            paymentDate: {
              $gte: startDate,
              $lt: endDate
            }
          }
        },

        // Get loan type
        {
          $lookup: {
            from: "dailyloans",
            localField: "loan",
            foreignField: "_id",
            as: "loanData"
          }
        },

        {
          $unwind: {
            path: "$loanData",
            preserveNullAndEmptyArrays: true
          }
        },

        {
          $group: {
            _id: {
              agent: "$collectorId",
              loanType: "$loanData.loanType"
            },

            collection: {
              $sum: {
                $add: [
                  {
                    $convert: {
                      input: "$principalAmount",
                      to: "double",
                      onError: 0,
                      onNull: 0
                    }
                  },
                  {
                    $convert: {
                      input: "$interestAmount",
                      to: "double",
                      onError: 0,
                      onNull: 0
                    }
                  }
                ]
              }
            },

            penalty: {
              $sum: {
                $convert: {
                  input: "$penalty",
                  to: "double",
                  onError: 0,
                  onNull: 0
                }
              }
            }
          }
        }
      ]),

      // ===============================================
      // EXISTING MONTHLY SALARIES
      // ===============================================

      MonthlySalary.find({
        agent: {
          $in: agentIds
        },

        month,

        year
      }).lean()
    ]);

    // =================================================
    // 4. CREATE FAST LOOKUP MAPS
    // =================================================

    const dailyMap = new Map();

    for (const item of dailyCollectionData) {
      dailyMap.set(
        String(item._id),
        {
          dailySavingCollection:
            Number(item.dailySavingCollection || 0),

          penaltyCollection:
            Number(item.penaltyCollection || 0)
        }
      );
    }

    // =================================================

    const loanMap = new Map();

    for (const item of loanCollectionData) {
      const agentId = String(item._id.agent);

      if (!loanMap.has(agentId)) {
        loanMap.set(agentId, {
          dailyLoanCollection: 0,
          weeklyLoanCollection: 0,
          monthlyLoanCollection: 0,
          fixedLoanCollection: 0,
          penaltyCollection: 0
        });
      }

      const data = loanMap.get(agentId);

      const type = item._id.loanType;

      if (type === "DAILY") {
        data.dailyLoanCollection +=
          Number(item.collection || 0);
      }

      else if (type === "WEEKLY") {
        data.weeklyLoanCollection +=
          Number(item.collection || 0);
      }

      else if (type === "MONTHLY") {
        data.monthlyLoanCollection +=
          Number(item.collection || 0);
      }

      else if (type === "FIXED") {
        data.fixedLoanCollection +=
          Number(item.collection || 0);
      }

      data.penaltyCollection +=
        Number(item.penalty || 0);
    }

    // =================================================
    // EXISTING SALARY MAP
    // =================================================

    const salaryMap = new Map();

    for (const salary of existingMonthlySalaries) {
      salaryMap.set(
        String(salary.agent),
        salary
      );
    }

    // =================================================
    // 5. BUILD SALARIES IN MEMORY
    // =================================================

    const salaries = [];

    const bulkOperations = [];

    for (const profile of salaryProfiles) {

      if (!profile.agent?._id) {
        continue;
      }

      const agentId = String(
        profile.agent._id
      );

      const daily =
        dailyMap.get(agentId) || {
          dailySavingCollection: 0,
          penaltyCollection: 0
        };

      const loans =
        loanMap.get(agentId) || {
          dailyLoanCollection: 0,
          weeklyLoanCollection: 0,
          monthlyLoanCollection: 0,
          fixedLoanCollection: 0,
          penaltyCollection: 0
        };

      // =================================================
      // COLLECTIONS
      // =================================================

      const dailySavingCollection =
        Number(
          daily.dailySavingCollection || 0
        );

      const dailyLoanCollection =
        Number(
          loans.dailyLoanCollection || 0
        );

      const weeklyLoanCollection =
        Number(
          loans.weeklyLoanCollection || 0
        );

      const monthlyLoanCollection =
        Number(
          loans.monthlyLoanCollection || 0
        );

      const fixedLoanCollection =
        Number(
          loans.fixedLoanCollection || 0
        );

      const penaltyCollection =
        Number(
          daily.penaltyCollection || 0
        ) +
        Number(
          loans.penaltyCollection || 0
        );

      // =================================================
      // ELIGIBLE COLLECTION
      // =================================================

      let eligibleCollection = 0;

      if (profile.includeDailySaving) {
        eligibleCollection +=
          dailySavingCollection;
      }

      if (profile.includeDailyLoan) {
        eligibleCollection +=
          dailyLoanCollection;
      }

      if (profile.includeWeeklyLoan) {
        eligibleCollection +=
          weeklyLoanCollection;
      }

      if (profile.includeMonthlyLoan) {
        eligibleCollection +=
          monthlyLoanCollection;
      }

      if (profile.includeFixedLoan) {
        eligibleCollection +=
          fixedLoanCollection;
      }

      // =================================================
      // SALARY
      // =================================================

      const commissionRate =
        Number(
          profile.commissionRate || 0
        );

      const fixedSalary =
        Number(
          profile.fixedSalary || 0
        );

      let calculatedSalary = 0;

      if (
        profile.salaryType === "FIXED"
      ) {

        calculatedSalary =
          fixedSalary;

      } else {

        calculatedSalary =
          Number(
            (
              eligibleCollection *
              commissionRate /
              100
            ).toFixed(2)
          );
      }

      // =================================================
      // EXISTING PAYMENT
      // =================================================

      const existingSalary =
        salaryMap.get(agentId);

      const paidAmount =
        Number(
          existingSalary?.paidAmount || 0
        );

      const pendingAmount =
        Math.max(
          0,
          calculatedSalary -
          paidAmount
        );

      let status = "PENDING";

      if (
        paidAmount >=
        calculatedSalary
      ) {
        status = "PAID";
      }

      else if (
        paidAmount > 0
      ) {
        status = "PARTIAL";
      }

      // =================================================
      // SALARY DATA
      // =================================================

      const salaryData = {

        agent: profile.agent,

        salaryProfile: {
          salaryType:
            profile.salaryType,

          commissionRate,

          fixedSalary
        },

        salary: {
          ...(existingSalary || {}),

          agent:
            profile.agent._id,

          month,

          year,

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

          monthlyLoanCollection:
            Number(
              monthlyLoanCollection.toFixed(2)
            ),

          fixedLoanCollection:
            Number(
              fixedLoanCollection.toFixed(2)
            ),

          penaltyCollection:
            Number(
              penaltyCollection.toFixed(2)
            ),

          eligibleCollection:
            Number(
              eligibleCollection.toFixed(2)
            ),

          salaryType:
            profile.salaryType,

          commissionRate,

          fixedSalary,

          calculatedSalary,

          paidAmount,

          pendingAmount,

          status
        }
      };

      salaries.push(
        salaryData
      );

      // =================================================
      // BULK DATABASE UPDATE
      // =================================================

      bulkOperations.push({
        updateOne: {

          filter: {
            agent:
              profile.agent._id,

            month,

            year
          },

          update: {
            $set: {

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

              monthlyLoanCollection:
                Number(
                  monthlyLoanCollection.toFixed(2)
                ),

              fixedLoanCollection:
                Number(
                  fixedLoanCollection.toFixed(2)
                ),

              penaltyCollection:
                Number(
                  penaltyCollection.toFixed(2)
                ),

              eligibleCollection:
                Number(
                  eligibleCollection.toFixed(2)
                ),

              salaryType:
                profile.salaryType,

              commissionRate,

              fixedSalary,

              calculatedSalary,

              pendingAmount,

              status
            },

            $setOnInsert: {

              agent:
                profile.agent._id,

              month,

              year,

              paidAmount: 0,

              paidDate: null,

              paymentMode: "BANK",

              paymentReference: "",

              remarks: ""
            }
          },

          upsert: true
        }
      });
    }

    // =================================================
    // 6. ONE BULK WRITE
    // =================================================

    if (bulkOperations.length) {

      await MonthlySalary.bulkWrite(
        bulkOperations,
        {
          ordered: false
        }
      );
    }

    // =================================================
    // 7. SUMMARY
    // =================================================

    let totalSalary = 0;
    let totalPaid = 0;
    let totalPending = 0;

    for (const item of salaries) {

      totalSalary +=
        Number(
          item.salary.calculatedSalary || 0
        );

      totalPaid +=
        Number(
          item.salary.paidAmount || 0
        );

      totalPending +=
        Number(
          item.salary.pendingAmount || 0
        );
    }

    // =================================================
    // RESPONSE
    // =================================================

    return res.json({

      success: true,

      month,

      year,

      summary: {

        totalStaff:
          salaries.length,

        totalSalary:
          Number(
            totalSalary.toFixed(2)
          ),

        totalPaid:
          Number(
            totalPaid.toFixed(2)
          ),

        totalPending:
          Number(
            totalPending.toFixed(2)
          )
      },

      salaries
    });

  } catch (error) {

    console.error(
      "ULTRA FAST GET MONTHLY SALARY ERROR:",
      error
    );

    return res.status(500).json({

      success: false,

      message:
        error.message
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