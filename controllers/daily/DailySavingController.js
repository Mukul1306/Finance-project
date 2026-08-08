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

    const saving = await DailySaving.findById(req.params.id);

    if (!saving) {
      return res.status(404).json({
        success: false,
        message: "Saving Account Not Found"
      });
    }

    // Only ACTIVE accounts can be edited
    if (saving.status !== "ACTIVE") {
      return res.status(400).json({
        success: false,
        message: "Only ACTIVE saving accounts can be edited"
      });
    }

    const {
      areaGroup,
      collectionType,
      fixedAmount,
      durationDays,
      startDate,
      graceDays,
      penaltyType,
      penaltyValue,
      nomineeName,
      nomineeMobile
    } = req.body;

    // ==========================================
    // AREA / AGENT
    // ==========================================

    if (areaGroup && areaGroup !== saving.areaGroup.toString()) {

      const newArea = await AreaGroup
        .findById(areaGroup)
        .populate("assignedAgent");

      if (!newArea) {
        return res.status(404).json({
          success: false,
          message: "Area Group Not Found"
        });
      }

      // Remove old area member count
      if (saving.areaGroup) {
        await AreaGroup.findByIdAndUpdate(
          saving.areaGroup,
          {
            $inc: {
              totalMembers: -1
            }
          }
        );
      }

      // Remove old agent count
      if (saving.assignedAgent) {
        await DailyAgent.findByIdAndUpdate(
          saving.assignedAgent,
          {
            $inc: {
              totalMembers: -1
            }
          }
        );
      }

      saving.areaGroup = newArea._id;

      saving.assignedAgent =
        newArea.assignedAgent?._id || null;

      // Add new area count
      await AreaGroup.findByIdAndUpdate(
        newArea._id,
        {
          $inc: {
            totalMembers: 1
          }
        }
      );

      // Add new agent count
      if (newArea.assignedAgent?._id) {
        await DailyAgent.findByIdAndUpdate(
          newArea.assignedAgent._id,
          {
            $inc: {
              totalMembers: 1
            }
          }
        );
      }

    }

    // ==========================================
    // SAVING DETAILS
    // ==========================================

    if (collectionType !== undefined) {
      saving.collectionType = collectionType;
    }

    saving.fixedAmount =
      saving.collectionType === "FIXED"
        ? Number(fixedAmount || 0)
        : 0;

    if (durationDays !== undefined) {
      saving.durationDays = Number(durationDays);
    }

    if (startDate !== undefined) {
      saving.startDate = new Date(startDate);
    }

    if (graceDays !== undefined) {
      saving.graceDays = Number(graceDays || 0);
    }

    if (penaltyType !== undefined) {
      saving.penaltyType = penaltyType;
    }

    if (penaltyValue !== undefined) {
      saving.penaltyValue = Number(penaltyValue || 0);
    }

    saving.nomineeName =
      nomineeName || "";

    saving.nomineeMobile =
      nomineeMobile || "";

    // ==========================================
    // RECALCULATE END DATE
    // ==========================================

    const start = new Date(saving.startDate);

    start.setHours(0, 0, 0, 0);

    const end = new Date(start);

    end.setDate(
      end.getDate() +
      Number(saving.durationDays)
    );

    saving.endDate = end;

    await saving.save();

    res.status(200).json({
      success: true,
      message: "Saving Account Updated Successfully",
      saving
    });

  } catch (error) {

    console.error(
      "UPDATE SAVING ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message
    });

  }
};

exports.terminateDailySaving = async (req, res) => {
  try {

    const {
      reason,
      terminatedBy
    } = req.body;

    const saving = await DailySaving.findById(
      req.params.id
    );

    if (!saving) {
      return res.status(404).json({
        success: false,
        message: "Saving Account Not Found"
      });
    }

    // Only active account can be terminated
    if (saving.status !== "ACTIVE") {
      return res.status(400).json({
        success: false,
        message:
          "Only ACTIVE saving accounts can be terminated"
      });
    }

    // ==========================================
    // TERMINATE ACCOUNT
    // ==========================================

    saving.status = "TERMINATED";

    saving.terminationDate = new Date();

    saving.terminationReason =
      reason || "Account terminated";

    saving.terminatedBy =
      terminatedBy || "ADMIN";

    // Stop future collection
    saving.nextCollectionDate = null;

    await saving.save();

    // ==========================================
    // UPDATE AREA MEMBER COUNT
    // ==========================================

    if (saving.areaGroup) {

      await AreaGroup.findByIdAndUpdate(
        saving.areaGroup,
        {
          $inc: {
            totalMembers: -1
          }
        }
      );

    }

    // ==========================================
    // UPDATE AGENT MEMBER COUNT
    // ==========================================

    if (saving.assignedAgent) {

      await DailyAgent.findByIdAndUpdate(
        saving.assignedAgent,
        {
          $inc: {
            totalMembers: -1
          }
        }
      );

    }

    res.status(200).json({

      success: true,

      message:
        "Daily Saving Account Terminated Successfully",

      saving

    });

  } catch (error) {

    console.error(
      "TERMINATE SAVING ERROR:",
      error
    );

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
exports.getSavingAccounts = async (req, res) => {

  try {

    const filter = req.query.filter || "ALL";

    const today = new Date();
    today.setHours(0,0,0,0);

    let query = {};

    if (filter === "COMPLETED") {

      query.endDate = {
        $lt: today
      };

    }

    else if (filter === "7DAYS") {

      const end = new Date(today);
      end.setDate(end.getDate() + 7);

      query.endDate = {
        $gte: today,
        $lte: end
      };

    }

    else if (filter === "15DAYS") {

      const end = new Date(today);
      end.setDate(end.getDate() + 15);

      query.endDate = {
        $gte: today,
        $lte: end
      };

    }

    else if (filter === "30DAYS") {

      const end = new Date(today);
      end.setDate(end.getDate() + 30);

      query.endDate = {
        $gte: today,
        $lte: end
      };

    }

    else if (filter === "MONTH") {

      const firstDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      );

      const lastDay = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0
      );

      query.endDate = {
        $gte: firstDay,
        $lte: lastDay
      };

    }

    const accounts =
      await DailySaving.find(query)
      .populate("member")
      .populate("assignedAgent","name")
      .populate("areaGroup","areaName")
      .sort({
        endDate:1
      });

    res.json({

      success:true,

      accounts

    });

  }

  catch(error){

    res.status(500).json({

      success:false,

      message:error.message

    });

  }

};