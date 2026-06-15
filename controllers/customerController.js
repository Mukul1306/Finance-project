const Customer = require("../models/Customer");

const getCustomers = async (req, res) => {
  try {
    const customers = await Customer.find();

    res.status(200).json(customers);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const createCustomer = async (req, res) => {
  try {
    const customer = await Customer.create(req.body);

    res.status(201).json(customer);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  getCustomers,
  createCustomer,
};