const Agent =
require("../../models/daily/Agent");
const LoanCollection = require("../../models/daily/LoanCollection");
// Add Agent
const DailyMember =
require("../../models/daily/DailyMember");
const DailySaving =
require("../../models/daily/DailySaving");
const DailyTransaction =
require("../../models/daily/DailyTransaction");
const DailyLoan = require("../../models/daily/DailyLoan");

exports.addAgent = async (req, res) => {

  try {

    const {

      name,
      fatherName,
      gender,
      dob,
      email,
      mobile,
      alternateMobile,

      aadhaarNumber,
      aadhaarReceived,

      panNumber,
      panReceived,

      stampPaperReceived,

      address,
      operationalArea,

      joiningDate,

      password

    } = req.body;

    // ===========================
    // MOBILE CHECK
    // ===========================

    const agentExists = await Agent.findOne({
      mobile
    });

    if (agentExists) {

      return res.status(400).json({

        success: false,

        message: "Agent already exists"

      });

    }

    // ===========================
    // EMAIL CHECK
    // ===========================

    const emailExists = await Agent.findOne({
      email
    });

    if (emailExists) {

      return res.status(400).json({

        success: false,

        message: "Email already exists"

      });

    }

    // ===========================
    // CREATE AGENT
    // ===========================

    const agent = await Agent.create({

      name,

      fatherName,

      gender,

      dob,

      email,

      mobile,

      alternateMobile,

      aadhaarNumber,

      aadhaarReceived,

      panNumber,

      panReceived,

      stampPaperReceived,

      address,

      operationalArea,

      joiningDate,

      password

    });

    res.status(201).json({

      success: true,

      message: "Agent Created Successfully",

      agent

    });

  }

  catch (error) {

    res.status(500).json({

      success: false,

      message: error.message

    });

  }

};

