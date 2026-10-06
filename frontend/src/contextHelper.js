// Mirrors backend/v3/context.py to provide instant client-side context gating

export const ALWAYS_DOMAINS = ["androgen", "metabolic", "mental", "sleep"];

export function deriveContext(p = {}) {
  const uterus = p.uterus || "unsure"; // yes | no | unsure
  const ovaries = p.ovaries || null; // both | one | neither | unsure | null
  const meno = p.menopause_status || "none"; // none | perimenopause | natural | surgical | unknown
  const goal = p.reproductive_goal || "prefer_not_to_say";
  const hormonal = Boolean(p.on_hormonal_contraception) || Boolean(p.on_hrt);
  const followUps = [];
  const notes = [];

  if (uterus === "unsure") {
    followUps.push("confirm_uterus_status");
  }
  if (uterus === "no" && (!ovaries || ovaries === "unsure")) {
    followUps.push("confirm_ovary_status");
  }

  let ovarian = "unknown";
  if (ovaries === "neither") {
    ovarian = "absent";
  } else if (ovaries === "both" || ovaries === "one") {
    ovarian = "present";
  } else if (uterus === "yes") {
    ovarian = "presumed_present";
  }

  let effectiveMeno = meno;
  if (ovarian === "absent" && (meno === "none" || meno === "unknown")) {
    effectiveMeno = "surgical";
    notes.push(
      "Both ovaries removed: this is a different hormonal context (surgical menopause pathway)."
    );
  }

  let cycle = "applicable";
  if (uterus === "no") {
    cycle = "not_applicable";
    notes.push(
      "Cycle tracking isn't applicable to your current situation. We'll focus on the health domains that are relevant to you."
    );
  } else if (uterus === "unsure") {
    cycle = "uncertain";
  } else if (effectiveMeno === "natural" || effectiveMeno === "surgical") {
    cycle = "not_applicable";
  } else if (hormonal) {
    cycle = "unreliable_on_hormones";
    notes.push(
      "Hormonal medication can mask your natural cycle, so bleeding is a weak signal for you."
    );
  } else {
    cycle = "applicable";
  }

  const domains = [...ALWAYS_DOMAINS];
  if (cycle === "applicable" || cycle === "unreliable_on_hormones") {
    domains.unshift("menstrual");
  }
  if (
    uterus === "yes" &&
    ovarian !== "absent" &&
    (effectiveMeno === "none" || effectiveMeno === "perimenopause") &&
    ["trying", "later", "fertility_concerns"].includes(goal)
  ) {
    domains.push("fertility");
  }
  const age = Number(p.age) || 0;
  if (
    ["perimenopause", "natural", "surgical"].includes(effectiveMeno) ||
    age >= 45
  ) {
    domains.push("menopause_bone_cv");
  }

  return {
    uterus,
    ovarian_status: ovarian,
    effective_menopause: effectiveMeno,
    cycle_tracking: cycle,
    applicable_domains: domains,
    follow_up_questions: followUps,
    notes,
    postmenopausal: effectiveMeno === "natural" || effectiveMeno === "surgical",
  };
}
