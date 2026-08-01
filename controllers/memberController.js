const Member = require("../models/Members");
const Society = require("../models/Society");
const Payment = require("../models/Payment");
// CREATE MEMBER

exports.createMember = async (req, res) => {

  try {

   const {
   memberId,
societyId,

name,
fatherOrHusbandName,
gender,
dob,

mobile,
alternateMobile,
email,
joiningDate,
address,
pinCode,
city,
district,
state,

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

    const existingMember = await Member.findOne({ memberId });

if (existingMember) {

  return res.status(400).json({

    success: false,

    message: "Member ID already exists."

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
const memberJoiningDate = new Date(joiningDate);

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

   const member = await Member.create({

  memberId,
  societyId,

  name,
  fatherOrHusbandName,

  gender,
  dob,

  mobile,
  email,
  alternateMobile,

  address,
  pinCode,
  city,
  district,
  state,

  aadhaarNumber,

  nomineeName,
  nomineeMobile,

  dueDay,

  joiningDate: memberJoiningDate,

  memberEndDate,

  monthlyInstallment: installmentAmount,

  monthlyPenalty: Number(monthlyPenalty),

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

    const members = await Member.find()
      .populate(
        "societyId",
        "societyName durationMonths currentMembers maxMembers"
      )
      .sort({ createdAt: -1 });

    const today = new Date();

    const updatedMembers = await Promise.all(

      members.map(async (member) => {

        const joiningDate = new Date(member.joiningDate);

        const monthsPassed =
          (today.getFullYear() - joiningDate.getFullYear()) * 12 +
          (today.getMonth() - joiningDate.getMonth());

        let status = "PENDING";

        if (member.paidInstallments >= member.totalInstallments) {

          status = "COMPLETED";

        } else if (member.paidInstallments >= monthsPassed + 1) {

          status = "PAID";

        } else if ((monthsPassed + 1) - member.paidInstallments === 1) {

          status = "DUE";

        } else {

          status = "OVERDUE";

        }

// Total installments that should have been paid till today
const dueInstallments = Math.min(
  monthsPassed + 1,
  member.totalInstallments
);

// Count how many installments have actually been paid
const paidInstallments = await Payment.countDocuments({
  memberId: member._id
});

// Number of overdue installments
const overdueInstallments = Math.max(
  0,
  dueInstallments - paidInstallments
);

// Pending amount till today
const overdueAmount =
  overdueInstallments * Number(member.monthlyInstallment);

// Can collect?
const canCollect = overdueInstallments > 0;
// Current pending penalty
const currentPenalty =
  overdueInstallments *
  Number(member.monthlyPenalty);

// Total payable today
const totalPayable =
  overdueAmount +
  currentPenalty;

console.log("========================");
console.log("Member:", member.name);
console.log("Joining:", member.joiningDate);
console.log("Monthly EMI:", member.monthlyInstallment);
console.log("Paid Installments:", member.paidInstallments);

console.log("Due Installments:", dueInstallments);
console.log("Payment Count:", paidInstallments);
console.log("Overdue Installments:", overdueInstallments);
console.log("Overdue Amount:", overdueAmount);

   return {
  ...member.toObject(),
  status,
  canCollect,
  overdueAmount,
  currentPenalty,
  totalPayable
};

      })

    );

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

exports.updateMember = async (req, res) => {

  try {

    const member = await Member.findById(req.params.id);

    if (!member) {

      return res.status(404).json({
        success: false,
        message: "Member Not Found"
      });

    }

    const {

      memberId,
      societyId,
      name,
      fatherOrHusbandName,
      gender,
      dob,

      mobile,
      alternateMobile,
      email,

      address,
      pinCode,
      city,
      district,
      state,

      aadhaarNumber,

      nomineeName,
      nomineeMobile,

      joiningDate,

      monthlyInstallment,
      monthlyPenalty,

      dueDay

    } = req.body;

    member.memberId = memberId;
    member.societyId = societyId;

    member.name = name;
    member.fatherOrHusbandName = fatherOrHusbandName;

    member.gender = gender;
    member.dob = dob;

    member.mobile = mobile;
    member.alternateMobile = alternateMobile;
    member.email = email;

    member.address = address;
    member.pinCode = pinCode;
    member.city = city;
    member.district = district;
    member.state = state;

    member.aadhaarNumber = aadhaarNumber;

    member.nomineeName = nomineeName;
    member.nomineeMobile = nomineeMobile;

    member.joiningDate = joiningDate;

    member.monthlyInstallment = Number(monthlyInstallment);

    member.monthlyPenalty = Number(monthlyPenalty);

    member.dueDay = dueDay;

    await member.save();

    res.json({

      success: true,

      message: "Member Updated Successfully",

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

exports.deleteMember = async (req, res) => {

  try {

    const paymentCount = await Payment.countDocuments({

      memberId: req.params.id

    });

    if (paymentCount > 0) {

      return res.status(400).json({

        success: false,

        message: "Member has payment history. Cannot delete."

      });

    }

    const member = await Member.findById(req.params.id);

    if (!member) {

      return res.status(404).json({

        success: false,

        message: "Member Not Found"

      });

    }

    await Member.findByIdAndDelete(req.params.id);

    await Society.findByIdAndUpdate(

      member.societyId,

      {

        $inc: {

          currentMembers: -1

        }

      }

    );

    res.json({

      success: true,

      message: "Member Deleted Successfully"

    });

  }

  catch (error) {

    res.status(500).json({

      success: false,

      message: error.message

    });

  }

};
