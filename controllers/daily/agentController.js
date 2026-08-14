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

    // =====================================================
    // GET ALL AGENTS
    // =====================================================

    const agents = await Agent.find()
      .sort({ createdAt: -1 });


    // =====================================================
    // TODAY
    // =====================================================

    const today = new Date();

    today.setHours(0, 0, 0, 0);


    // =====================================================
    // PROCESS EACH AGENT
    // =====================================================

    for (let agent of agents) {

      // =====================================================
      // ALL SAVING ACCOUNTS OF THIS AGENT
      // =====================================================

      const members = await DailySaving.find({
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
// TODAY COLLECTIONS
// =====================================================

// Actual money physically collected today
let todayActualCollection = 0;

// Amount collected today that belongs to TODAY'S dues
let todayDueCollection = 0;


savingTransactions.forEach(item => {

    if (!item.collectionDate) {
        return;
    }

    // ======================================
    // ACTUAL COLLECTION DATE
    // ======================================

    const collectionDate = new Date(item.collectionDate);
    collectionDate.setHours(0, 0, 0, 0);

    // ======================================
    // MONEY ACTUALLY COLLECTED TODAY
    // ======================================

    if (collectionDate.getTime() === today.getTime()) {

        todayActualCollection +=
            Number(item.totalAmount || 0);

        // ======================================
        // TODAY'S DUE DATE
        // ======================================

        if (item.paymentForDate) {

            const paymentForDate =
                new Date(item.paymentForDate);

            paymentForDate.setHours(0, 0, 0, 0);

            // Only count if payment belongs to today
            if (
                paymentForDate.getTime() ===
                today.getTime()
            ) {

                todayDueCollection +=
                    Number(item.totalAmount || 0);

            }

        }

    }

});


// =====================================================
// LOAN EMI
// =====================================================

loanTransactions.forEach(item => {

  if (!item.paymentDate) {
    return;
  }


  const paymentDate =
    new Date(item.paymentDate);

  paymentDate.setHours(0, 0, 0, 0);


  // -----------------------------------------------
  // ACTUAL COLLECTION
  // -----------------------------------------------
  // Anything physically collected today
  // is included here.
  //
  // Example:
  // EMI due 11 Aug
  // paid 13 Aug
  // => included in actual collection
  // -----------------------------------------------

  if (
    paymentDate.getTime() ===
    today.getTime()
  ) {

    todayActualCollection +=
      Number(item.totalAmount || 0);


    // ---------------------------------------------
    // ONLY TODAY'S DUE
    // ---------------------------------------------
    //
    // Check the EMI due date.
    //
    // Old EMI:
    // dueDate = 11 Aug
    // paymentDate = 13 Aug
    //
    // => Actual Collection YES
    // => Today's Due Collection NO
    //
    // Today's EMI:
    // dueDate = 13 Aug
    // paymentDate = 13 Aug
    //
    // => Actual Collection YES
    // => Today's Due Collection YES
    // ---------------------------------------------

    if (item.dueDate) {

      const dueDate =
        new Date(item.dueDate);

      dueDate.setHours(0, 0, 0, 0);


      if (
        dueDate.getTime() ===
        today.getTime()
      ) {

        todayDueCollection +=
          Number(item.totalAmount || 0);

      }

    }

  }

});

      // =====================================================
      // TOTAL COLLECTION - ALL TIME
      // DAILY SAVING + ALL LOAN EMI
      // =====================================================

      const totalSavingCollection =
        savingTransactions.reduce(

          (sum, item) =>

            sum +
            Number(item.totalAmount || 0),

          0

        );


      const totalLoanCollection =
        loanTransactions.reduce(

          (sum, item) =>

            sum +
            Number(item.totalAmount || 0),

          0

        );


      const totalCollection =
        totalSavingCollection +
        totalLoanCollection;


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
          item.collectionType === "FIXED"
        ) {

          savingTarget +=
            Number(
              item.fixedAmount || 0
            );

        }

      });


      // =====================================================
      // TODAY'S LOAN TARGET
      // DAILY LOANS
      // =====================================================

      let loanTarget = 0;


      const dailyLoansForTarget =
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
        dailyLoansForTarget.reduce(

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
    todayDueCollection
  );


      // =====================================================
      // PENDING TILL TODAY
      //
      // IMPORTANT:
      // ONLY ONE DECLARATION
      // =====================================================

      let savingPendingTillToday = 0;

      let loanPendingTillToday = 0;


      // =====================================================
      // DAILY SAVING PENDING TILL TODAY
      // =====================================================

      for (
        const saving of members
      ) {

        // ---------------------------------------------------
        // START DATE
        // ---------------------------------------------------

        if (!saving.startDate) {
          continue;
        }


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


        // ---------------------------------------------------
        // LAST DUE DATE
        // ---------------------------------------------------

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


        // ---------------------------------------------------
        // NUMBER OF DAYS DUE
        // ---------------------------------------------------

        let dueDays =
          Math.floor(

            (
              lastDueDate -
              startDate
            ) /
            (
              1000 *
              60 *
              60 *
              24
            )

          ) + 1;


        if (
          dueDays < 0
        ) {

          dueDays = 0;

        }


        // ---------------------------------------------------
        // DON'T EXCEED SAVING DURATION
        // ---------------------------------------------------

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


        // ---------------------------------------------------
        // PAYMENTS FOR THIS SAVING
        // ---------------------------------------------------

        const savingPayments =
          savingTransactions.filter(
            tx =>

              String(
                tx.savingAccount
              ) ===
              String(
                saving._id
              )
          );


        // ===================================================
        // FIXED DAILY SAVING
        // ===================================================

        if (
          saving.collectionType ===
          "FIXED"
        ) {

          const expectedAmount =
            dueDays *
            Number(
              saving.fixedAmount || 0
            );


          // -------------------------------------------------
          // ACTUAL SAVING AMOUNT PAID
          //
          // Penalty is NOT included.
          // -------------------------------------------------

          const paidAmount =
            savingPayments.reduce(

              (sum, tx) =>

                sum +
                Number(
                  tx.dailyAmount || 0
                ),

              0

            );


          const pendingAmount =
            Math.max(

              0,

              expectedAmount -
              paidAmount

            );


          savingPendingTillToday +=
            pendingAmount;

        }


        // ===================================================
        // FLEXIBLE DAILY SAVING
        // ===================================================

        else if (
          saving.collectionType ===
          "FLEXIBLE"
        ) {

          savingPendingTillToday +=
            Number(
              saving.pendingAmount || 0
            );

        }

      }


      // =====================================================
      // ALL LOANS OF AGENT
      //
      // DAILY
      // WEEKLY
      // MONTHLY
      // FIXED
      // =====================================================

      const agentLoans =
        await DailyLoan.find({

          assignedAgent: agent._id,

          status: {
            $in: [
              "ACTIVE",
              "DUE",
              "OVERDUE"
            ]
          }

        });


      // =====================================================
      // CALCULATE EACH LOAN
      // =====================================================

      for (
        const loan of agentLoans
      ) {

        if (!loan.loanDate) {
          continue;
        }


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


        // Loan has not started
        if (
          loanDate >
          today
        ) {

          continue;

        }


        // ===================================================
        // TOTAL INSTALLMENTS
        // ===================================================

        let totalInstallments = 0;


        if (
          loan.loanType ===
          "DAILY"
        ) {

          totalInstallments =
            Number(
              loan.durationDays || 0
            );

        }


        else if (
          loan.loanType ===
          "WEEKLY"
        ) {

          totalInstallments =
            Number(
              loan.durationWeeks || 0
            );

        }


        else if (
          loan.loanType ===
          "MONTHLY"
        ) {

          totalInstallments =
            Number(
              loan.durationMonths || 0
            );

        }


        else if (
          loan.loanType ===
          "FIXED"
        ) {

          totalInstallments =
            Number(
              loan.loanTenureMonths || 0
            );

        }


        // ===================================================
        // INSTALLMENTS DUE TILL TODAY
        // ===================================================

        let dueInstallments = 0;


        // ---------------------------------------------------
        // DAILY
        // ---------------------------------------------------

        if (
          loan.loanType ===
          "DAILY"
        ) {

          dueInstallments =
            Math.floor(

              (
                today -
                loanDate
              ) /
              (
                1000 *
                60 *
                60 *
                24
              )

            ) + 1;

        }


        // ---------------------------------------------------
        // WEEKLY
        // ---------------------------------------------------

        else if (
          loan.loanType ===
          "WEEKLY"
        ) {

          dueInstallments =
            Math.floor(

              (
                today -
                loanDate
              ) /
              (
                1000 *
                60 *
                60 *
                24 *
                7
              )

            ) + 1;

        }


        // ---------------------------------------------------
        // MONTHLY + FIXED
        // ---------------------------------------------------

        else if (

          loan.loanType ===
          "MONTHLY" ||

          loan.loanType ===
          "FIXED"

        ) {

          const monthDiff =

            (
              (
                today.getFullYear() -
                loanDate.getFullYear()
              ) *
              12
            )

            +

            (
              today.getMonth() -
              loanDate.getMonth()
            );


          if (
            monthDiff < 0
          ) {

            dueInstallments = 0;

          }


          else if (
            today.getDate() >=
            loanDate.getDate()
          ) {

            dueInstallments =
              monthDiff + 1;

          }


          else {

            dueInstallments =
              monthDiff;

          }

        }


        // ---------------------------------------------------
        // SAFETY
        // ---------------------------------------------------

        dueInstallments =
          Math.min(

            Math.max(
              dueInstallments,
              0
            ),

            totalInstallments

          );


        // ===================================================
        // GET PAYMENTS FOR THIS LOAN
        // ===================================================

        const loanPayments =
          loanTransactions.filter(
            tx =>

              String(
                tx.loan
              ) ===
              String(
                loan._id
              )
          );


        // ===================================================
        // PAID INSTALLMENT NUMBERS
        // ===================================================

        const paidInstallments =
          new Set(

            loanPayments

              .map(
                tx =>
                  Number(
                    tx.installmentNo
                  )
              )

              .filter(
                Number.isFinite
              )

              .filter(
                no => no > 0
              )

          );


        // ===================================================
        // CALCULATE PENDING INSTALLMENTS
        // ===================================================

        let pendingLoan = 0;


        for (
          let installmentNo = 1;

          installmentNo <=
          dueInstallments;

          installmentNo++
        ) {

          // -------------------------------------------------
          // ALREADY PAID
          // -------------------------------------------------

          if (
            paidInstallments.has(
              installmentNo
            )
          ) {

            continue;

          }


          // -------------------------------------------------
          // EMI AMOUNT
          // -------------------------------------------------

          let emiAmount =
            Number(
              loan.emiAmount || 0
            );


          // -------------------------------------------------
          // FIXED LOAN
          //
          // Fixed interest loan:
          // monthly interest = totalInterest / tenure
          //
          // If emiAmount already exists, use it.
          // Otherwise calculate from totalInterest.
          // -------------------------------------------------

          if (
            loan.loanType ===
            "FIXED"
          ) {

            if (
              Number(
                loan.emiAmount || 0
              ) > 0
            ) {

              emiAmount =
                Number(
                  loan.emiAmount
                );

            }

            else {

              emiAmount =
                Number(
                  loan.totalInterest || 0
                ) /
                Math.max(
                  Number(
                    loan.loanTenureMonths || 1
                  ),
                  1
                );

            }

          }


          // -------------------------------------------------
          // ADD PENDING EMI
          // -------------------------------------------------

          pendingLoan +=
            Number(
              emiAmount || 0
            );

        }


        // ===================================================
        // ADD THIS LOAN'S PENDING
        // ===================================================

        loanPendingTillToday +=
          pendingLoan;

      }


      // =====================================================
      // FINAL PENDING TILL TODAY
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
          todayDueCollection /
          todayTarget
        ) * 100
      )

    : 0;


      // =====================================================
      // ASSIGN VALUES TO AGENT
      // =====================================================

      agent.totalMembers =
        members.length;


      // -----------------------------------------------------
      // TODAY
      // -----------------------------------------------------

