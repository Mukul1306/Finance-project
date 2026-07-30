const DailySaving = require("../../models/daily/DailySaving");
const DailyMember = require("../../models/daily/DailyMember");
const AreaGroup = require("../../models/daily/AreaGroup");
const DailyAgent = require("../../models/daily/Agent");

/*
=========================================
CREATE DAILY SAVING ACCOUNT
=========================================
*/

exports.createDailySaving = async (req, res) => {

  try {

    const {

      member,

      areaGroup,

      collectionType,

      fixedAmount,

      durationDays,

      startDate,

      graceDays,

      penaltyType,

      penaltyValue,

      nomineeName ,

nomineeMobile
   

    } = req.body;

    // Check Member

    const memberData = await DailyMember.findById(member);

    if (!memberData) {

      return res.status(404).json({

        success: false,

        message: "Member Not Found"

      });

    }

    // Check Area

    const area = await AreaGroup
      .findById(areaGroup)
      .populate("assignedAgent");

    if (!area) {

      return res.status(404).json({

        success: false,

        message: "Area Group Not Found"

      });

    }

    // Prevent Duplicate Active Account

    const exists =
      await DailySaving.findOne({

        member,

        status: "ACTIVE"

      });

    if (exists) {

      return res.status(400).json({

        success: false,

        message:
        "This Member already has an Active Saving Account"

      });

    }

    // Calculate End Date

    const endDate =
      new Date(startDate);

    endDate.setDate(

      endDate.getDate() +

      Number(durationDays)

    );

    // Create Saving Account

const saving = await DailySaving.create({

    member,

    areaGroup,

    assignedAgent: area.assignedAgent._id,

    collectionType,

    fixedAmount:
      collectionType === "FIXED"
        ? fixedAmount
        : 0,

    durationDays,

    startDate,

    endDate,

    graceDays,

    penaltyType,

    penaltyValue,

    status: "ACTIVE",
    nomineeName: req.body.nomineeName || "",

nomineeMobile: req.body.nomineeMobile || ""

});

console.log("Saving Area:", saving.areaGroup);

const updatedArea = await AreaGroup.findByIdAndUpdate(

saving.areaGroup,

{
    $inc:{
        totalMembers:1
    }
},

{
    new:true
}

);

console.log("Updated Area:", updatedArea);



console.log("Saving Agent:", saving.assignedAgent);

const updatedAgent = await DailyAgent.findByIdAndUpdate(

saving.assignedAgent,

{
    $inc:{
        totalMembers:1
    }
},

{
    new:true
}

);

console.log("Updated Agent:", updatedAgent);

res.status(201).json({

    success:true,

    message:"Daily Saving Account Created Successfully",

    saving

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
=========================================
GET ALL DAILY SAVING ACCOUNTS
=========================================
*/

exports.getAllDailySavings = async (req, res) => {

  try {

    const savings = await DailySaving.find()

      .populate(
        "member",
        "memberId memberName mobile city"
      )

      .populate(
        "areaGroup",
        "areaName"
      )

      .populate(
        "assignedAgent",
        "name mobile"
      )

      .sort({
        createdAt: -1
      });

    res.status(200).json({

      success: true,

      savings

    });

  } catch (error) {

    res.status(500).json({

      success: false,

      message: error.message

    });

  }

};

/*
=========================================
GET SINGLE SAVING ACCOUNT
=========================================
*/

exports.getDailySaving = async (req, res) => {

  try {

    const saving = await DailySaving.findById(
      req.params.id
    )

      .populate("member")

      .populate("areaGroup")

      .populate("assignedAgent");

    if (!saving) {

      return res.status(404).json({

        success: false,

        message: "Saving Account Not Found"

      });

    }

    res.status(200).json({

      success: true,

      saving

    });

  } catch (error) {

    res.status(500).json({

      success: false,

      message: error.message

    });

  }

};
/*
=========================================
UPDATE DAILY SAVING ACCOUNT
=========================================
*/

exports.updateDailySaving = async (req, res) => {

  try {

    const saving =
      await DailySaving.findById(
        req.params.id
      );

    if (!saving) {

      return res.status(404).json({

        success: false,

        message: "Saving Account Not Found"

      });

    }

    Object.assign(saving, req.body);

    if (
      req.body.startDate ||
      req.body.durationDays
    ) {

      const start =
        new Date(
          saving.startDate
        );

      start.setHours(0,0,0,0);

      const end =
        new Date(start);

      end.setDate(

        end.getDate() +

        Number(
          saving.durationDays
        )

      );

      saving.endDate = end;

    }

    await saving.save();

    res.status(200).json({

      success: true,

      message:
      "Saving Account Updated",

      saving

    });

  } catch (error) {

    res.status(500).json({

      success: false,

      message: error.message

    });

  }

};
/*
=========================================
CLOSE SAVING ACCOUNT
=========================================
*/

exports.closeDailySaving = async (req, res) => {

  try {

    const saving =
      await DailySaving.findById(
        req.params.id
      );

    if (!saving) {

      return res.status(404).json({

        success: false,

        message: "Saving Account Not Found"

      });

    }
    await AreaGroup.findByIdAndUpdate(

saving.areaGroup,

{
    $inc:{
        totalMembers:-1
    }
}

);

await DailyAgent.findByIdAndUpdate(

saving.assignedAgent,

{
    $inc:{
        totalMembers:-1
    }
}

);


    saving.status = "CLOSED";

    await saving.save();

    res.status(200).json({

      success: true,

      message:
      "Saving Account Closed"

    });

  } catch (error) {

    res.status(500).json({

      success: false,

      message: error.message

    });

  }

};


/*
=========================================
GET MEMBER DETAILS FOR NEW SAVING
=========================================
*/

exports.getSavingMemberDetails = async (req, res) => {
  try {
    const member = await DailyMember.findById(req.params.memberId);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member Not Found"
      });
    }

    // Check if member already has an active saving account
    const activeSaving = await DailySaving.findOne({
      member: member._id,
      status: "ACTIVE"
    })
      .populate("areaGroup", "areaName")
      .populate("assignedAgent", "name");

    res.status(200).json({
      success: true,
      member,
      hasSaving: !!activeSaving,
      saving: activeSaving
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
