const DailyMember = require("../../models/daily/DailyMember");
const DailySaving = require("../../models/daily/DailySaving");
const DailyTransaction = require("../../models/daily/DailyTransaction");
const DailyLoan = require("../../models/daily/DailyLoan");
const LoanCollection = require("../../models/daily/LoanCollection");
const AreaGroup = require("../../models/daily/AreaGroup");
const DailyAgent = require("../../models/daily/Agent");

/*
==========================================
MEMBER LOGIN
==========================================
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

    // Find Saving Account

    const saving = await DailySaving.findOne({

      member: member._id,

      status: "ACTIVE"

    })
      .populate("assignedAgent", "name mobile")
      .populate("areaGroup", "areaName");

    // Check Active Loan

    const loan = await DailyLoan.findOne({

      member: member._id,

      status: {
        $in: [
          "ACTIVE",
          "DUE",
          "OVERDUE"
        ]
      }

    });

    const responseMember = member.toObject();

    delete responseMember.password;

    res.status(200).json({

      success: true,

      message: "Login Successful",

      member: responseMember,

      saving,

      hasLoan: !!loan,

      loanId: loan ? loan._id : null

    });

  }

  catch (error) {

    console.log(error);

    res.status(500).json({

      success: false,

      message: error.message

    });

  }

};

/*
==========================================
USER DASHBOARD
==========================================
*/

