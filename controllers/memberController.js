const Member = require("../models/Members");
const Society = require("../models/Society");

// CREATE MEMBER

exports.createMember = async (req, res) => {

  try {

   const {
  societyId,
  name,
  fatherOrHusbandName,
  mobile,
  gender,
  dob,
  address,
  aadhaarNumber,
  nomineeName,
  nomineeMobile,
  monthlyInstallment,
  monthlyPenalty,
  dueDay
} = req.body;



      if (!mobile) {

      return res.status(400).json({

        success: false,
        message: "Mobile Required"

      });

    }

    const society =
    await Society.findById(
      societyId
    );
    
    if (!society) {

      return res.status(404).json({

        success: false,
        message: "Society Not Found"

      });

    }

    const installmentAmount =
    Number(monthlyInstallment);

    const joiningDate =
    new Date();

    const memberEndDate =
    new Date(joiningDate);

    memberEndDate.setMonth(
      memberEndDate.getMonth() +
      society.durationMonths
    );

    const totalInstallments =
    society.durationMonths;

    const pendingInstallments =
    society.durationMonths;

    const pendingAmount =
    installmentAmount *
    society.durationMonths;

    const member =
    await Member.create({

      societyId,
      name,
      fatherOrHusbandName,
      mobile,
      gender,
      dob,
      address,
      aadhaarNumber,
      nomineeName,
      nomineeMobile,
      dueDay,
      joiningDate,

      memberEndDate,

      monthlyInstallment:
      installmentAmount,

      totalInstallments,

      paidInstallments: 0,

      pendingInstallments,

      totalPaid: 0,

      pendingAmount,

currentPenalty: 0,

totalPenaltyPaid: 0,

lastPaymentDate: null,

      status: "ACTIVE"

    });

    society.currentMembers += 1;

    await society.save();

    res.status(201).json({

      success: true,

      message:
      "Member Added Successfully",

      member

    });

  }

  catch (error) {

    res.status(500).json({

      success: false,
      message: error.message

    });

  }

};


// GET ALL MEMBERS

exports.getMembers = async (req, res) => {

  try {

    const members =
    await Member.find()

    .populate(
      "societyId",
      "societyName durationMonths currentMembers maxMembers"
    )

    .sort({
      createdAt: -1
    });

const today = new Date();

const updatedMembers =
members.map((member) => {

  const joiningDate =
  new Date(member.joiningDate);

  const monthsPassed =

  (today.getFullYear() -
  joiningDate.getFullYear()) * 12 +

  (today.getMonth() -
  joiningDate.getMonth());

  let status = "PENDING";

  if (

    member.paidInstallments >=
    member.totalInstallments

  ) {

    status = "COMPLETED";

  }

  else if (

    member.paidInstallments >=
    monthsPassed

  ) {

    status = "PAID";

  }

  else if (

    monthsPassed -
    member.paidInstallments === 1

  ) {

    status = "DUE";

  }

  else if (

    monthsPassed -
    member.paidInstallments > 1

  ) {

    status = "OVERDUE";

  }

  return {

    ...member.toObject(),

    status

  };

});


   res.status(200).json({

  success: true,

  count: updatedMembers.length,

  members: updatedMembers

});

  }

  catch (error) {

    res.status(500).json({

      success: false,
      message: error.message

    });

  }

};
exports.getMemberById = async (req, res) => {

  try {

    const member = await Member.findById(
      req.params.id
    ).populate("societyId");

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



