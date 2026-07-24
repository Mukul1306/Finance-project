const Expense = require("../models/Expense");

/*
==============================
ADD TRANSACTION
(INCOME / EXPENSE)
==============================
*/

exports.addExpense = async (req, res) => {

  try {

    const {
      title,
      type,
      category,
      amount,
      paymentMethod,
      note
    } = req.body;
console.log("BODY RECEIVED:", req.body);
    const transaction = await Expense.create({

      title,

      type: type || "EXPENSE",

      category,

      amount,

      paymentMethod,

      note

    });

    res.status(201).json({

      success: true,

      transaction

    });

  }

  catch (error) {

    res.status(500).json({

      success: false,

      message: error.message

    });

  }

};

/*
==============================
GET ALL TRANSACTIONS
==============================
*/

exports.getExpenses = async (req, res) => {

  try {

    const expenses = await Expense.find()

      .sort({

        createdAt: -1

      });

    res.json({

      success: true,

      expenses

    });

  }

  catch (error) {

    res.status(500).json({

      success: false,

      message: error.message

    });

  }

};

/*
==============================
DELETE TRANSACTION
==============================
*/

exports.deleteExpense = async (req, res) => {

  try {

    await Expense.findByIdAndDelete(

      req.params.id

    );

    res.json({

      success: true,

      message: "Transaction Deleted"

    });

  }

  catch (error) {

    res.status(500).json({

      success: false,

      message: error.message

    });

  }

};