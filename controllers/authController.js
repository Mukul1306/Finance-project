
const Admin = require("../models/Admin");
const jwt = require("jsonwebtoken");

const DailyMember = require("../models/daily/DailyMember");
const Member = require("../models/Members");

const createLoginToken = (userId, role) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET,
    { expiresIn: "30d" }
  );
};

const publicData = (document) => {
  const data = document.toObject();
  delete data.password;
  return data;
};

exports.login = async (req, res) => {
  try {
    const mobile = String(req.body.mobile || "").trim();
    const { password } = req.body;

    if (!mobile || !password) {
      return res.status(400).json({
        success: false,
        message: "Mobile number and password are required",
      });
    }

    // ADMIN LOGIN
    const admin = await Admin.findOne({ mobile });

    if (admin) {
      if (password !== admin.password) {
        return res.status(401).json({
          success: false,
          message: "Invalid Password",
        });
      }

      const token = createLoginToken(admin._id, "ADMIN");

      return res.status(200).json({
        success: true,
        role: "ADMIN",
        token,
        admin: publicData(admin),
      });
    }

    // DAILY MEMBER LOGIN
    const dailyMember = await DailyMember.findOne({ mobile });

    if (dailyMember) {
      if (password !== dailyMember.password) {
        return res.status(401).json({
          success: false,
          message: "Invalid Password",
        });
      }

      const token = createLoginToken(dailyMember._id, "MEMBER");

      return res.status(200).json({
        success: true,
        role: "MEMBER",
        token,
        member: {
          _id: dailyMember._id,
          memberId: dailyMember.memberId,
          memberName: dailyMember.memberName,
          mobile: dailyMember.mobile,
          status: dailyMember.status,
        },
      });
    }

    // SOCIETY MEMBER LOGIN
    const societyMember = await Member.findOne({ mobile })
      .select("+password")
      .populate(
        "societyId",
        "societyName durationMonths startDate maxMembers currentMembers status"
      );

    if (societyMember) {
      if (
        !societyMember.password ||
        String(societyMember.password).trim() === ""
      ) {
        return res.status(403).json({
          success: false,
          message: "Password has not been assigned to this member",
        });
      }

      if (
        String(password).trim() !==
        String(societyMember.password).trim()
      ) {
        return res.status(401).json({
          success: false,
          message: "Invalid Password",
        });
      }

      if (
        societyMember.status &&
        societyMember.status !== "ACTIVE"
      ) {
        return res.status(403).json({
          success: false,
          message: "Society member account is not active",
        });
      }

      const token = createLoginToken(
        societyMember._id,
        "SOCIETY_MEMBER"
      );

      return res.status(200).json({
        success: true,
        role: "SOCIETY_MEMBER",
        token,
        member: publicData(societyMember),
      });
    }

    return res.status(404).json({
      success: false,
      message: "User Not Found",
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error.message);

    return res.status(500).json({
      success: false,
      message: "An internal server error occurred during login",
    });
  }
};
