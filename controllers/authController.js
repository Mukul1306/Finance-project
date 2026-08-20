const Admin = require("../models/Admin");
const jwt = require("jsonwebtoken");

const Agent = require("../models/daily/Agent");
const DailyMember = require("../models/daily/DailyMember");

// SOCIETY MEMBER
const Member = require("../models/Members");


exports.login = async (req, res) => {

  try {

    console.log("BODY =", req.body);

    const {
      mobile,
      password
    } = req.body;


    // =====================================================
    // VALIDATION
    // =====================================================

    if (!mobile || !password) {

      return res.status(400).json({
        success: false,
        message: "Mobile number and password are required"
      });

    }


    // =====================================================
    // ADMIN LOGIN
    // =====================================================

    const admin =
      await Admin.findOne({
        mobile
      });

    if (admin) {

      if (
        password !== admin.password
      ) {

        return res.status(401).json({
          success: false,
          message: "Invalid Password"
        });

      }


      const token =
        jwt.sign(
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


    // =====================================================
    // AGENT LOGIN
    // =====================================================

    const agent =
      await Agent.findOne({
        mobile
      });

    if (agent) {

      if (
        password !== agent.password
      ) {

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


    // =====================================================
    // DAILY MEMBER LOGIN
    // =====================================================

    const dailyMember =
      await DailyMember.findOne({
        mobile
      });

    if (dailyMember) {

      if (
        password !== dailyMember.password
      ) {

        return res.status(401).json({
          success: false,
          message: "Invalid Password"
        });

      }


      return res.status(200).json({

        success: true,

        role: "MEMBER",

        member: {

          _id:
            dailyMember._id,

          memberId:
            dailyMember.memberId,

          memberName:
            dailyMember.memberName,

          mobile:
            dailyMember.mobile,

          status:
            dailyMember.status

        }

      });

    }

// =====================================================
// SOCIETY MEMBER LOGIN
// =====================================================

const societyMember =
  await Member.findOne({
    mobile: mobile.trim()
  }).populate(
    "societyId",
    "societyName durationMonths startDate maxMembers currentMembers status"
  );

console.log(
  "SOCIETY MEMBER FOUND =",
  societyMember
    ? {
        id: societyMember._id,
        memberId: societyMember.memberId,
        name: societyMember.name,
        mobile: societyMember.mobile,
        password: societyMember.password,
        status: societyMember.status
      }
    : null
);


if (societyMember) {

  // =============================================
  // PASSWORD NOT SET
  // =============================================

  if (
    !societyMember.password ||
    String(societyMember.password).trim() === ""
  ) {

    return res.status(403).json({

      success: false,

      message:
        "Password has not been assigned to this member"

    });

  }


  // =============================================
  // PASSWORD CHECK
  // =============================================

  if (
    String(password).trim() !==
    String(societyMember.password).trim()
  ) {

    return res.status(401).json({

      success: false,

      message:
        "Invalid Password"

    });

  }


  // =============================================
  // STATUS CHECK
  // =============================================

  if (
    societyMember.status &&
    societyMember.status !== "ACTIVE"
  ) {

    return res.status(403).json({

      success: false,

      message:
        "Society member account is not active"

    });

  }


  // =============================================
  // JWT
  // =============================================

  const token =
    jwt.sign(
      {
        id: societyMember._id,
        role: "SOCIETY_MEMBER"
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d"
      }
    );


  // =============================================
  // REMOVE PASSWORD
  // =============================================

  const memberData =
    societyMember.toObject();

  delete memberData.password;


  // =============================================
  // RESPONSE
  // =============================================

  return res.status(200).json({

    success: true,

    role: "SOCIETY_MEMBER",

    token,

    member: memberData

  });

}

    // =====================================================
    // USER NOT FOUND
    // =====================================================

    return res.status(404).json({

      success: false,

      message:
        "User Not Found"

    });


  } catch (error) {

    console.log(
      "LOGIN ERROR:",
      error
    );


    return res.status(500).json({

      success: false,

      message:
        error.message

    });

  }

};