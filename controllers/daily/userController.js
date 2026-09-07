const mongoose = require("mongoose");
const DailyMember = require("../../models/daily/DailyMember");
const DailySaving = require("../../models/daily/DailySaving");
const DailyTransaction = require("../../models/daily/DailyTransaction");
const DailyLoan = require("../../models/daily/DailyLoan");
const LoanCollection = require("../../models/daily/LoanCollection");

/*
====================================================
HELPER
====================================================
*/

const SAVING_STATUSES = [
  "ACTIVE",
  "COMPLETED",
  "CLOSED",
  "TERMINATED"
];

const LOAN_STATUSES = [
  "ACTIVE",
  "DUE",
  "OVERDUE",
  "CLOSED"
];


/*
====================================================
MEMBER LOGIN
====================================================
*/

exports.memberLogin = async (req, res) => {
  try {
    const { mobile, password } = req.body;

    if (!mobile || !password) {
      return res.status(400).json({
        success: false,
        message: "Mobile and Password are required"
      });
    }

    const member = await DailyMember.findOne({
      mobile,
      status: "ACTIVE"
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found"
      });
    }

    if (member.password !== password) {
      return res.status(401).json({
        success: false,
        message: "Invalid Password"
      });
    }

    /*
    ================================================
    GET ALL SAVING ACCOUNTS
    ================================================
    */

    const savings = await DailySaving.find({
      member: member._id,
      status: {
        $in: SAVING_STATUSES
      }
    })
      .populate("assignedAgent", "name mobile")
      .populate("areaGroup", "areaName duration")
      .sort({ startDate: -1, createdAt: -1 });


    /*
    ================================================
    GET ALL LOANS
    ================================================
    */

    const loans = await DailyLoan.find({
      member: member._id,
      status: {
        $in: LOAN_STATUSES
      }
    })
      .sort({
        loanDate: -1,
        createdAt: -1
      });


    const responseMember = member.toObject();

    delete responseMember.password;


    return res.status(200).json({
      success: true,
      message: "Login Successful",

      member: responseMember,

      // ALL ACCOUNTS
      savings,

      loans,

      // Number of accounts
      savingCount: savings.length,
      loanCount: loans.length,

      hasLoan: loans.length > 0,

      // Backward compatibility
      saving: savings.length > 0 ? savings[0] : null,
      loan: loans.length > 0 ? loans[0] : null,

      loanId: loans.length > 0
        ? loans[0]._id
        : null
    });

  } catch (error) {
    console.log("MEMBER LOGIN ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


/*
====================================================
USER DASHBOARD
====================================================
*/

exports.dashboard = async (req, res) => {
  try {
    const { memberId } = req.params;

    /*
    ================================================
    MEMBER
    ================================================
    */

    const member = await DailyMember.findById(memberId);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member Not Found"
      });
    }


    /*
    ================================================
    ALL SAVING ACCOUNTS
    ================================================
    */

    const savings = await DailySaving.find({
      member: member._id,
      status: {
        $in: SAVING_STATUSES
      }
    })
      .populate("assignedAgent", "name mobile")
      .populate("areaGroup", "areaName duration")
      .sort({
        startDate: -1,
        createdAt: -1
      });


    /*
    ================================================
    ALL LOANS
    ================================================
    */

    const loans = await DailyLoan.find({
      member: member._id,
      status: {
        $in: LOAN_STATUSES
      }
    })
      .sort({
        loanDate: -1,
        createdAt: -1
      });


    /*
    ================================================
    TODAY COLLECTION
    ================================================
    */

    const today = new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );

    const tomorrow = new Date(today);

    tomorrow.setDate(
      tomorrow.getDate() + 1
    );


    const todayCollection =
      await DailyTransaction.aggregate([
        {
          $match: {
            member: member._id,

            collectionDate: {
              $gte: today,
              $lt: tomorrow
            }
          }
        },

        {
          $group: {
            _id: null,

            amount: {
              $sum: "$totalAmount"
            }
          }
        }
      ]);


    const todayAmount =
      todayCollection.length
        ? todayCollection[0].amount
        : 0;


    /*
    ================================================
    ALL RECENT TRANSACTIONS
    ================================================
    */

    const recentTransactions =
      await DailyTransaction.find({
        member: member._id
      })
        .populate(
          "savingAccount",
          "fixedAmount collectionType durationDays startDate endDate"
        )
        .sort({
          collectionDate: -1
        })
        .limit(10)
        .lean();


    /*
    ================================================
    TOTAL SAVING COLLECTION
    ================================================
    */

    const totalCollection =
      await DailyTransaction.aggregate([
        {
          $match: {
            member: member._id
          }
        },

        {
          $group: {
            _id: null,

            totalDailyAmount: {
              $sum: "$dailyAmount"
            },

            totalPenalty: {
              $sum: "$penalty"
            },

            totalAmount: {
              $sum: "$totalAmount"
            }
          }
        }
      ]);


    const collection =
      totalCollection.length
        ? totalCollection[0]
        : {
            totalDailyAmount: 0,
            totalPenalty: 0,
            totalAmount: 0
          };


    /*
    ================================================
    SAVING ACCOUNT SUMMARIES
    ================================================
    */

    const savingSummaries =
      await Promise.all(
        savings.map(async (saving) => {

          const transactions =
            await DailyTransaction.find({
              member: member._id,
              savingAccount: saving._id
            }).lean();


          const totalSaved =
            transactions.reduce(
              (sum, item) =>
                sum +
                Number(item.dailyAmount || 0),
              0
            );


          const totalPenalty =
            transactions.reduce(
              (sum, item) =>
                sum +
                Number(item.penalty || 0),
              0
            );


          const totalAmount =
            transactions.reduce(
              (sum, item) =>
                sum +
                Number(item.totalAmount || 0),
              0
            );


          const durationDays =
            Number(
              saving.durationDays || 0
            );


          const completedDays =
            Number(
              saving.completedDays || 0
            );


          const progress =
            durationDays > 0
              ? Math.min(
                  100,
                  Math.round(
                    (
                      completedDays /
                      durationDays
                    ) * 100
                  )
                )
              : 0;


          return {
            _id: saving._id,

            collectionType:
              saving.collectionType,

            fixedAmount:
              saving.fixedAmount,

            durationDays:
              saving.durationDays,

            completedDays:
              saving.completedDays,

            pendingDays:
              saving.pendingDays,

            totalSaved:
              saving.totalSaved ||
              totalSaved,

            totalPenalty:
              saving.totalPenalty ||
              totalPenalty,

            pendingAmount:
              saving.pendingAmount,

            nextCollectionDate:
              saving.nextCollectionDate,

            startDate:
              saving.startDate,

            endDate:
              saving.endDate,

            status:
              saving.status,

            assignedAgent:
              saving.assignedAgent,

            areaGroup:
              saving.areaGroup,

            progress,

            transactionCount:
              transactions.length,

            totalCollection:
              totalAmount
          };
        })
      );


    /*
    ================================================
    LOAN SUMMARIES
    ================================================
    */

    const loanSummaries =
      await Promise.all(
        loans.map(async (loan) => {

          const collections =
            await LoanCollection.find({
              loan: loan._id
            }).lean();


          const totalPaid =
            collections.reduce(
              (sum, item) =>
                sum +
                Number(item.totalAmount || 0),
              0
            );


          const totalPenalty =
            collections.reduce(
              (sum, item) =>
                sum +
                Number(item.penalty || 0),
              0
            );


          return {
            _id: loan._id,

            loanNumber:
              loan.loanNumber,

            loanType:
              loan.loanType,

            loanAmount:
              loan.loanAmount,

            interestRate:
              loan.interestRate,

            totalInterest:
              loan.totalInterest,

            totalPayable:
              loan.totalPayable,

            emiAmount:
              loan.emiAmount,

            outstandingAmount:
              loan.outstandingAmount,

            totalPaid:
              loan.totalPaid ??
              totalPaid,

            calculatedTotalPaid:
              totalPaid,

            totalPenalty,

            completedInstallments:
              loan.completedInstallments ??
              collections.length,

            pendingInstallments:
              loan.pendingInstallments,

            status:
              loan.status,

            loanDate:
              loan.loanDate,

            endDate:
              loan.endDate
          };
        })
      );


    /*
    ================================================
    TOTAL LOAN OUTSTANDING
    ================================================
    */

    const totalLoanOutstanding =
      loans.reduce(
        (sum, loan) =>
          sum +
          Number(
            loan.outstandingAmount || 0
          ),
        0
      );


    /*
    ================================================
    TOTAL LOAN AMOUNT
    ================================================
    */

    const totalLoanAmount =
      loans.reduce(
        (sum, loan) =>
          sum +
          Number(
            loan.loanAmount || 0
          ),
        0
      );


    /*
    ================================================
    RESPONSE
    ================================================
    */

    return res.status(200).json({

      success: true,

      member: {
        _id: member._id,

        memberId:
          member.memberId,

        memberName:
          member.memberName,

        mobile:
          member.mobile,

        email:
          member.email,

        city:
          member.city,

        status:
          member.status
      },


      /*
      ============================================
      ALL SAVINGS
      ============================================
      */

      savings: savingSummaries,

      savingCount:
        savingSummaries.length,


      /*
      ============================================
      ALL LOANS
      ============================================
      */

      loans: loanSummaries,

      loanCount:
        loanSummaries.length,


      /*
      ============================================
      BACKWARD COMPATIBILITY
      ============================================
      */

      saving:
        savingSummaries.length
          ? savingSummaries[0]
          : null,

      loan:
        loanSummaries.length
          ? loanSummaries[0]
          : null,


      /*
      ============================================
      DASHBOARD
      ============================================
      */

      dashboard: {

        todayCollection:
          todayAmount,

        totalSaved:
          collection.totalDailyAmount,

        totalPenalty:
          collection.totalPenalty,

        totalCollection:
          collection.totalAmount,

        totalSavingAccounts:
          savings.length,

        totalLoanAccounts:
          loans.length,

        totalLoanAmount,

        totalLoanOutstanding,

        recentTransactions:
          recentTransactions.length
      },


      recentTransactions

    });

  } catch (error) {

    console.log(
      "USER DASHBOARD ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


/*
====================================================
USER PROFILE
====================================================
*/

exports.profile = async (req, res) => {
  try {

    const { memberId } =
      req.params;


    const member =
      await DailyMember.findById(
        memberId
      );


    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member Not Found"
      });
    }


    const savings =
      await DailySaving.find({
        member: member._id,
        status: {
          $in: SAVING_STATUSES
        }
      })
        .populate(
          "assignedAgent",
          "name mobile"
        )
        .populate(
          "areaGroup",
          "areaName duration"
        )
        .sort({
          startDate: -1,
          createdAt: -1
        });


    const loans =
      await DailyLoan.find({
        member: member._id,
        status: {
          $in: LOAN_STATUSES
        }
      })
        .sort({
          loanDate: -1,
          createdAt: -1
        });


    return res.status(200).json({

      success: true,

      member,

      savings,

      loans,

      savingCount:
        savings.length,

      loanCount:
        loans.length

    });

  } catch (error) {

    console.log(
      "USER PROFILE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


/*
====================================================
SAVING DETAILS
====================================================
*/

exports.savingDetails = async (req, res) => {

  try {

    const { memberId } =
      req.params;


    /*
    ================================================
    GET ALL SAVINGS
    ================================================
    */

    const savings =
      await DailySaving.find({
        member: memberId,
        status: {
          $in: SAVING_STATUSES
        }
      })
        .populate(
          "assignedAgent",
          "name mobile"
        )
        .populate(
          "areaGroup",
          "areaName duration"
        )
        .sort({
          startDate: -1,
          createdAt: -1
        });


    if (!savings.length) {

      return res.status(404).json({
        success: false,
        message: "Saving Account Not Found"
      });

    }


    /*
    ================================================
    BUILD EACH SAVING ACCOUNT
    ================================================
    */

    const accounts =
      await Promise.all(

        savings.map(
          async (saving) => {

            const transactions =
              await DailyTransaction.find({
                member: memberId,
                savingAccount:
                  saving._id
              })
                .sort({
                  collectionDate: -1
                })
                .lean();


            const totalSaved =
              transactions.reduce(
                (sum, item) =>
                  sum +
                  Number(
                    item.dailyAmount || 0
                  ),
                0
              );


            const totalPenalty =
              transactions.reduce(
                (sum, item) =>
                  sum +
                  Number(
                    item.penalty || 0
                  ),
                0
              );


            const totalCollection =
              transactions.reduce(
                (sum, item) =>
                  sum +
                  Number(
                    item.totalAmount || 0
                  ),
                0
              );


            const durationDays =
              Number(
                saving.durationDays || 0
              );


            const completedDays =
              Number(
                saving.completedDays || 0
              );


            const progress =
              durationDays > 0
                ? Math.min(
                    100,
                    Math.round(
                      (
                        completedDays /
                        durationDays
                      ) * 100
                    )
                  )
                : 0;


            return {

              saving,

              summary: {

                totalSaved:
                  saving.totalSaved ??
                  totalSaved,

                totalPenalty:
                  saving.totalPenalty ??
                  totalPenalty,

                totalCollection,

                completedDays,

                pendingDays:
                  saving.pendingDays,

                pendingAmount:
                  saving.pendingAmount,

                progress,

                transactionCount:
                  transactions.length
              },

              transactions

            };

          }
        )

      );


    /*
    ================================================
    RESPONSE
    ================================================
    */

    return res.status(200).json({

      success: true,

      /*
      New multi-account response
      */

      accounts,

      savings:
        accounts.map(
          item => item.saving
        ),


      /*
      First account for old frontend
      */

      saving:
        accounts[0].saving,

      summary:
        accounts[0].summary,

      transactions:
        accounts[0].transactions

    });

  } catch (error) {

    console.log(
      "SAVING DETAILS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message
    });

  }

};


/*
====================================================
USER PASSBOOK
====================================================
*/
exports.passbook = async (req, res) => {
  try {
    const { memberId } = req.params;

    // Validate member ID
    if (!mongoose.Types.ObjectId.isValid(memberId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Member ID"
      });
    }

    const memberObjectId = new mongoose.Types.ObjectId(memberId);

    // ================================================
    // ALL TRANSACTIONS
    // ================================================

    const transactions = await DailyTransaction.find({
      member: memberObjectId
    })
      .populate(
        "savingAccount",
        "fixedAmount collectionType durationDays startDate endDate"
      )
      .sort({
        collectionDate: -1
      })
      .lean();


    // ================================================
    // TOTALS
    // Calculate directly from transactions
    // ================================================

    const totalSaved = transactions.reduce(
      (sum, item) =>
        sum + Number(item.dailyAmount || 0),
      0
    );

    const totalPenalty = transactions.reduce(
      (sum, item) =>
        sum + Number(item.penalty || 0),
      0
    );

    const totalCollection = transactions.reduce(
      (sum, item) =>
        sum + Number(item.totalAmount || 0),
      0
    );


    // ================================================
    // ALL SAVING ACCOUNTS
    // ================================================

    const savingAccounts = await DailySaving.find({
      member: memberObjectId,
      status: {
        $in: SAVING_STATUSES
      }
    })
      .populate("assignedAgent", "name mobile")
      .populate("areaGroup", "areaName duration")
      .sort({
        startDate: -1,
        createdAt: -1
      });


    // ================================================
    // ACCOUNT-WISE SUMMARY
    // ================================================

    const accountSummaries = await Promise.all(
      savingAccounts.map(async (saving) => {

        const accountTransactions =
          await DailyTransaction.find({
            member: memberObjectId,
            savingAccount: saving._id
          })
            .sort({
              collectionDate: -1
            })
            .lean();


        const accountTotalSaved =
          accountTransactions.reduce(
            (sum, item) =>
              sum + Number(item.dailyAmount || 0),
            0
          );


        const accountTotalPenalty =
          accountTransactions.reduce(
            (sum, item) =>
              sum + Number(item.penalty || 0),
            0
          );


        const accountTotalCollection =
          accountTransactions.reduce(
            (sum, item) =>
              sum + Number(item.totalAmount || 0),
            0
          );


        return {
          saving,

          summary: {
            totalSaved: accountTotalSaved,

            totalPenalty: accountTotalPenalty,

            totalCollection: accountTotalCollection,

            transactionCount:
              accountTransactions.length
          },

          transactions: accountTransactions
        };
      })
    );


    // ================================================
    // RESPONSE
    // ================================================

    return res.status(200).json({

      success: true,

      summary: {
        totalSaved,
        totalPenalty,
        totalCollection
      },

      transactions,

      accounts: accountSummaries

    });

  } catch (error) {

    console.log(
      "PASSBOOK ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


/*
====================================================
USER LOAN DETAILS
====================================================
*/

exports.loanDetails = async (req, res) => {

  try {

    const { memberId } =
      req.params;


    /*
    ================================================
    GET ALL LOANS
    ================================================
    */

    const loans =
      await DailyLoan.find({
        member: memberId,
        status: {
          $in: LOAN_STATUSES
        }
      })
        .sort({
          loanDate: -1,
          createdAt: -1
        });


    if (!loans.length) {

      return res.status(404).json({

        success: false,

        message: "No Loan Found"

      });

    }


    /*
    ================================================
    BUILD EACH LOAN
    ================================================
    */

    const accounts =
      await Promise.all(

        loans.map(
          async (loan) => {

            const collections =
              await LoanCollection.find({
                loan: loan._id
              })
                .sort({
                  paymentDate: -1
                })
                .lean();


            const totalPaid =
              collections.reduce(
                (sum, item) =>
                  sum +
                  Number(
                    item.totalAmount || 0
                  ),
                0
              );


            const totalPenalty =
              collections.reduce(
                (sum, item) =>
                  sum +
                  Number(
                    item.penalty || 0
                  ),
                0
              );


            return {

              loan,

              summary: {

                totalPaid:
                  loan.totalPaid ??
                  totalPaid,

                calculatedTotalPaid:
                  totalPaid,

                totalPenalty,

                totalInstallments:
                  collections.length,

                outstandingAmount:
                  loan.outstandingAmount,

                loanAmount:
                  loan.loanAmount,

                status:
                  loan.status

              },

              collections

            };

          }
        )

      );


    return res.status(200).json({

      success: true,

      /*
      New multi-loan response
      */

      accounts,

      loans:
        accounts.map(
          item => item.loan
        ),


      /*
      First loan for old frontend
      */

      loan:
        accounts[0].loan,

      summary:
        accounts[0].summary,

      collections:
        accounts[0].collections

    });

  } catch (error) {

    console.log(
      "LOAN DETAILS ERROR:",
      error
    );

    return res.status(500).json({

      success: false,

      message: error.message

    });

  }

};


/*
====================================================
LOAN HISTORY
====================================================
*/

exports.loanHistory = async (req, res) => {

  try {

    const { memberId } =
      req.params;


    const loans =
      await DailyLoan.find({
        member: memberId
      })
        .sort({
          loanDate: -1,
          createdAt: -1
        });


    if (!loans.length) {

      return res.status(404).json({

        success: false,

        message: "Loan Not Found"

      });

    }


    const histories =
      await Promise.all(

        loans.map(
          async (loan) => {

            const history =
              await LoanCollection.find({
                loan: loan._id
              })
                .sort({
                  paymentDate: -1
                })
                .lean();


            return {

              loan,

              history

            };

          }
        )

      );


    return res.status(200).json({

      success: true,

      accounts:
        histories,

      loans:
        histories.map(
          item => item.loan
        ),

      /*
      Backward compatibility
      */

      loan:
        histories[0].loan,

      history:
        histories[0].history

    });

  } catch (error) {

    console.log(
      "LOAN HISTORY ERROR:",
      error
    );

    return res.status(500).json({

      success: false,

      message: error.message

    });

  }

};


/*
====================================================
CHANGE PASSWORD
====================================================
*/

exports.changePassword = async (req, res) => {

  try {

    const {
      memberId,
      oldPassword,
      newPassword,
      confirmPassword
    } = req.body;


    const member =
      await DailyMember.findById(
        memberId
      );


    if (!member) {

      return res.status(404).json({

        success: false,

        message: "Member Not Found"

      });

    }


    if (
      member.password !==
      oldPassword
    ) {

      return res.status(400).json({

        success: false,

        message: "Old Password Incorrect"

      });

    }


    if (
      newPassword !==
      confirmPassword
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Password does not match"

      });

    }


    member.password =
      newPassword;


    await member.save();


    return res.status(200).json({

      success: true,

      message:
        "Password Changed Successfully"

    });

  } catch (error) {

    console.log(
      "CHANGE PASSWORD ERROR:",
      error
    );

    return res.status(500).json({

      success: false,

      message: error.message

    });

  }

};


/*
====================================================
LOGOUT
====================================================
*/

exports.logout = async (req, res) => {

  try {

    return res.status(200).json({

      success: true,

      message:
        "Logout Successful"

    });

  } catch (error) {

    return res.status(500).json({

      success: false,

      message:
        error.message

    });

  }

};