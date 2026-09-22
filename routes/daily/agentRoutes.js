const express =
require("express");

const router =
express.Router();

const {

  addAgent,
  getAgents,
  getAgent,
  deleteAgent,
  getAgentProfile,
  updateAgent,
    getTaskAgents,
  getMembersByAgent


} = require("../../controllers/daily/agentController");

router.post(
  "/add-agent",
  addAgent
);

router.get(
  "/agents",
  getAgents
);
router.get(
  "/task-agents",
  getTaskAgents
);

router.get(
"/agent-profile/:id",
getAgentProfile
);
router.get(
  "/agent/:id",
  getAgent
);

router.get(
  "/members/agent/:agentId",
  getMembersByAgent
);

router.delete(
  "/agent/:id",
  deleteAgent
);
router.put("/agent/:id", updateAgent);

module.exports = router;