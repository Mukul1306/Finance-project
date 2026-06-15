const Agent =
require("../../models/daily/Agent");

// Add Agent
const DailyMember =
require("../../models/daily/DailyMember");

const DailyTransaction =
require("../../models/daily/DailyTransaction");
exports.addAgent = async (req, res) => {

  try {

    const {
      name,
      mobile,
      address,
      password
    } = req.body;

    const agentExists =
      await Agent.findOne({
        mobile
      });

    if (agentExists) {

      return res.status(400).json({
        success: false,
        message: "Agent already exists"
      });

    }

    const agent =
      await Agent.create({
        name,
        mobile,
        address,
        password
      });

    res.status(201).json({
      success: true,
      message: "Agent Created Successfully",
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

const today =
new Date();

today.setHours(
0,0,0,0
);

for(let agent of agents){

const members =
await DailyMember.countDocuments({

assignedAgent:
agent._id

});

const transactions =
await DailyTransaction.find({

collectorId:
agent._id,

collectorType:
"AGENT"

});

const todayCollection =
transactions
.filter((t)=>{

const d =
new Date(
t.collectionDate
);

d.setHours(
0,0,0,0
);

return (
d.getTime() ===
today.getTime()
);

})
.reduce(

(sum,item)=>
sum +
(item.totalAmount || 0),

0

);

const totalCollection =
transactions.reduce(

(sum,item)=>
sum +
(item.totalAmount || 0),

0

);

agent.totalMembers =
members;

agent.todayCollection =
todayCollection;

agent.efficiency =
members > 0

? Math.min(
100,
Math.round(
(totalCollection /
(members * 100))
*100
)
)

: 0;

}

res.status(200).json({

success:true,
agents

});

}catch(error){

res.status(500).json({

success:false,
message:error.message

});

}

};

// Get Single Agent

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