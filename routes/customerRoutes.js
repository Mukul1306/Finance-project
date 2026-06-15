const express = require("express");

const router = express.Router();

const {
  getCustomers,
  createCustomer,
} = require("../controllers/customerController");

router.get("/", getCustomers);

router.post("/", createCustomer);

module.exports = router;