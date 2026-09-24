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


// =====================================================
// IST DATE HELPERS
// =====================================================

function getISTDateKey(dateValue) {
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date(dateValue));

  const values = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  }

  return `${values.year}-${values.month}-${values.day}`;
}


function addDaysToDateKey(dateKey, days) {
  const [year, month, day] =
    dateKey.split("-").map(Number);

  const date = new Date(
    Date.UTC(year, month - 1, day)
  );

  date.setUTCDate(
    date.getUTCDate() + days
  );

  return date.toISOString().slice(0, 10);
}

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
    // 1. GET ALL AGENTS
    // =====================================================

    const agents = await Agent.find({})
      .sort({ createdAt: -1 })
      .lean();

    if (!agents.length) {
      return res.status(200).json({
        success: true,
        agents: [],
      });
    }

    const agentIds = agents.map((agent) => agent._id);

    // =====================================================
    // 2. IST TODAY
    // =====================================================

    const todayKey = getISTDateKey(new Date());

    const today = new Date(
      `${todayKey}T00:00:00+05:30`
    );

    // =====================================================
    // 3. FETCH ALL SAVINGS ONCE
    // =====================================================

    const savings = await DailySaving.find({
      assignedAgent: {
        $in: agentIds,
      },
    }).lean();

    // =====================================================
    // 4. FETCH ALL DAILY TRANSACTIONS ONCE
    // =====================================================

    const savingTransactions =
      await DailyTransaction.find({
        collectorId: {
          $in: agentIds,
        },
        collectorType: "AGENT",
      })
        .select(
          "_id collectorId savingAccount collectionDate paymentForDate totalAmount dailyAmount"
        )
        .lean();

    // =====================================================
    // 5. FETCH ALL LOAN COLLECTIONS ONCE
    // =====================================================

    const loanTransactions =
      await LoanCollection.find({
        collectorId: {
          $in: agentIds,
        },
        collectorType: "AGENT",
      })
        .select(
          "_id collectorId loan paymentDate dueDate totalAmount installmentNo"
        )
        .lean();

    // =====================================================
    // 6. FETCH ALL ACTIVE LOANS ONCE
    // =====================================================

    const loans = await DailyLoan.find({
      assignedAgent: {
        $in: agentIds,
      },
      status: {
        $in: [
          "ACTIVE",
          "DUE",
          "OVERDUE",
        ],
      },
    })
      .select(
        "_id assignedAgent loanType loanDate durationDays durationWeeks durationMonths loanTenureMonths emiAmount totalInterest"
      )
      .lean();

    // =====================================================
    // 7. CREATE FAST LOOKUP MAPS
    // =====================================================

    const savingsByAgent = new Map();

    for (const saving of savings) {
      const key = String(
        saving.assignedAgent
      );

      if (!savingsByAgent.has(key)) {
        savingsByAgent.set(key, []);
      }

      savingsByAgent.get(key).push(saving);
    }

    // -----------------------------------------------------

    const savingTransactionsByAgent = new Map();

    for (const tx of savingTransactions) {
      const key = String(tx.collectorId);

      if (!savingTransactionsByAgent.has(key)) {
        savingTransactionsByAgent.set(key, []);
      }

      savingTransactionsByAgent.get(key).push(tx);
    }

    // -----------------------------------------------------

    const loanTransactionsByAgent = new Map();

    for (const tx of loanTransactions) {
      const key = String(tx.collectorId);

      if (!loanTransactionsByAgent.has(key)) {
        loanTransactionsByAgent.set(key, []);
      }

      loanTransactionsByAgent.get(key).push(tx);
    }

    // -----------------------------------------------------

    const loansByAgent = new Map();

    for (const loan of loans) {
      const key = String(
        loan.assignedAgent
      );

      if (!loansByAgent.has(key)) {
        loansByAgent.set(key, []);
      }

      loansByAgent.get(key).push(loan);
    }

    // =====================================================
    // 8. PROCESS AGENTS
    // =====================================================

    const result = agents.map((agent) => {

      const agentId = String(agent._id);

      const members =
        savingsByAgent.get(agentId) || [];

      const savingTx =
        savingTransactionsByAgent.get(agentId) || [];

      const loanTx =
        loanTransactionsByAgent.get(agentId) || [];

      const agentLoans =
        loansByAgent.get(agentId) || [];

      // ===================================================
      // TODAY COLLECTION
      // ===================================================

      let todayActualCollection = 0;
      let todayDueCollection = 0;

      for (const item of savingTx) {

        if (!item.collectionDate) {
          continue;
        }

        const collectionDateKey =
          getISTDateKey(
            item.collectionDate
          );

        if (
          collectionDateKey !==
          todayKey
        ) {
          continue;
        }

        const amount =
          Number(
            item.totalAmount || 0
          );

        todayActualCollection += amount;

        if (
          item.paymentForDate &&
          getISTDateKey(
            item.paymentForDate
          ) === todayKey
        ) {
          todayDueCollection += amount;
        }
      }

      // ===================================================
      // LOAN TODAY COLLECTION
      // ===================================================

      for (const item of loanTx) {

        if (!item.paymentDate) {
          continue;
        }

        const paymentDateKey =
          getISTDateKey(
            item.paymentDate
          );

        if (
          paymentDateKey !==
          todayKey
        ) {
          continue;
        }

        const amount =
          Number(
            item.totalAmount || 0
          );

        todayActualCollection += amount;

        if (
          item.dueDate &&
          getISTDateKey(
            item.dueDate
          ) === todayKey
        ) {
          todayDueCollection += amount;
        }
      }

      // ===================================================
      // TOTAL COLLECTION
      // ===================================================

      let totalCollection = 0;

      for (const tx of savingTx) {
        totalCollection +=
          Number(tx.totalAmount || 0);
      }

      for (const tx of loanTx) {
        totalCollection +=
          Number(tx.totalAmount || 0);
      }

      // ===================================================
      // TODAY SAVING TARGET
      // ===================================================

      let savingTarget = 0;

      for (const saving of members) {

        if (
          saving.status === "ACTIVE" &&
          saving.collectionType === "FIXED"
        ) {
          savingTarget +=
            Number(
              saving.fixedAmount || 0
            );
        }
      }

      // ===================================================
      // TODAY LOAN TARGET
      // ===================================================

      let loanTarget = 0;

      for (const loan of agentLoans) {

        if (
          loan.loanType === "DAILY"
        ) {
          loanTarget +=
            Number(
              loan.emiAmount || 0
            );
        }
      }

      // ===================================================
      // TODAY TARGET
      // ===================================================

      const todayTarget =
        savingTarget +
        loanTarget;

      // ===================================================
      // TODAY PENDING
      // ===================================================

      const todayPending =
        Math.max(
          0,
          todayTarget -
          todayDueCollection
        );

      // ===================================================
      // SAVING PENDING
      // ===================================================

      let savingPendingTillToday = 0;

      for (const saving of members) {

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

        if (startDate > today) {
          continue;
        }

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

          if (endDate < lastDueDate) {
            lastDueDate = endDate;
          }
        }

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

        dueDays =
          Math.max(
            dueDays,
            0
          );

        if (saving.durationDays) {

          dueDays =
            Math.min(
              dueDays,
              Number(
                saving.durationDays
              )
            );
        }

        // -----------------------------------------------
        // FIXED SAVING
        // -----------------------------------------------

        if (
          saving.collectionType ===
          "FIXED"
        ) {

          const expectedAmount =
            dueDays *
            Number(
              saving.fixedAmount || 0
            );

          let paidAmount = 0;

          for (const tx of savingTx) {

            if (
              String(
                tx.savingAccount
              ) ===
              String(
                saving._id
              )
            ) {
              paidAmount +=
                Number(
                  tx.dailyAmount || 0
                );
            }
          }

          savingPendingTillToday +=
            Math.max(
              0,
              expectedAmount -
              paidAmount
            );
        }

        // -----------------------------------------------
        // FLEXIBLE SAVING
        // -----------------------------------------------

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

      // ===================================================
      // LOAN PENDING
      // ===================================================

      let loanPendingTillToday = 0;

      for (const loan of agentLoans) {

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

        if (loanDate > today) {
          continue;
        }

        // -----------------------------------------------
        // TOTAL INSTALLMENTS
        // -----------------------------------------------

        let totalInstallments = 0;

        if (
          loan.loanType ===
          "DAILY"
        ) {

          totalInstallments =
            Number(
              loan.durationDays || 0
            );

        } else if (
          loan.loanType ===
          "WEEKLY"
        ) {

          totalInstallments =
            Number(
              loan.durationWeeks || 0
            );

        } else if (
          loan.loanType ===
          "MONTHLY"
        ) {

          totalInstallments =
            Number(
              loan.durationMonths || 0
            );

        } else if (
          loan.loanType ===
          "FIXED"
        ) {

          totalInstallments =
            Number(
              loan.loanTenureMonths || 0
            );
        }

        // -----------------------------------------------
        // DUE INSTALLMENTS
        // -----------------------------------------------

        let dueInstallments = 0;

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

        } else if (
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

        } else if (
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
              ) * 12
            ) +
            (
              today.getMonth() -
              loanDate.getMonth()
            );

          if (monthDiff < 0) {

            dueInstallments = 0;

          } else if (
            today.getDate() >=
            loanDate.getDate()
          ) {

            dueInstallments =
              monthDiff + 1;

          } else {

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

        // -----------------------------------------------
        // GET PAID INSTALLMENTS
        // -----------------------------------------------

        const paidInstallments =
          new Set();

        for (const tx of loanTx) {

          if (
            String(tx.loan) ===
            String(loan._id)
          ) {

            const no =
              Number(
                tx.installmentNo
              );

            if (
              Number.isFinite(no) &&
              no > 0
            ) {
              paidInstallments.add(no);
            }
          }
        }

        // -----------------------------------------------
        // CALCULATE PENDING
        // -----------------------------------------------

        let pendingLoan = 0;

        for (
          let installmentNo = 1;
          installmentNo <=
          dueInstallments;
          installmentNo++
        ) {

          if (
            paidInstallments.has(
              installmentNo
            )
          ) {
            continue;
          }

          let emiAmount =
            Number(
              loan.emiAmount || 0
            );

          if (
            loan.loanType ===
            "FIXED" &&
            emiAmount <= 0
          ) {

            emiAmount =
              Number(
                loan.totalInterest || 0
              ) /
              Math.max(
                Number(
                  loan.loanTenureMonths ||
                  1
                ),
                1
              );
          }

          pendingLoan +=
            emiAmount;
        }

        loanPendingTillToday +=
          pendingLoan;
      }

      // ===================================================
      // FINAL PENDING
      // ===================================================

      const pendingTillToday =
        savingPendingTillToday +
        loanPendingTillToday;

      // ===================================================
      // EFFICIENCY
      // ===================================================

      const efficiency =
        todayTarget > 0
          ? Math.round(
              (
                todayDueCollection /
                todayTarget
              ) * 100
            )
          : 0;

      // ===================================================
      // RETURN AGENT
      // ===================================================

      return {
        ...agent,

        totalMembers:
          members.length,

        todayCollection:
          todayDueCollection,

        todayActualCollection,

        todayTarget,

        todayPending,

        efficiency,

        totalCollection,

        pendingTillToday,

        savingPendingTillToday,

        loanPendingTillToday,
      };
    });

    // =====================================================
    // RESPONSE
    // =====================================================

    return res.status(200).json({
      success: true,
      agents: result,
    });

  } catch (error) {

    console.error(
      "GET AGENTS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch agents",
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

    // Actual date agent received money
    collectionDate: item.collectionDate,

    // Date for which money was paid
    paymentForDate: item.paymentForDate,

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
const todayKey = getISTDateKey(new Date());

const today = new Date(
  `${todayKey}T00:00:00+05:30`
);



// ======================================
// TODAY COLLECTIONS
// ======================================

let todayCollection = 0;
let todayActualCollection = 0;

collections.forEach(item => {

    if (!item.collectionDate) {
        return;
    }

    // ======================================
    // ACTUAL DATE MONEY WAS RECEIVED
    // ======================================

    const collectionDateKey =
        getISTDateKey(item.collectionDate);

    // Only transactions physically collected today
    if (collectionDateKey !== todayKey) {
        return;
    }

    // ======================================
    // TODAY'S ACTUAL COLLECTION
    // ======================================
    // Everything physically collected today
    // including old pending payments.
    // ======================================

    todayActualCollection +=
        Number(item.totalAmount || 0);


    // ======================================
    // TODAY'S COLLECTION
    // ======================================
    // Only money belonging to TODAY.
    // ======================================

    if (item.paymentForDate) {

        const paymentForDateKey =
            getISTDateKey(item.paymentForDate);

        if (paymentForDateKey === todayKey) {

            todayCollection +=
                Number(item.totalAmount || 0);

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



// =====================================================
// GET ALL AGENTS FOR TASK MANAGEMENT
// =====================================================

exports.getTaskAgents = async (req, res) => {
  try {
    const agents = await Agent.find({})
      .select("_id name email mobile status")
      .sort({ name: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      agents
    });

  } catch (error) {
    console.error("GET TASK AGENTS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


exports.getMembersByAgent = async (req, res) => {
  try {
    const agentId =
      req.user?._id ||
      req.user?.id ||
      req.params.agentId;

    if (!agentId) {
      return res.status(400).json({
        success: false,
        message: "Agent ID is required"
      });
    }

    const members = await DailyMember.find({
      assignedAgent: agentId
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: members.length,
      members
    });

  } catch (error) {
    console.error("GET MEMBERS BY AGENT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
