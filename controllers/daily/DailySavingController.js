
const mongoose = require("mongoose");
const DailySaving =
  require("../../models/daily/DailySaving");

const DailyMember =
  require("../../models/daily/DailyMember");

const DailyTransaction =
  require("../../models/daily/DailyTransaction");

const DailyAgent =
  require("../../models/daily/Agent");

const AreaGroup =
  require("../../models/daily/AreaGroup");
const DailySavingRequest =
  require("../../models/daily/DailySavingRequest");

// =====================================================
// IST DATE HELPERS
// =====================================================

function getISTDateKey(dateValue) {

  const parts =
    new Intl.DateTimeFormat(
      "en-IN",
      {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }
    ).formatToParts(
      new Date(dateValue)
    );

  const values = {};

  for (const part of parts) {

    if (
      part.type !== "literal"
    ) {

      values[part.type] =
        part.value;

    }

  }

  return (
    `${values.year}-${values.month}-${values.day}`
  );

}


// =====================================================
// ADD DAYS TO YYYY-MM-DD
// =====================================================

function addDaysToDateKey(
  dateKey,
  days
) {

  const [
    year,
    month,
    day
  ] =
    dateKey
      .split("-")
      .map(Number);

  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    );

  date.setUTCDate(
    date.getUTCDate() + days
  );

  return date
    .toISOString()
    .slice(0, 10);

}


// =====================================================
// CONVERT IST DATE KEY TO REAL DATE
// Example:
// 2026-08-31
// -> 2026-08-30T18:30:00.000Z
// =====================================================

function istDateKeyToDate(
  dateKey
) {

  return new Date(
    `${dateKey}T00:00:00+05:30`
  );

}

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
   const activeSavings = await DailySaving.find({
  member: member._id,
  status: "ACTIVE"
})
  .populate("areaGroup", "areaName")
  .populate("assignedAgent", "name");

    res.status(200).json({
  success: true,
  member,
  hasSaving: activeSavings.length > 0,
  savings: activeSavings
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


//request 

/*
=====================================================
AGENT CREATE DAILY SAVING REQUEST
=====================================================
*/

exports.createSavingRequest = async (req, res) => {
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
      nomineeName,
      nomineeMobile
    } = req.body;

    // ==========================================
    // GET AGENT ID
    // ==========================================

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

    // Check valid MongoDB Agent ID
    if (!mongoose.Types.ObjectId.isValid(agentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Agent ID"
      });
    }

    // Check agent actually exists
    const agent = await DailyAgent.findById(agentId);

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: "Agent not found"
      });
    }

    // ==========================================
    // VALIDATION
    // ==========================================

    if (!member) {
      return res.status(400).json({
        success: false,
        message: "Member is required"
      });
    }

    if (!mongoose.Types.ObjectId.isValid(member)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Member ID"
      });
    }

    if (!areaGroup) {
      return res.status(400).json({
        success: false,
        message: "Area Group is required"
      });
    }

    if (!mongoose.Types.ObjectId.isValid(areaGroup)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Area Group ID"
      });
    }

    if (!collectionType) {
      return res.status(400).json({
        success: false,
        message: "Collection Type is required"
      });
    }

    if (!["FIXED", "FLEXIBLE"].includes(collectionType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Collection Type"
      });
    }

    if (!durationDays || Number(durationDays) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Duration must be greater than 0"
      });
    }

    if (!startDate) {
      return res.status(400).json({
        success: false,
        message: "Start Date is required"
      });
    }

    // ==========================================
    // CHECK FIXED AMOUNT
    // ==========================================

    if (
      collectionType === "FIXED" &&
      (!fixedAmount || Number(fixedAmount) <= 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Fixed Amount must be greater than 0"
      });
    }

    // ==========================================
    // CHECK MEMBER
    // ==========================================

    const memberData =
      await DailyMember.findById(member);

    if (!memberData) {
      return res.status(404).json({
        success: false,
        message: "Member Not Found"
      });
    }

    if (memberData.status !== "ACTIVE") {
      return res.status(400).json({
        success: false,
        message:
          "Only ACTIVE registered members can create a saving account"
      });
    }

    // ==========================================
    // CHECK AREA
    // ==========================================

    const area =
      await AreaGroup.findById(areaGroup);

    if (!area) {
      return res.status(404).json({
        success: false,
        message: "Area Group Not Found"
      });
    }

    // ==========================================
    // CHECK START DATE
    // ==========================================

    const start = new Date(startDate);

    if (Number.isNaN(start.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid Start Date"
      });
    }

    // ==========================================
    // CALCULATE END DATE
    // ==========================================

    const endDate = new Date(start);

    endDate.setDate(
      endDate.getDate() +
      Number(durationDays) - 1
    );

    // ==========================================
    // CREATE REQUEST
    // ==========================================

    const request =
      await DailySavingRequest.create({

        member: memberData._id,

        nomineeName:
          nomineeName || "",

        nomineeMobile:
          nomineeMobile || "",

        areaGroup: area._id,

        requestedBy: agent._id,

        collectionType,

        fixedAmount:
          collectionType === "FIXED"
            ? Number(fixedAmount || 0)
            : 0,

        durationDays:
          Number(durationDays),

        startDate: start,

        endDate,

        graceDays:
          Number(graceDays || 0),

        penaltyType:
          penaltyType || "PERCENTAGE",

        penaltyValue:
          Number(penaltyValue || 0),

        status: "PENDING"
      });

    // ==========================================
    // RESPONSE
    // ==========================================

    return res.status(201).json({
      success: true,
      message:
        "Daily Saving Request Submitted Successfully. Waiting for Admin Approval.",
      request
    });

  } catch (error) {

    console.error(
      "CREATE SAVING REQUEST ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to create saving request."
    });
  }
};
/*
=====================================================
ADMIN GET ALL PENDING SAVING REQUESTS
=====================================================
*/

