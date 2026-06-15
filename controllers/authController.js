const Admin = require("../models/Admin");
const jwt = require("jsonwebtoken");
const Agent = require("../models/daily/Agent");

exports.login = async (req, res) => {

try {

console.log("BODY =", req.body);

const { mobile, password } = req.body;

// ======================
// ADMIN LOGIN
// ======================

const admin = await Admin.findOne({ mobile });

if (admin) {

  if (password !== admin.password) {

    return res.status(401).json({
      success: false,
      message: "Invalid Password"
    });

  }

  const token = jwt.sign(
    {
      id: admin._id,
      role: "ADMIN"
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d"
    }
  );

  return res.status(200).json({
    success: true,
    role: "ADMIN",
    token,
    admin
  });

}

// ======================
// AGENT LOGIN
// ======================

const agent = await Agent.findOne({ mobile });

if (agent) {

  if (password !== agent.password) {

    return res.status(401).json({
      success: false,
      message: "Invalid Password"
    });

  }

  return res.status(200).json({
    success: true,
    role: "AGENT",
    agent
  });

}

return res.status(404).json({
  success: false,
  message: "User Not Found"
});

} catch (error) {

console.log(error);

res.status(500).json({
  success: false,
  message: error.message
});


}

};
