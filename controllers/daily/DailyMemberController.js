const DailyMember = require("../../models/daily/DailyMember");
const DailyLoan = require("../../models/daily/DailyLoan");

const AreaGroup = require("../../models/daily/AreaGroup");
const DailySaving = require("../../models/daily/DailySaving");

/*
==================================
CREATE MEMBER
==================================
*/


exports.createMember = async (req, res) => {
  try {
    const {
      memberId,
      memberName,
      fatherName,
      gender,
      dob,
      email,
      mobile,
      password,
      confirmPassword,
      alternateMobile,
      residentialAddress,
      city,
      district,
      state,
      pincode,
      status,
      areaGroup,
    } = req.body;

    if (
      !memberId ||
      !memberName ||
      !fatherName ||
      !gender ||
      !dob ||
      !mobile ||
      !password ||
      !confirmPassword ||
      !residentialAddress ||
      !city ||
      !district ||
      !state ||
      !pincode ||
      !areaGroup
    ) {
      return res.status(400).json({
        success: false,
        message: "Please fill all required fields.",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Password and Confirm Password do not match.",
      });
    }

    const exists = await DailyMember.findOne({
      $or: [{ memberId }, { mobile }],
    });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Member ID or Mobile Number already exists.",
      });
    }

    // Validate the selected area without requiring an agent.
    const area = await AreaGroup.findById(areaGroup);

    if (!area) {
      return res.status(404).json({
        success: false,
        message: "Selected Area not found.",
      });
    }

    const member = await DailyMember.create({
      memberId,
      memberName,
      fatherName,
      gender,
      dob,
      email: email || "",
      mobile,
      password,
      alternateMobile: alternateMobile || "",
      residentialAddress,
      city,
      district,
      state,
      pincode,
      status: status || "ACTIVE",
      areaGroup: area._id,
    });

    const responseMember = member.toObject();
    delete responseMember.password;

    return res.status(201).json({
      success: true,
      message: "Member Registered Successfully.",
      member: responseMember,
    });
  } catch (error) {
    console.error("CREATE MEMBER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


/*
==================================
GET ALL MEMBERS
==================================
*/

exports.getMembers = async (req, res) => {

  try {

    const members = await DailyMember.find()
      .sort({ createdAt: -1 });

    res.status(200).json({

      success: true,

      members

    });

  } catch (error) {

    res.status(500).json({

      success: false,

      message: error.message

    });

  }

};

/*
==================================
GET SINGLE MEMBER
==================================
*/


exports.getMemberProfile = async (req, res) => {
  try {
    const member = await DailyMember.findById(req.params.id)
      .select("-password")
      .populate("areaGroup", "areaName");

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member Not Found.",
      });
    }

    return res.status(200).json({
      success: true,
      member,
    });
  } catch (error) {
    console.error("GET MEMBER PROFILE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/*
==================================
UPDATE MEMBER
==================================
*/


exports.updateMember = async (req, res) => {
  try {
    const id = req.params.id;

    const {
      memberId: newMemberId,
      memberName,
      fatherName,
      gender,
      dob,
      email,
      mobile,
      password,
      alternateMobile,
      residentialAddress,
      city,
      district,
      state,
      pincode,
      status,
      areaGroup,
    } = req.body;

    const member = await DailyMember.findById(id);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member Not Found.",
      });
    }

    if (newMemberId && newMemberId !== member.memberId) {
      const existingMember = await DailyMember.findOne({
        memberId: newMemberId,
        _id: { $ne: id },
      });

      if (existingMember) {
        return res.status(400).json({
          success: false,
          message: "Member ID already exists.",
        });
      }
    }

    if (mobile && mobile !== member.mobile) {
      const existingMobile = await DailyMember.findOne({
        mobile,
        _id: { $ne: id },
      });

      if (existingMobile) {
        return res.status(400).json({
          success: false,
          message: "Mobile Number already exists.",
        });
      }
    }

    // Update area without any agent dependency.
    if (areaGroup !== undefined) {
      const area = await AreaGroup.findById(areaGroup);

      if (!area) {
        return res.status(404).json({
          success: false,
          message: "Selected Area not found.",
        });
      }

      member.areaGroup = area._id;
    }

    const fields = {
      memberId: newMemberId,
      memberName,
      fatherName,
      gender,
      dob,
      email,
      mobile,
      alternateMobile,
      residentialAddress,
      city,
      district,
      state,
      pincode,
      status,
    };

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        member[key] = value;
      }
    }

    // Keep existing password if no new password is provided.
    if (password && password.trim()) {
      member.password = password;
    }

    await member.save();

    // Synchronize the area name to related loans.
    // Do not assign or update an agent.
    const memberArea = await AreaGroup.findById(member.areaGroup);

    if (memberArea) {
      await DailyLoan.updateMany(
        { member: member._id },
        {
          $set: {
            areaName: memberArea.areaName,
          },
        }
      );
    }

    const responseMember = member.toObject();
    delete responseMember.password;

    return res.status(200).json({
      success: true,
      message: "Member Updated Successfully.",
      member: responseMember,
    });
  } catch (error) {
    console.error("UPDATE MEMBER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};




exports.deleteMember = async (req, res) => {
  try {
    const member = await DailyMember.findById(req.params.id);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member Not Found",
      });
    }

    const [loanExists, savingExists] = await Promise.all([
      DailyLoan.exists({ member: member._id }),
      DailySaving.exists({ member: member._id }),
    ]);

    if (loanExists || savingExists) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete a member with existing loan or saving records. Deactivate the member instead.",
      });
    }

    await member.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Member Deleted Successfully",
    });
  } catch (error) {
    console.error("DELETE MEMBER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.memberLogin = async (req, res) => {

  try {

    const { mobile, password } = req.body;

    const member = await DailyMember.findOne({ mobile });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found"
      });
    }

    if (member.password !== password) {
      return res.status(400).json({
        success: false,
        message: "Invalid Password"
      });
    }

    const responseMember = member.toObject();

    delete responseMember.password;

    res.status(200).json({
      success: true,
      message: "Login Successful",
      member: responseMember
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }

};



exports.getMemberLoan = async (req, res) => {
  try {
    const loan = await DailyLoan.findOne({
      member: req.params.memberId,
    });

    return res.status(200).json({
      success: true,
      loan: loan || null,
    });
  } catch (error) {
    console.error("GET MEMBER LOAN ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