exports.updateAgent = async (req, res) => {

  try {

    const agentId = req.params.id;

    const {
      name,
      fatherName,
      gender,
      dob,
      email,
      mobile,
      alternateMobile,
      aadhaarNumber,
      aadhaarReceived,
      panNumber,
      panReceived,
      stampPaperReceived,
      address,
      operationalArea,
      joiningDate,
      password,
      status
    } = req.body;

    const agent = await Agent.findById(agentId);

    if (!agent) {

      return res.status(404).json({
        success: false,
        message: "Agent Not Found"
      });

    }

    // Mobile duplicate check
    const mobileExists = await Agent.findOne({
      mobile,
      _id: { $ne: agentId }
    });

    if (mobileExists) {

      return res.status(400).json({
        success: false,
        message: "Mobile already exists"
      });

    }

    // Email duplicate check
    const emailExists = await Agent.findOne({
      email,
      _id: { $ne: agentId }
    });

    if (emailExists) {

      return res.status(400).json({
        success: false,
        message: "Email already exists"
      });

    }

    agent.name = name;
    agent.fatherName = fatherName;
    agent.gender = gender;
    agent.dob = dob;
    agent.email = email;
    agent.mobile = mobile;
    agent.alternateMobile = alternateMobile;
    agent.aadhaarNumber = aadhaarNumber;
    agent.aadhaarReceived = aadhaarReceived;
    agent.panNumber = panNumber;
    agent.panReceived = panReceived;
    agent.stampPaperReceived = stampPaperReceived;
    agent.address = address;
    agent.operationalArea = operationalArea;
    agent.joiningDate = joiningDate;
    agent.status = status;

    if (password && password.trim() !== "") {
      agent.password = password;
    }

    await agent.save();

    res.json({
      success: true,
      message: "Agent Updated Successfully",
      agent
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }

};
// Get All Agents

exports.getAgents = async (req, res) => {

  try {

    const agents =
      await Agent.find()
        .sort({ createdAt: -1 });


    const today = new Date();

    today.setHours(0, 0, 0, 0);


    for (let agent of agents) {

      // =====================================================
      // ALL SAVING ACCOUNTS OF THIS AGENT
      // =====================================================

      const members =
        await DailySaving.find({

          assignedAgent: agent._id

        });


      // =====================================================
      // ALL DAILY SAVING COLLECTIONS OF AGENT
      // =====================================================

      const savingTransactions =
        await DailyTransaction.find({

          collectorId: agent._id,

          collectorType: "AGENT"

        });


      // =====================================================
      // ALL LOAN EMI COLLECTIONS OF AGENT
      // =====================================================

      const loanTransactions =
        await LoanCollection.find({

          collectorId: agent._id,

          collectorType: "AGENT"

        });


      // =====================================================
      // TODAY COLLECTION
      // DAILY SAVING + LOAN EMI
      // =====================================================

      let todayCollection = 0;


      // Daily Saving collected today
      savingTransactions.forEach(item => {

        const d =
          new Date(item.collectionDate);

        d.setHours(0, 0, 0, 0);


        if (
          d.getTime() ===
          today.getTime()
        ) {

          todayCollection +=
            Number(item.totalAmount || 0);

        }

      });


      // Loan EMI collected today
      loanTransactions.forEach(item => {

        const d =
          new Date(item.paymentDate);

        d.setHours(0, 0, 0, 0);


        if (
          d.getTime() ===
          today.getTime()
        ) {

          todayCollection +=
            Number(item.totalAmount || 0);

        }

      });


      // =====================================================
      // TOTAL COLLECTION - ALL TIME
      // DAILY SAVING + ALL LOAN EMI
      // =====================================================

      const totalCollection =

        savingTransactions.reduce(
          (sum, item) =>
            sum +
            Number(item.totalAmount || 0),
          0
        )

        +

        loanTransactions.reduce(
          (sum, item) =>
            sum +
            Number(item.totalAmount || 0),
          0
        );


      // =====================================================
      // TODAY'S DAILY SAVING TARGET
      // =====================================================

      let savingTarget = 0;


      const activeSavings =
        members.filter(
          saving =>
            saving.status === "ACTIVE"
        );


      activeSavings.forEach(item => {

        if (
          item.collectionType ===
          "FIXED"
        ) {

          savingTarget +=
            Number(
              item.fixedAmount || 0
            );

        }

      });


      // =====================================================
      // TODAY'S LOAN TARGET
      // =====================================================

      let loanTarget = 0;


      // Get active/due/overdue loans
      // of this agent
      const loans =
        await DailyLoan.find({

          assignedAgent: agent._id,

          loanType: "DAILY",

          status: {
            $in: [
              "ACTIVE",
              "DUE",
              "OVERDUE"
            ]
          }

        });


      loanTarget =
        loans.reduce(

          (sum, loan) =>
            sum +
            Number(
              loan.emiAmount || 0
            ),

          0

        );


      // =====================================================
      // TODAY TARGET
      // =====================================================

      const todayTarget =
        savingTarget +
        loanTarget;


      // =====================================================
      // TODAY PENDING
      // =====================================================

      const todayPending =
        Math.max(
          0,
          todayTarget -
          todayCollection
        );


      // =====================================================
      // PENDING TILL TODAY
      // =====================================================

      let savingPendingTillToday = 0;

      let loanPendingTillToday = 0;


      // =====================================================
      // DAILY SAVING PENDING TILL TODAY
      // =====================================================

      for (
        const saving of members
      ) {

        const startDate =
          new Date(
            saving.startDate
          );

        startDate.setHours(
          0,
          0,
          0,
          0
        );


        // Saving has not started
        if (
          startDate >
          today
        ) {
          continue;
        }


        // ---------------------------------------------
        // END DATE
        // ---------------------------------------------

        let lastDueDate =
          new Date(today);


        if (saving.endDate) {

          const endDate =
            new Date(
              saving.endDate
            );

          endDate.setHours(
            0,
            0,
            0,
            0
          );


          if (
            endDate <
            lastDueDate
          ) {

            lastDueDate =
              endDate;

          }

        }


        // ---------------------------------------------
        // NUMBER OF DAYS DUE
        // ---------------------------------------------

        let dueDays =
          Math.floor(

            (
              lastDueDate -
              startDate
            ) /
            (1000 * 60 * 60 * 24)

          ) + 1;


        if (
          dueDays < 0
        ) {

          dueDays = 0;

        }


        // Never exceed saving duration
        if (
          saving.durationDays
        ) {

          dueDays =
            Math.min(

              dueDays,

              Number(
                saving.durationDays
              )

            );

        }


        // ---------------------------------------------
        // EXPECTED SAVING
        // ---------------------------------------------

        let expectedSaving = 0;


        if (
          saving.collectionType ===
          "FIXED"
        ) {

          expectedSaving =
            dueDays *
            Number(
              saving.fixedAmount || 0
            );

        }


        // ---------------------------------------------
        // SAVING ACTUALLY PAID
        // ---------------------------------------------
        //
        // IMPORTANT:
        // We use dailyAmount only.
        // Penalty is NOT considered as saving paid.
        //

        const paidSaving =
          savingTransactions
            .filter(tx => {

              return (
                String(
                  tx.savingAccount
                ) ===
                String(
                  saving._id
                )
              );

            })
            .filter(tx => {

              const collectionDate =
                new Date(
                  tx.collectionDate
                );

              collectionDate.setHours(
                0,
                0,
                0,
                0
              );


              return (
                collectionDate <=
                today
              );

            })
            .reduce(

              (sum, tx) =>
                sum +
                Number(
                  tx.dailyAmount || 0
                ),

              0

            );


        // ---------------------------------------------
        // SAVING PENDING
        // ---------------------------------------------

        const pendingSaving =
          Math.max(

            0,

            expectedSaving -
            paidSaving

          );


        savingPendingTillToday +=
          pendingSaving;

      }


      // =====================================================
      // DAILY LOAN EMI PENDING TILL TODAY
      // =====================================================

      const dailyLoans =
        await DailyLoan.find({

          assignedAgent:
            agent._id,

          loanType:
            "DAILY",

          status: {
            $in: [
              "ACTIVE",
              "DUE",
              "OVERDUE"
            ]
          }

        });


      // =====================================================
      // CALCULATE EACH DAILY LOAN
      // =====================================================

      for (
        const loan of dailyLoans
      ) {

        const loanDate =
          new Date(
            loan.loanDate
          );

        loanDate.setHours(
          0,
          0,
          0,
          0
        );


        if (
          loanDate >
          today
        ) {
          continue;
        }


        // ---------------------------------------------
        // HOW MANY DAILY EMI SHOULD BE DUE
        // ---------------------------------------------

        let dueInstallments =
          Math.floor(

            (
              today -
              loanDate
            ) /
            (1000 * 60 * 60 * 24)

          ) + 1;


        dueInstallments =
          Math.min(

            dueInstallments,

            Number(
              loan.durationDays || 0
            )

          );


        if (
          dueInstallments < 0
        ) {

          dueInstallments = 0;

        }


        // ---------------------------------------------
        // EXPECTED EMI TILL TODAY
        // ---------------------------------------------

        const expectedLoanEMI =
          dueInstallments *
          Number(
            loan.emiAmount || 0
          );


        // ---------------------------------------------
        // ACTUAL EMI PAID
        // ---------------------------------------------
        //
        // IMPORTANT:
        // penalty is NOT included.
        //
        // principal + interest = actual EMI
        //

        const paidLoanEMI =
          loanTransactions
            .filter(tx => {

              return (
                String(tx.loan) ===
                String(loan._id)
              );

            })
            .filter(tx => {

              const paymentDate =
                new Date(
                  tx.paymentDate
                );

              paymentDate.setHours(
                0,
                0,
                0,
                0
              );


              return (
                paymentDate <=
                today
              );

            })
            .reduce(

              (sum, tx) =>

                sum +

                Number(
                  tx.principalAmount || 0
                ) +

                Number(
                  tx.interestAmount || 0
                ),

              0

            );


        // ---------------------------------------------
        // LOAN EMI PENDING
        // ---------------------------------------------

        const pendingLoan =
          Math.max(

            0,

            expectedLoanEMI -
            paidLoanEMI

          );


        loanPendingTillToday +=
          pendingLoan;

      }


      // =====================================================
      // TOTAL PENDING TILL TODAY
      // =====================================================

      const pendingTillToday =
        savingPendingTillToday +
        loanPendingTillToday;


      // =====================================================
      // EFFICIENCY
      // =====================================================

      const efficiency =
        todayTarget > 0

          ? Math.round(

              (
                todayCollection /
                todayTarget
              ) * 100

            )

          : 0;


      // =====================================================
      // ASSIGN VALUES TO AGENT
      // =====================================================

      agent.totalMembers =
        members.length;


      // TODAY
      agent.todayCollection =
        todayCollection;


      agent.todayTarget =
        todayTarget;


      agent.todayPending =
        todayPending;


      agent.efficiency =
        efficiency;


      // ALL TIME
      agent.totalCollection =
        totalCollection;


      // TILL TODAY
      agent.pendingTillToday =
        pendingTillToday;


      agent.savingPendingTillToday =
        savingPendingTillToday;


      agent.loanPendingTillToday =
        loanPendingTillToday;

    }


    // =====================================================
    // RESPONSE
    // =====================================================

    res.status(200).json({

      success: true,

      agents

    });

  }


  catch(error) {

    console.error(
      "GET AGENTS ERROR:",
      error
    );


    res.status(500).json({

      success: false,

      message:
        error.message

    });

  }

};


exports.getAgent = async (req, res) => {

  try {

    const agent =
      await Agent.findById(
        req.params.id
      );

    if (!agent) {

      return res.status(404).json({
        success: false,
        message: "Agent Not Found"
      });

    }

    res.status(200).json({
      success: true,
      agent
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }

};


exports.getAgentProfile = async (req, res) => {

  try {

    const agentId = req.params.id;

    // =========================
    // AGENT
    // =========================

    const agent = await Agent.findById(agentId);

    if (!agent) {

      return res.status(404).json({
        success: false,
        message: "Agent not found"
      });

    }

    // =========================
    // MEMBERS
    // =========================

  const members = await DailySaving.find({
    assignedAgent: agent._id
})

    .populate("member")
    .populate("areaGroup", "areaName");

    

    // =========================
    // DAILY COLLECTIONS
    // =========================

    const dailyCollections = await DailyTransaction.find({

      collectorId: agentId,
      collectorType: "AGENT"

    })

    .populate("member", "memberName memberId mobile");

    // =========================
    // LOAN EMI COLLECTIONS
    // =========================

    const loanCollections = await LoanCollection.find({

      collectorId: agentId,
      collectorType: "AGENT"

    })

    .populate("member", "memberName memberId mobile");

    // =========================
    // MERGE BOTH
    // =========================

    const collections = [

      ...dailyCollections.map(item => ({

        _id: item._id,

        type: "DAILY",

        collectionDate: item.collectionDate,

        member: item.member,

        dailyAmount: item.dailyAmount,

        penalty: item.penalty,

        totalAmount: item.totalAmount,

        paymentMethod: item.paymentMethod

      })),

  ...loanCollections.map(item => ({

  _id: item._id,

  type: "LOAN EMI",

  collectionDate: item.paymentDate,

  paymentForDate: item.dueDate,   // <-- ADD THIS

  installmentNo: item.installmentNo,

  member: item.member,

  dailyAmount: item.principalAmount,

  penalty: item.penalty,

  totalAmount: item.totalAmount,

  paymentMethod: item.paymentMethod

}))

    ];

    collections.sort(

      (a, b) =>

      new Date(b.collectionDate) -

      new Date(a.collectionDate)

    );


    // ======================================
// MONTHLY COLLECTION HISTORY
// ======================================

const monthlyHistory = {};

collections.forEach(item => {

    const date = new Date(item.collectionDate);

    const key = `${date.getFullYear()}-${String(
        date.getMonth() + 1
    ).padStart(2, "0")}`;

    if (!monthlyHistory[key]) {

        monthlyHistory[key] = {

            month: key,

            savingCollection: 0,

            loanCollection: 0,

            totalCollection: 0

        };

    }

    if (item.type === "DAILY") {

        monthlyHistory[key].savingCollection +=
            item.totalAmount || 0;

    } else {

        monthlyHistory[key].loanCollection +=
            item.totalAmount || 0;

    }

    monthlyHistory[key].totalCollection +=
        item.totalAmount || 0;

});

const monthlyCollectionHistory =
Object.values(monthlyHistory).sort(
    (a, b) => b.month.localeCompare(a.month)
);

    // =========================
    // TODAY
    // =========================

    const today = new Date();

    today.setHours(0,0,0,0);

    let todayCollection = 0;

    collections.forEach(item => {

      const d = new Date(item.collectionDate);

      d.setHours(0,0,0,0);

      if(d.getTime() === today.getTime()){

        todayCollection += item.totalAmount;

      }

    });

    // =========================
    // TOTAL
    // =========================

    const totalCollection = collections.reduce(

      (sum,item)=>

      sum + (item.totalAmount || 0),

      0

    );

    // =========================
    // MONTHLY
    // =========================

    const firstDay = new Date(

      today.getFullYear(),

      today.getMonth(),

      1

    );

    let monthlyCollection = 0;

    collections.forEach(item=>{

      const d = new Date(item.collectionDate);

      if(d >= firstDay){

        monthlyCollection += item.totalAmount;

      }

    });

    // =========================
    // TARGET
    // =========================

    // ======================================
// DAILY SAVING TARGET
// ======================================

let savingTarget = 0;

members.forEach(item => {

  console.log(members);


    savingTarget += Number(
        item.fixedAmount ||
        item.dailyAmount ||
        0
    );

});

// ======================================
// DAILY LOAN EMI TARGET (ONLY DAILY LOANS)
// ======================================
// ======================================
// DAILY LOAN TARGET
// ======================================

let loanTarget = 0;

const dailyLoans = await DailyLoan.find({

    assignedAgent: agentId,

    loanType: "DAILY",

    status: {
        $in: ["ACTIVE", "DUE", "OVERDUE"]
    }

});

console.log("Daily Loans Found:", dailyLoans.length);

dailyLoans.forEach((loan) => {

    loanTarget += Number(loan.emiAmount || 0);

});

console.log("Loan Target:", loanTarget);
// =========================
// FINAL DAILY TARGET
// =========================

const dailyTarget =
    savingTarget +
    loanTarget;

    // =========================
    // PENDING
    // =========================

const pendingTillToday = Math.max(

    0,

    dailyTarget - todayCollection

);

    // =========================
    // RESPONSE
    // =========================

    res.json({

      success:true,

      agent,

      summary:{

        totalMembers:members.length,

        todayCollection,

        monthlyCollection,

        totalCollection,

           savingTarget,

    loanTarget,

    dailyTarget,

        pendingTillToday

      },

    monthlyCollectionHistory,


      members,

      collections

    });

  }

  catch(error){

    res.status(500).json({

      success:false,

      message:error.message

    });

  }

};

// Delete Agent

exports.deleteAgent =
async (req, res) => {

  try {

    const agent =
      await Agent.findById(
        req.params.id
      );

    if (!agent) {

      return res.status(404).json({
        success: false,
        message: "Agent Not Found"
      });

    }

    await agent.deleteOne();

    res.status(200).json({
      success: true,
      message: "Agent Deleted"
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }

};