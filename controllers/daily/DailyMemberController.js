const DailyMember = require("../../models/daily/DailyMember");
const DailyLoan = require("../../models/daily/DailyLoan");
/*
==================================
CREATE MEMBER
==================================
*/

exports.createMember = async (req, res) => {

  try {

    const exists = await DailyMember.findOne({
      $or: [
        { memberId: req.body.memberId },
        { mobile: req.body.mobile }
      ]
    });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Member ID or Mobile Number already exists"
      });
    }

    if (req.body.password !== req.body.confirmPassword) {
  return res.status(400).json({
    success: false,
    message: "Password and Confirm Password do not match"
  });
}

    const member = await DailyMember.create({

      memberId: req.body.memberId,

      memberName: req.body.memberName,

      fatherName: req.body.fatherName,

      gender: req.body.gender,

      dob: req.body.dob,

      email: req.body.email,

     mobile: req.body.mobile,

password: req.body.password,

alternateMobile: req.body.alternateMobile,

      residentialAddress: req.body.residentialAddress,

      city: req.body.city,

      district: req.body.district,

      state: req.body.state,

      pincode: req.body.pincode,

      status: req.body.status || "ACTIVE"

    });

  const responseMember = member.toObject();

delete responseMember.password;

res.status(201).json({

  success: true,

  message: "Member Registered Successfully",

  member: responseMember

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

    const member = await DailyMember.findById(
      req.params.id
    );

    if (!member) {

      return res.status(404).json({

        success: false,

        message: "Member Not Found"

      });

    }

    res.status(200).json({

      success: true,

      member

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
UPDATE MEMBER
==================================
*/

exports.updateMember = async (req, res) => {

  try {

    const member = await DailyMember.findByIdAndUpdate(

      req.params.id,

      req.body,

      {
        new: true,
        runValidators: true
      }

    );

    if (!member) {

      return res.status(404).json({

        success: false,

        message: "Member Not Found"

      });

    }

    res.status(200).json({

      success: true,

      message: "Member Updated Successfully",

      member

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
DELETE MEMBER
==================================
*/

exports.deleteMember = async (req, res) => {

  try {

    const member = await DailyMember.findById(req.params.id);

    if (!member) {

      return res.status(404).json({

        success: false,

        message: "Member Not Found"

      });

    }

    await member.deleteOne();

    res.status(200).json({

      success: true,

      message: "Member Deleted Successfully"

    });

  } catch (error) {

    res.status(500).json({

      success: false,

      message: error.message

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
      member: req.params.memberId
    })
      .populate("assignedAgent", "name mobile");

    if (!loan) {

      return res.json({
        success: true,
        loan: null
      });

    }

    res.json({
      success: true,
      loan
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }

};
