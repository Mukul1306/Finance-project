const DailyMember = require("../../models/daily/DailyMember");
const DailyLoan = require("../../models/daily/DailyLoan");
const DailyMemberRequest = require("../../models/daily/DailyMemberRequest");
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

/*
==================================
AGENT CREATE MEMBER REQUEST
==================================
*/

exports.createMemberRequest = async (req, res) => {
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
      pincode
    } = req.body;

    // =========================
    // REQUIRED FIELD CHECK
    // =========================

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
      !pincode
    ) {
      return res.status(400).json({
        success: false,
        message: "Please fill all required fields"
      });
    }

    // =========================
    // PASSWORD CHECK
    // =========================

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Password and Confirm Password do not match"
      });
    }

    // =========================
    // CHECK REAL MEMBER
    // =========================

    const existingMember = await DailyMember.findOne({
      $or: [
        { memberId },
        { mobile }
      ]
    });

    if (existingMember) {
      return res.status(400).json({
        success: false,
        message: "Member ID or Mobile Number already exists"
      });
    }

    // =========================
    // CHECK PENDING REQUEST
    // =========================

    const existingRequest = await DailyMemberRequest.findOne({
      $or: [
        { memberId },
        { mobile }
      ],
      status: "PENDING"
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: "A member request with this Member ID or Mobile Number is already pending"
      });
    }

    // =========================
    // AGENT ID
    // =========================

    const agentId =
      req.user?._id ||
      req.user?.id ||
      req.body.agentId;

    if (!agentId) {
      return res.status(400).json({
        success: false,
        message: "Agent ID is required"
      });
    }

    // =========================
    // CREATE REQUEST
    // =========================

    const request = await DailyMemberRequest.create({
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

      requestedBy: agentId,

      status: "PENDING"
    });

    const responseRequest = request.toObject();

    // Never send password back
    delete responseRequest.password;

    return res.status(201).json({
      success: true,
      message: "Member request submitted successfully. Waiting for Admin approval.",
      request: responseRequest
    });

  } catch (error) {
    console.error("CREATE MEMBER REQUEST ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/*
==================================
ADMIN GET MEMBER REQUESTS
==================================
*/

exports.getMemberRequests = async (req, res) => {
  try {
    const requests = await DailyMemberRequest.find({
      status: "PENDING"
    })
      .populate("requestedBy", "name mobile")
      .sort({ createdAt: -1 });

    const safeRequests = requests.map((request) => {
      const data = request.toObject();

      delete data.password;

      return data;
    });

    return res.status(200).json({
      success: true,
      count: safeRequests.length,
      requests: safeRequests
    });

  } catch (error) {
    console.error("GET MEMBER REQUESTS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/*
==================================
ADMIN APPROVE MEMBER REQUEST
==================================
*/

exports.approveMemberRequest = async (req, res) => {
  try {
    const request = await DailyMemberRequest.findById(
      req.params.id
    );

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Member request not found"
      });
    }

    if (request.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: `Request is already ${request.status}`
      });
    }

    // =========================
    // CHECK DUPLICATE AGAIN
    // =========================

    const existingMember = await DailyMember.findOne({
      $or: [
        { memberId: request.memberId },
        { mobile: request.mobile }
      ]
    });

    if (existingMember) {
      return res.status(400).json({
        success: false,
        message: "Member ID or Mobile Number already exists"
      });
    }

    // =========================
    // CREATE REAL MEMBER
    // =========================

    const member = await DailyMember.create({
      memberId: request.memberId,

      memberName: request.memberName,

      fatherName: request.fatherName,

      gender: request.gender,

      dob: request.dob,

      email: request.email,

      mobile: request.mobile,

      password: request.password,

      alternateMobile: request.alternateMobile,

      residentialAddress: request.residentialAddress,

      city: request.city,

      district: request.district,

      state: request.state,

      pincode: request.pincode,

      status: "ACTIVE"
    });

    // =========================
    // UPDATE REQUEST
    // =========================

    const adminId =
      req.user?._id ||
      req.user?.id ||
      null;

    request.status = "APPROVED";

    request.approvedBy = adminId;

    request.approvedAt = new Date();

    await request.save();

    // =========================
    // RESPONSE
    // =========================

    const responseMember = member.toObject();

    delete responseMember.password;

    return res.status(200).json({
      success: true,
      message: "Member request approved successfully",
      member: responseMember
    });

  } catch (error) {
    console.error("APPROVE MEMBER REQUEST ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


/*
==================================
ADMIN REJECT MEMBER REQUEST
==================================
*/

exports.rejectMemberRequest = async (req, res) => {
  try {
    const { rejectionReason = "" } = req.body;

    const request = await DailyMemberRequest.findById(
      req.params.id
    );

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Member request not found"
      });
    }

    if (request.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: `Request is already ${request.status}`
      });
    }

    const adminId =
      req.user?._id ||
      req.user?.id ||
      null;

    request.status = "REJECTED";

    request.rejectedBy = adminId;

    request.rejectedAt = new Date();

    request.rejectionReason = rejectionReason;

    await request.save();

    return res.status(200).json({
      success: true,
      message: "Member request rejected successfully"
    });

  } catch (error) {
    console.error("REJECT MEMBER REQUEST ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
