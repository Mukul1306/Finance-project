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
  updateAgent

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
"/agent-profile/:id",
getAgentProfile
);
router.get(
  "/agent/:id",
  getAgent
);

router.delete(
  "/agent/:id",
  deleteAgent
);
router.put("/agent/:id", updateAgent);

module.exports = router;