agent.todayCollection =
  todayDueCollection;

agent.todayActualCollection =
  todayActualCollection;


      agent.todayTarget =
        todayTarget;


      agent.todayPending =
        todayPending;


      agent.efficiency =
        efficiency;


      // -----------------------------------------------------
      // ALL TIME
      // -----------------------------------------------------

      agent.totalCollection =
        totalCollection;


      // -----------------------------------------------------
      // PENDING TILL TODAY
      // -----------------------------------------------------

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


  catch (error) {

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

// ======================================
// TODAY COLLECTIONS
// ======================================

let todayCollection = 0;

// EVERYTHING PHYSICALLY COLLECTED TODAY
let todayActualCollection = 0;


collections.forEach(item => {

    if (!item.collectionDate) {
        return;
    }

    const collectionDate =
        new Date(item.collectionDate);

    collectionDate.setHours(0, 0, 0, 0);


    // ======================================
    // ONLY MONEY COLLECTED TODAY
    // ======================================

    if (
        collectionDate.getTime() !==
        today.getTime()
    ) {
        return;
    }


    // ======================================
    // TODAY'S ACTUAL COLLECTION
    // ======================================
    // Includes:
    //
    // Daily Saving:
    // - today's saving
    // - old pending saving
    //
    // Loan:
    // - today's EMI
    // - old pending EMI
    //
    // Only condition:
    // MONEY WAS COLLECTED TODAY
    // ======================================

    todayActualCollection +=
        Number(item.totalAmount || 0);


    // ======================================
    // TODAY'S COLLECTION
    // ======================================
    // This is different.
    //
    // Daily Saving collected today
    // always counts.
    //
    // Loan EMI counts only when its
    // DUE DATE is today.
    // ======================================

    if (item.type === "DAILY") {

        todayCollection +=
            Number(item.totalAmount || 0);

    }


    else if (item.type === "LOAN EMI") {

        if (item.paymentForDate) {

            const dueDate =
                new Date(item.paymentForDate);

            dueDate.setHours(0, 0, 0, 0);


            if (
                dueDate.getTime() ===
                today.getTime()
            ) {

                todayCollection +=
                    Number(item.totalAmount || 0);

            }

        }

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


// ======================================
// TODAY PENDING TARGET
// ONLY TODAY'S TARGET - TODAY'S COLLECTION
// ======================================

const todayPending = Math.max(
  0,
  dailyTarget - todayCollection
);


    // ======================================
// PENDING TILL TODAY
// SAVING + ALL LOANS
// ======================================

let savingPendingTillToday = 0;
let loanPendingTillToday = 0;


// ======================================
// DAILY SAVING PENDING
// ======================================

for (const saving of members) {

  if (!saving.startDate) {
    continue;
  }

  const startDate = new Date(saving.startDate);

  startDate.setHours(0, 0, 0, 0);

  // Saving has not started yet
  if (startDate > today) {
    continue;
  }

  // -----------------------------
  // LAST DUE DATE
  // -----------------------------

  let lastDueDate = new Date(today);

  if (saving.endDate) {

    const endDate = new Date(saving.endDate);

    endDate.setHours(0, 0, 0, 0);

    if (endDate < lastDueDate) {
      lastDueDate = endDate;
    }
  }

  // -----------------------------
  // NUMBER OF DAYS DUE
  // -----------------------------

  let dueDays =
    Math.floor(
      (
        lastDueDate - startDate
      ) /
      (
        1000 *
        60 *
        60 *
        24
      )
    ) + 1;

  dueDays = Math.max(dueDays, 0);

  // Don't exceed saving duration
  if (saving.durationDays) {

    dueDays = Math.min(
      dueDays,
      Number(saving.durationDays)
    );

  }

  // -----------------------------
  // PAYMENTS OF THIS SAVING
  // -----------------------------

  const savingPayments =
    dailyCollections.filter(
      tx =>
        String(tx.savingAccount) ===
        String(saving._id)
    );

  // -----------------------------
  // FIXED SAVING
  // -----------------------------

  if (saving.collectionType === "FIXED") {

    const expectedAmount =
      dueDays *
      Number(saving.fixedAmount || 0);

    const paidAmount =
      savingPayments.reduce(
        (sum, tx) =>
          sum +
          Number(tx.dailyAmount || 0),
        0
      );

    const pendingAmount =
      Math.max(
        0,
        expectedAmount - paidAmount
      );

    savingPendingTillToday +=
      pendingAmount;
  }

  // -----------------------------
  // FLEXIBLE SAVING
  // -----------------------------

  else if (
    saving.collectionType === "FLEXIBLE"
  ) {

    savingPendingTillToday +=
      Number(saving.pendingAmount || 0);

  }

}
// ======================================
// LOAN PENDING TILL TODAY
// DAILY / WEEKLY / MONTHLY / FIXED
// ======================================

const agentLoans = await DailyLoan.find({
  assignedAgent: agentId,

  status: {
    $in: [
      "ACTIVE",
      "DUE",
      "OVERDUE"
    ]
  }
});


for (const loan of agentLoans) {

  if (!loan.loanDate) {
    continue;
  }

  const loanDate = new Date(loan.loanDate);

  loanDate.setHours(0, 0, 0, 0);

  // Loan has not started
  if (loanDate > today) {
    continue;
  }

  // ====================================
  // TOTAL INSTALLMENTS
  // ====================================

  let totalInstallments = 0;

  if (loan.loanType === "DAILY") {

    totalInstallments =
      Number(loan.durationDays || 0);

  }

  else if (loan.loanType === "WEEKLY") {

    totalInstallments =
      Number(loan.durationWeeks || 0);

  }

  else if (loan.loanType === "MONTHLY") {

    totalInstallments =
      Number(loan.durationMonths || 0);

  }

  else if (loan.loanType === "FIXED") {

    totalInstallments =
      Number(loan.loanTenureMonths || 0);

  }


  // ====================================
  // INSTALLMENTS DUE TILL TODAY
  // ====================================

  let dueInstallments = 0;


  // DAILY
  if (loan.loanType === "DAILY") {

    dueInstallments =
      Math.floor(
        (
          today - loanDate
        ) /
        (
          1000 *
          60 *
          60 *
          24
        )
      ) + 1;

  }


  // WEEKLY
  else if (loan.loanType === "WEEKLY") {

    dueInstallments =
      Math.floor(
        (
          today - loanDate
        ) /
        (
          1000 *
          60 *
          60 *
          24 *
          7
        )
      ) + 1;

  }


  // MONTHLY + FIXED
  else if (
    loan.loanType === "MONTHLY" ||
    loan.loanType === "FIXED"
  ) {

    const monthDiff =
      (
        (
          today.getFullYear() -
          loanDate.getFullYear()
        ) * 12
      ) +
      (
        today.getMonth() -
        loanDate.getMonth()
      );


    if (monthDiff < 0) {

      dueInstallments = 0;

    }

    else if (
      today.getDate() >=
      loanDate.getDate()
    ) {

      dueInstallments =
        monthDiff + 1;

    }

    else {

      dueInstallments =
        monthDiff;

    }

  }


  dueInstallments =
    Math.min(
      Math.max(
        dueInstallments,
        0
      ),
      totalInstallments
    );


  // ====================================
  // PAYMENTS OF THIS LOAN
  // ====================================

  const loanPayments =
    loanCollections.filter(
      tx =>
        String(tx.loan) ===
        String(loan._id)
    );


  // ====================================
  // PAID INSTALLMENT NUMBERS
  // ====================================

  const paidInstallments =
    new Set(
      loanPayments
        .map(tx =>
          Number(tx.installmentNo)
        )
        .filter(Number.isFinite)
        .filter(no => no > 0)
    );


  // ====================================
  // PENDING INSTALLMENTS
  // ====================================

  let pendingLoan = 0;


  for (
    let installmentNo = 1;

    installmentNo <= dueInstallments;

    installmentNo++
  ) {

    // Already paid
    if (
      paidInstallments.has(
        installmentNo
      )
    ) {
      continue;
    }


    // EMI
    let emiAmount =
      Number(
        loan.emiAmount || 0
      );


    // FIXED LOAN
    if (
      loan.loanType === "FIXED"
    ) {

      if (
        Number(
          loan.emiAmount || 0
        ) > 0
      ) {

        emiAmount =
          Number(
            loan.emiAmount
          );

      }

      else {

        emiAmount =
          Number(
            loan.totalInterest || 0
          ) /
          Math.max(
            Number(
              loan.loanTenureMonths || 1
            ),
            1
          );

      }

    }


    pendingLoan +=
      Number(emiAmount || 0);

  }


  loanPendingTillToday +=
    pendingLoan;

}


// ======================================
// FINAL PENDING TILL TODAY
// ======================================

const pendingTillToday =
  savingPendingTillToday +
  loanPendingTillToday;



    // =========================
    // RESPONSE
    // =========================

    res.json({

      success:true,

      agent,

   summary: {

  totalMembers: members.length,

  // COLLECTION
  todayCollection,
  todayActualCollection,
  monthlyCollection,
  totalCollection,

  // TARGET
  savingTarget,
  loanTarget,
  dailyTarget,

  // PENDING
  todayPending,
  pendingTillToday,
  savingPendingTillToday,
  loanPendingTillToday

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