exports.dashboard = async (req, res) => {

  try {

    const { memberId } = req.params;

    // ==========================
    // MEMBER
    // ==========================

    const member = await DailyMember.findById(memberId);

    if (!member) {

      return res.status(404).json({

        success: false,

        message: "Member Not Found"

      });

    }

    // ==========================
    // SAVING ACCOUNT
    // ==========================

    const saving = await DailySaving.findOne({

      member: member._id,

      status: "ACTIVE"

    })

    .populate(

      "assignedAgent",

      "name mobile"

    )

    .populate(

      "areaGroup",

      "areaName duration"

    );

    // ==========================
    // ACTIVE LOAN
    // ==========================

    const loan = await DailyLoan.findOne({

      member: member._id,

      status: {

        $in: [

          "ACTIVE",

          "DUE",

          "OVERDUE"

        ]

      }

    });

    // ==========================
    // TODAY COLLECTION
    // ==========================

    const today = new Date();

    today.setHours(0,0,0,0);

    const tomorrow = new Date(today);

    tomorrow.setDate(

      tomorrow.getDate()+1

    );

    const todayCollection =

      await DailyTransaction.aggregate([

        {

          $match:{

            member:member._id,

            collectionDate:{

              $gte:today,

              $lt:tomorrow

            }

          }

        },

        {

          $group:{

            _id:null,

            amount:{

              $sum:"$totalAmount"

            }

          }

        }

      ]);

    // ==========================
    // RECENT TRANSACTIONS
    // ==========================

    const recentTransactions =

      await DailyTransaction.find({

        member:member._id

      })

      .sort({

        collectionDate:-1

      })

      .limit(10);

        // ==========================
    // TOTAL COLLECTION
    // ==========================

    const totalCollection = await DailyTransaction.aggregate([

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

    // ==========================
    // LOAN SUMMARY
    // ==========================

    let loanSummary = null;

    if (loan) {

      const paidInstallments =
        await LoanCollection.countDocuments({

          loan: loan._id

        });

      loanSummary = {

        loanNumber:
          loan.loanNumber,

        loanAmount:
          loan.loanAmount,

        outstandingAmount:
          loan.outstandingAmount,

        totalPaid:
          loan.totalPaid,

        completedInstallments:
          paidInstallments,

        pendingInstallments:
          loan.pendingInstallments,

        status:
          loan.status

      };

    }

    // ==========================
    // SAVING SUMMARY
    // ==========================

    let savingSummary = null;

    if (saving) {

      savingSummary = {

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
          saving.totalSaved,

        totalPenalty:
          saving.totalPenalty,

        pendingAmount:
          saving.pendingAmount,

        nextCollectionDate:
          saving.nextCollectionDate,

        endDate:
          saving.endDate,

        assignedAgent:
          saving.assignedAgent,

        areaGroup:
          saving.areaGroup

      };

    }

    // ==========================
    // TODAY'S COLLECTION
    // ==========================

    const todayAmount =
      todayCollection.length
        ? todayCollection[0].amount
        : 0;

    // ==========================
    // RESPONSE
    // ==========================

    res.status(200).json({

      success: true,

      member: {

        _id: member._id,

        memberId: member.memberId,

        memberName: member.memberName,

        mobile: member.mobile,

        email: member.email,

        city: member.city,

        status: member.status

      },

      saving: savingSummary,

      loan: loanSummary,

      dashboard: {

        todayCollection: todayAmount,

        totalSaved:
          collection.totalDailyAmount,

        totalPenalty:
          collection.totalPenalty,

        totalCollection:
          collection.totalAmount,

        recentTransactions:
          recentTransactions.length

      },

      recentTransactions

    });

  }

  catch (error) {

    console.log(error);

    res.status(500).json({

      success: false,

      message: error.message

    });

  }

};  

/*
==========================================
USER PROFILE
==========================================
*/

exports.profile = async (req, res) => {

  try {

    const { memberId } = req.params;

    const member = await DailyMember.findById(memberId);

    if (!member) {

      return res.status(404).json({

        success: false,

        message: "Member Not Found"

      });

    }

    const saving = await DailySaving.findOne({

      member: member._id,

      status: "ACTIVE"

    })

    .populate(

      "assignedAgent",

      "name mobile email"

    )

    .populate(

      "areaGroup",

      "areaName duration maxMembers"

    );

    res.status(200).json({

      success: true,

      member,

      saving

    });

  }

  catch (error) {

    console.log(error);

    res.status(500).json({

      success: false,

      message: error.message

    });

  }

};



/*
==========================================
SAVING DETAILS
==========================================
*/

exports.savingDetails = async (req, res) => {

  try {

    const { memberId } = req.params;

    const saving = await DailySaving.findOne({

      member: memberId,

      status: "ACTIVE"

    })

    .populate(

      "assignedAgent",

      "name mobile"

    )

    .populate(

      "areaGroup",

      "areaName duration"

    );

    if (!saving) {

      return res.status(404).json({

        success: false,

        message: "Saving Account Not Found"

      });

    }

    // ==========================
    // ALL SAVING TRANSACTIONS
    // ==========================

    const transactions = await DailyTransaction.find({

      member: memberId

    })

    .sort({

      collectionDate: -1

    });

    // ==========================
    // TOTAL SAVED
    // ==========================

    const summary = await DailyTransaction.aggregate([

      {

        $match: {

          member: saving.member

        }

      },

      {

        $group: {

          _id: null,

          totalSaved: {

            $sum: "$dailyAmount"

          },

          totalPenalty: {

            $sum: "$penalty"

          },

          totalCollection: {

            $sum: "$totalAmount"

          }

        }

      }

    ]);

    const data =

      summary.length

      ? summary[0]

      : {

          totalSaved: 0,

          totalPenalty: 0,

          totalCollection: 0

        };

    // ==========================
    // SAVING PROGRESS
    // ==========================

    const progress = Math.round(

      (saving.completedDays /

      saving.durationDays) * 100

    );

    res.status(200).json({

      success: true,

      saving,

      summary: {

        totalSaved: data.totalSaved,

        totalPenalty: data.totalPenalty,

        totalCollection: data.totalCollection,

        completedDays: saving.completedDays,

        pendingDays: saving.pendingDays,

        pendingAmount: saving.pendingAmount,

        progress:

          progress > 100

          ? 100

          : progress

      },

      transactions

    });

  }

  catch (error) {

    console.log(error);

    res.status(500).json({

      success: false,

      message: error.message

    });

  }

};
/*
==========================================
USER PASSBOOK
==========================================
*/

exports.passbook = async (req, res) => {

  try {

    const { memberId } = req.params;

    const transactions = await DailyTransaction.find({

      member: memberId

    })

    .sort({

      collectionDate: -1

    });

    const total = await DailyTransaction.aggregate([

      {

        $match: {

          member: transactions.length
            ? transactions[0].member
            : null

        }

      },

      {

        $group: {

          _id: null,

          totalSaved: {

            $sum: "$dailyAmount"

          },

          totalPenalty: {

            $sum: "$penalty"

          },

          totalCollection: {

            $sum: "$totalAmount"

          }

        }

      }

    ]);

    res.status(200).json({

      success: true,

      summary:

        total.length > 0

        ? total[0]

        : {

            totalSaved: 0,

            totalPenalty: 0,

            totalCollection: 0

          },

      transactions

    });

  }

  catch (error) {

    console.log(error);

    res.status(500).json({

      success: false,

      message: error.message

    });

  }

};



/*
==========================================
USER LOAN DETAILS
==========================================
*/

exports.loanDetails = async (req, res) => {

  try {

    const { memberId } = req.params;

    const loan = await DailyLoan.findOne({

      member: memberId,

      status: {

        $in: [

          "ACTIVE",

          "DUE",

          "OVERDUE",

          "CLOSED"

        ]

      }

    });

    if (!loan) {

      return res.status(404).json({

        success: false,

        message: "No Loan Found"

      });

    }

    const collections = await LoanCollection.find({

      loan: loan._id

    })

    .sort({

      paymentDate: -1

    });

    const totalPaid = collections.reduce(

      (sum, item) =>

      sum + item.totalAmount,

      0

    );

    const totalPenalty = collections.reduce(

      (sum, item) =>

      sum + item.penalty,

      0

    );

    res.status(200).json({

      success: true,

      loan,

      summary: {

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

    });

  }

  catch (error) {

    console.log(error);

    res.status(500).json({

      success: false,

      message: error.message

    });

  }

};
/*
==========================================
LOAN HISTORY
==========================================
*/

exports.loanHistory = async (req, res) => {

  try {

    const { memberId } = req.params;

    const loan = await DailyLoan.findOne({

      member: memberId

    });

    if (!loan) {

      return res.status(404).json({

        success: false,

        message: "Loan Not Found"

      });

    }

    const history = await LoanCollection.find({

      loan: loan._id

    })

    .sort({

      paymentDate: -1

    });

    res.status(200).json({

      success: true,

      loan,

      history

    });

  }

  catch (error) {

    console.log(error);

    res.status(500).json({

      success: false,

      message: error.message

    });

  }

};



/*
==========================================
CHANGE PASSWORD
==========================================
*/

exports.changePassword = async (req, res) => {

  try {

    const {

      memberId,

      oldPassword,

      newPassword,

      confirmPassword

    } = req.body;

    const member = await DailyMember.findById(memberId);

    if (!member) {

      return res.status(404).json({

        success: false,

        message: "Member Not Found"

      });

    }

    if (member.password !== oldPassword) {

      return res.status(400).json({

        success: false,

        message: "Old Password Incorrect"

      });

    }

    if (newPassword !== confirmPassword) {

      return res.status(400).json({

        success: false,

        message: "Password does not match"

      });

    }

    member.password = newPassword;

    await member.save();

    res.status(200).json({

      success: true,

      message: "Password Changed Successfully"

    });

  }

  catch (error) {

    console.log(error);

    res.status(500).json({

      success: false,

      message: error.message

    });

  }

};



/*
==========================================
LOGOUT
==========================================
*/

exports.logout = async (req, res) => {

  try {

    res.status(200).json({

      success: true,

      message: "Logout Successful"

    });

  }

  catch (error) {

    res.status(500).json({

      success: false,

      message: error.message

    });

  }

};