exports.getSavingRequests = async (req, res) => {
  try {

    const requests =
      await DailySavingRequest.find({
        status: "PENDING"
      })
        .populate(
          "member",
          "memberId memberName mobile fatherName city state"
        )
        .populate(
          "areaGroup",
          "areaName"
        )
        .populate(
          "requestedBy",
          "name mobile"
        )
        .sort({
          createdAt: -1
        });

    res.status(200).json({
      success: true,
      count: requests.length,
      requests
    });

  } catch (error) {

    console.error(
      "GET SAVING REQUESTS ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


/*
=====================================================
AGENT GET OWN SAVING REQUESTS
=====================================================
*/

exports.getSavingRequestsByAgent = async (
  req,
  res
) => {
  try {

    const { agentId } = req.params;

    if (!agentId) {
      return res.status(400).json({
        success: false,
        message: "Agent ID is required"
      });
    }

    const requests =
      await DailySavingRequest.find({
        requestedBy: agentId
      })
        .populate(
          "member",
          "memberId memberName mobile"
        )
        .populate(
          "areaGroup",
          "areaName"
        )
        .sort({
          createdAt: -1
        });

    res.status(200).json({
      success: true,
      count: requests.length,
      requests
    });

  } catch (error) {

    console.error(
      "GET AGENT SAVING REQUESTS ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


/*
=====================================================
ADMIN APPROVE SAVING REQUEST
=====================================================
*/

exports.approveSavingRequest = async (
  req,
  res
) => {
  try {

    const request =
      await DailySavingRequest.findById(
        req.params.id
      );

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Saving Request Not Found"
      });
    }

    if (request.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message:
          "This saving request has already been processed"
      });
    }

    // ==========================================
    // RECHECK MEMBER
    // ==========================================

    const member =
      await DailyMember.findById(
        request.member
      );

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member Not Found"
      });
    }
if (member.status !== "ACTIVE") {
  return res.status(400).json({
    success: false,
    message: "Only ACTIVE registered members can have a saving account approved"
  });
}

    // ==========================================
    // CREATE REAL SAVING ACCOUNT
    // ==========================================

    const saving =
      await DailySaving.create({

        member: request.member,

        nomineeName:
          request.nomineeName || "",

        nomineeMobile:
          request.nomineeMobile || "",

        areaGroup:
          request.areaGroup,

        // IMPORTANT:
        // Agent who submitted the request
        assignedAgent:
          request.requestedBy,

        collectionType:
          request.collectionType,

        fixedAmount:
          request.collectionType === "FIXED"
            ? Number(request.fixedAmount || 0)
            : 0,

        durationDays:
          Number(request.durationDays),

        startDate:
          request.startDate,

        endDate:
          request.endDate,

        graceDays:
          Number(request.graceDays || 0),

        penaltyType:
          request.penaltyType || "PERCENTAGE",

        penaltyValue:
          Number(request.penaltyValue || 0),

        status: "ACTIVE"
      });

    // ==========================================
    // UPDATE AREA COUNT
    // ==========================================

    await AreaGroup.findByIdAndUpdate(
      request.areaGroup,
      {
        $inc: {
          totalMembers: 1
        }
      }
    );

    // ==========================================
    // UPDATE AGENT COUNT
    // ==========================================

    await DailyAgent.findByIdAndUpdate(
      request.requestedBy,
      {
        $inc: {
          totalMembers: 1
        }
      }
    );

    // ==========================================
    // UPDATE REQUEST
    // ==========================================

    request.status = "APPROVED";

    request.approvedBy =
      req.user?._id ||
      req.user?.id ||
      null;

    request.approvedAt = new Date();

    await request.save();

    res.status(200).json({
      success: true,
      message:
        "Daily Saving Request Approved Successfully",
      saving
    });

  } catch (error) {

    console.error(
      "APPROVE SAVING REQUEST ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


/*
=====================================================
ADMIN REJECT SAVING REQUEST
=====================================================
*/

exports.rejectSavingRequest = async (
  req,
  res
) => {
  try {

    const request =
      await DailySavingRequest.findById(
        req.params.id
      );

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Saving Request Not Found"
      });
    }

    if (request.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message:
          "This saving request has already been processed"
      });
    }

    request.status = "REJECTED";

    request.rejectedBy =
      req.user?._id ||
      req.user?.id ||
      null;

    request.rejectedAt = new Date();

    request.rejectionReason =
      req.body.rejectionReason ||
      "Rejected by Admin";

    await request.save();

    res.status(200).json({
      success: true,
      message:
        "Daily Saving Request Rejected Successfully",
      request
    });

  } catch (error) {

    console.error(
      "REJECT SAVING REQUEST ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};