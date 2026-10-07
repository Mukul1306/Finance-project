const PenaltyPolicy = require("../../models/daily/PenaltyPolicy");

const DEFAULT_RULE = {
  enabled: true,
  penaltyType: "PERCENTAGE",
  penaltyValue: 0,
  gracePeriod: 0,
  maxPenalty: 0,
};

// =====================================================
// CLEAN RULE
// =====================================================

function cleanRule(rule = {}) {
  return {
    enabled: rule.enabled !== false,

    penaltyType:
      rule.penaltyType === "FIXED"
        ? "FIXED"
        : "PERCENTAGE",

    penaltyValue: Math.max(
      0,
      Number(rule.penaltyValue || 0)
    ),

    gracePeriod: Math.max(
      0,
      Number(rule.gracePeriod || 0)
    ),

    maxPenalty: Math.max(
      0,
      Number(rule.maxPenalty || 0)
    ),
  };
}

// =====================================================
// GET CENTRAL POLICY
// =====================================================

async function getPenaltyPolicy() {
  let policy = await PenaltyPolicy.findOne();

  if (!policy) {
    policy = await PenaltyPolicy.create({
      loan: DEFAULT_RULE,
      dailySaving: DEFAULT_RULE,
      memberOverrides: [],
    });
  }

  return policy;
}

// =====================================================
// GET EFFECTIVE POLICY FOR MEMBER
// =====================================================

async function getEffectivePenaltyRule(
  memberId,
  type
) {
  const policy = await getPenaltyPolicy();

  const memberKey = String(memberId || "");

  // Specific member policy has priority
  const override = (policy.memberOverrides || [])
    .filter((item) => {
      const applies =
        item.appliesTo === "BOTH" ||
        item.appliesTo === type;

      return (
        applies &&
        String(item.member) === memberKey
      );
    })
    .sort(
      (a, b) =>
        new Date(b.updatedAt || 0) -
        new Date(a.updatedAt || 0)
    )[0];

  if (override) {
    return cleanRule(override);
  }

  // Otherwise global policy
  if (type === "LOAN") {
    return cleanRule(policy.loan);
  }

  return cleanRule(policy.dailySaving);
}

// =====================================================
// APPLY POLICY TO NEW ACCOUNT
// =====================================================

async function applyPenaltyRuleToNewAccount({
  memberId,
  type,
  account,
}) {
  const rule =
    await getEffectivePenaltyRule(
      memberId,
      type
    );

  account.autoPenalty =
    rule.enabled;

  if (type === "LOAN") {
    account.gracePeriod =
      rule.gracePeriod;
  } else {
    account.graceDays =
      rule.gracePeriod;
  }

  account.penaltyType =
    rule.penaltyType;

  account.penaltyValue =
    rule.penaltyValue;

  account.maxPenalty =
    rule.maxPenalty;

  return account;
}

module.exports = {
  getPenaltyPolicy,
  getEffectivePenaltyRule,
  applyPenaltyRuleToNewAccount,
};