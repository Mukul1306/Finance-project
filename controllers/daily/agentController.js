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

    const agents = await Agent.find().sort({ createdAt: -1 });

    const today = new Date();
    today.setHours(0,0,0,0);

    for (let agent of agents) {

      // ===========================
      // ACTIVE SAVING MEMBERS
      // ===========================

      const members = await DailySaving.find({

        assignedAgent: agent._id,
        status: "ACTIVE"

      });

      // ===========================
      // DAILY SAVING COLLECTION
      // ===========================

      const savingTransactions =
      await DailyTransaction.find({

        collectorId: agent._id,
        collectorType: "AGENT"

      });

      // ===========================
      // LOAN EMI COLLECTION
      // ===========================

      const loanTransactions =
      await LoanCollection.find({

        collectorId: agent._id,
        collectorType: "AGENT"

      });

      // ===========================
      // TODAY COLLECTION
      // ===========================

      let todayCollection = 0;

      savingTransactions.forEach(item => {

        const d = new Date(item.collectionDate);
        d.setHours(0,0,0,0);

        if(d.getTime() === today.getTime()){

          todayCollection += item.totalAmount || 0;

        }

      });

      loanTransactions.forEach(item => {

        const d = new Date(item.paymentDate);
        d.setHours(0,0,0,0);

        if(d.getTime() === today.getTime()){

          todayCollection += item.totalAmount || 0;

        }

      });

      // ===========================
      // TOTAL COLLECTION
      // ===========================

      const totalCollection =

        savingTransactions.reduce(
          (sum,item)=>sum+(item.totalAmount||0),
          0
        )

        +

        loanTransactions.reduce(
          (sum,item)=>sum+(item.totalAmount||0),
          0
        );

      // ===========================
      // DAILY SAVING TARGET
      // ===========================

      let savingTarget = 0;

      members.forEach(item=>{

        savingTarget += Number(
          item.fixedAmount || 0
        );

      });

      // ===========================
      // DAILY LOAN EMI TARGET
      // ===========================
let loanTarget = 0;

const loans = await DailyLoan.find({

    assignedAgent: agent._id,

    loanType: "DAILY",

    status: {
        $in: ["ACTIVE", "DUE", "OVERDUE"]
    }

});

loanTarget = loans.reduce(

    (sum, loan) => sum + Number(loan.emiAmount || 0),

    0

);


console.log("================================");
console.log("Agent:", agent.name);
console.log("Saving Target:", savingTarget);
console.log("Loans Found:", loans.length);

loans.forEach((loan) => {
  console.log({
    loanNumber: loan.loanNumber,
    emiAmount: loan.emiAmount,
    loanType: loan.loanType,
    assignedAgent: loan.assignedAgent,
    status: loan.status,
    completedInstallments: loan.completedInstallments,
    loanDate: loan.loanDate
  });
});

      // ===========================
      // FINAL TARGET
      // ===========================

 console.log("Loan Target:", loanTarget);

const todayTarget = savingTarget + loanTarget;

console.log("Today Target:", todayTarget);

      const todayPending =
      Math.max(0, todayTarget - todayCollection);

      // ===========================
      // ASSIGN VALUES
      // ===========================

      agent.totalMembers = members.length;

      agent.todayCollection = todayCollection;

      agent.totalCollection = totalCollection;

      agent.todayTarget = todayTarget;

      agent.todayPending = todayPending;

      agent.efficiency =
      todayTarget > 0
      ? Math.round((todayCollection / todayTarget) * 100)
      : 0;

    }

    res.status(200).json({

      success:true,
      agents

    });

  }

  catch(error){

    res.status(500).json({

      success:false,
      message:error.message

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


/*
=========================================
GET COMPLETE AGENT PROFILE
=========================================
*/

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

      assignedAgent: agentId,
      status: "ACTIVE"

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