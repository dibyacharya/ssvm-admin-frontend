import React, { useEffect, useMemo, useRef, useState } from "react";
import { Plus, RefreshCw, Save, X } from "lucide-react";
import {
  createCourse,
  getCoursesForSemester,
  lookupCourseByCode,
  unlinkCourseFromSemester,
  updateCourseTeachers,
} from "../../services/courses.service";
import { getTeachers } from "../../services/user.service";
import {
  getSemesterCourseAssignment,
  updateSemesterCourseAssignment,
} from "../../services/program.service";
import { safeCredits, safeDisplay } from "../../utils/nullSafety";
import { getPeriodLabel } from "../../utils/periodLabel";

const roleOptions = [
  "Teacher",
  "Assistant Teacher",
  "SME",
  "Associate / Co-Teacher",
];

const PICK_RULE_ANY_ONE = "ANY_ONE";
const PICK_RULE_ANY_N = "ANY_N";
const PICK_RULE_ALL = "ALL";

const ELECTIVE_MODE_BASKET = "BASKET";

const emptyCourseAssignment = {
  compulsory_count: 0,
  elective_slot_count: 0,
  compulsory_credit_target: null,
  elective_credit_target: null,
  credit_target_total: null,
  enforce_credit_target: false,
  compulsoryCourseIds: [],
  electiveConfig: {
    mode: ELECTIVE_MODE_BASKET,
    electiveCount: 0,
    derivedElectiveCount: 0,
    baskets: [],
    tracks: [],
  },
  electiveBaskets: [],
  electiveTotalRequired: 0,
};

const normalizeId = (v) => (v == null ? "" : String(v));

const emptyAssignmentDraft = {
  structure: {
    compulsory_count: 0,
    elective_slot_count: 0,
    compulsory_credit_target: null,
    elective_credit_target: null,
    credit_target_total: null,
    enforce_credit_target: false,
  },
  compulsorySlots: [],
  electiveBlocks: [],
};

const toIdString = (value) => {
  if (!value) return "";
  // Accept common ID wrappers (e.g. `{ _id: ... }` or `{ $oid: ... }`).
  const raw =
    typeof value === "object" && value._id
      ? value._id
      : typeof value === "object" && value.$oid
      ? value.$oid
      : value;
  return normalizeId(raw);
};

const toNonNegativeInt = (value, fallback = 0) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
};

const toBooleanFlag = (value, fallback = false) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off", ""].includes(normalized)) return false;
  }
  return fallback;
};

const clampPickN = (value, optionsLength, fallback = 1) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, Math.max(optionsLength, 1));
};

const sanitizeBasket = (basket = {}, index = 0) => {
  const options = Array.from(
    new Set(
      (Array.isArray(basket.options) ? basket.options : basket.optionCourseIds || [])
        .map((value) => toIdString(value))
        .filter(Boolean)
    )
  );

  let pickRule = (basket.pickRule || "").toString().toUpperCase();
  if (![PICK_RULE_ANY_ONE, PICK_RULE_ANY_N, PICK_RULE_ALL].includes(pickRule)) {
    const legacyRuleType = (basket.ruleType || "").toString().toUpperCase();
    const legacyPick = Number.parseInt(basket.pickCount, 10);
    if (legacyRuleType === PICK_RULE_ALL) {
      pickRule = PICK_RULE_ALL;
    } else if (Number.isFinite(legacyPick) && legacyPick > 1) {
      pickRule = PICK_RULE_ANY_N;
    } else {
      pickRule = PICK_RULE_ANY_ONE;
    }
  }

  let pickN = null;
  if (pickRule === PICK_RULE_ANY_N) {
    const parsed = Number.parseInt(basket.pickN ?? basket.pickCount, 10);
    pickN =
      Number.isFinite(parsed) && parsed > 0
        ? Math.min(parsed, Math.max(options.length, 1))
        : 1;
  }

  if (pickRule === PICK_RULE_ANY_ONE) {
    pickN = 1;
  }

  return {
    basketId: basket.basketId || `elective-slot-${index + 1}`,
    name: (basket.name || "").toString(),
    pickRule,
    pickN: pickRule === PICK_RULE_ANY_N ? pickN : null,
    options,
  };
};

const sanitizeDraft = (draft) => {
  const source = draft && typeof draft === "object" ? draft : emptyAssignmentDraft;
  const structureSource =
    source.structure && typeof source.structure === "object" ? source.structure : {};
  const compulsory_count = toNonNegativeInt(structureSource.compulsory_count, 0);
  const elective_slot_count = toNonNegativeInt(structureSource.elective_slot_count, 0);
  const compulsory_credit_targetRaw = structureSource.compulsory_credit_target;
  const compulsory_credit_target =
    compulsory_credit_targetRaw === null ||
    compulsory_credit_targetRaw === undefined ||
    compulsory_credit_targetRaw === ""
      ? null
      : toNonNegativeInt(compulsory_credit_targetRaw, null);
  const elective_credit_targetRaw = structureSource.elective_credit_target;
  const elective_credit_target =
    elective_credit_targetRaw === null ||
    elective_credit_targetRaw === undefined ||
    elective_credit_targetRaw === ""
      ? null
      : toNonNegativeInt(elective_credit_targetRaw, null);
  const credit_target_totalRaw = structureSource.credit_target_total;
  const credit_target_total =
    credit_target_totalRaw === null ||
    credit_target_totalRaw === undefined ||
    credit_target_totalRaw === ""
      ? null
      : toNonNegativeInt(credit_target_totalRaw, null);
  const enforce_credit_target = false;

  const compulsorySlotsSource = Array.isArray(source.compulsorySlots) ? source.compulsorySlots : [];
  const electiveBlocksSource = Array.isArray(source.electiveBlocks) ? source.electiveBlocks : [];

  // Normalize compulsory slots to fixed size and ensure duplicates are removed (keep first).
  const seenCompulsory = new Set();
  const compulsorySlots = Array.from({ length: compulsory_count }, (_, index) => {
    const slot = compulsorySlotsSource[index] || {};
    const slotId = slot.slotId || `comp-${index + 1}`;
    const courseId = toIdString(slot.courseId);
    if (courseId && seenCompulsory.has(courseId)) {
      return { slotId, courseId: "" };
    }
    if (courseId) seenCompulsory.add(courseId);
    return { slotId, courseId };
  });
  const compulsorySet = new Set(
    compulsorySlots.map((slot) => toIdString(slot.courseId)).filter(Boolean)
  );

  // Normalize elective blocks to fixed size and enforce disjointness + cross-slot uniqueness.
  const seenElective = new Set();
  const electiveBlocks = Array.from({ length: elective_slot_count }, (_, index) => {
    const sourceBlock = electiveBlocksSource[index] || {};
    const slotBasket = sanitizeBasket(
      {
        ...buildFixedBasket(index),
        basketId: sourceBlock.blockId || sourceBlock.basketId,
        name: sourceBlock.name,
        pickRule: sourceBlock.rule || sourceBlock.pickRule,
        pickN: sourceBlock.pickN,
        options: sourceBlock.options,
      },
      index
    );

    let pickRule = slotBasket.pickRule;
    if (![PICK_RULE_ANY_ONE, PICK_RULE_ANY_N, PICK_RULE_ALL].includes(pickRule)) {
      pickRule = PICK_RULE_ANY_ONE;
    }

    const options = [];
    (slotBasket.options || []).forEach((optionId) => {
      const normalizedOptionId = toIdString(optionId);
      if (!normalizedOptionId) return;
      if (compulsorySet.has(normalizedOptionId)) return;
      if (seenElective.has(normalizedOptionId)) return;
      seenElective.add(normalizedOptionId);
      options.push(normalizedOptionId);
    });

    const optionsLength = options.length;
    const pickN =
      pickRule === PICK_RULE_ANY_N
        ? clampPickN(sourceBlock.pickN ?? slotBasket.pickN, optionsLength, 1)
        : null;

    return {
      blockId: sourceBlock.blockId || slotBasket.basketId || `elec-${index + 1}`,
      name: slotBasket.name || `Elective Course ${index + 1}`,
      rule: pickRule,
      pickN,
      options,
    };
  });

  return {
    structure: {
      compulsory_count,
      elective_slot_count,
      compulsory_credit_target,
      elective_credit_target,
      credit_target_total,
      enforce_credit_target,
    },
    compulsorySlots,
    electiveBlocks,
  };
};

const draftToAssignmentPayload = (draft) => {
  const normalizedDraft = sanitizeDraft(draft);
  const compulsoryCourseIds = normalizedDraft.compulsorySlots
    .map((slot) => toIdString(slot.courseId))
    .filter(Boolean);
  const baskets = normalizedDraft.electiveBlocks.map((block, index) => ({
    basketId: `elective-slot-${index + 1}`,
    name: block.name || `Elective Course ${index + 1}`,
    pickRule: block.rule,
    pickN: block.rule === PICK_RULE_ANY_N ? clampPickN(block.pickN, block.options.length, 1) : null,
    options: (block.options || []).map((id) => toIdString(id)).filter(Boolean),
  }));

  return normalizeCourseAssignment({
    compulsory_count: normalizedDraft.structure.compulsory_count,
    elective_slot_count: normalizedDraft.structure.elective_slot_count,
    compulsory_credit_target: normalizedDraft.structure.compulsory_credit_target,
    elective_credit_target: normalizedDraft.structure.elective_credit_target,
    credit_target_total: normalizedDraft.structure.credit_target_total,
    enforce_credit_target: normalizedDraft.structure.enforce_credit_target,
    compulsoryCourseIds,
    electiveConfig: {
      mode: ELECTIVE_MODE_BASKET,
      baskets,
      tracks: [],
    },
  });
};

const assignmentToDraft = (assignment) => {
  const normalized = normalizeCourseAssignment(assignment);
  const compulsorySlots = Array.from({ length: normalized.compulsory_count }, (_, index) => ({
    slotId: `comp-${index + 1}`,
    courseId: toIdString(normalized.compulsoryCourseIds?.[index] || ""),
  }));

  const baskets = ensureFixedBasketSlots(
    normalized.electiveConfig?.baskets || [],
    normalized.elective_slot_count
  );
  const electiveBlocks = baskets.map((basket, index) => ({
    blockId: basket.basketId || `elec-${index + 1}`,
    name: basket.name || `Elective Course ${index + 1}`,
    rule: basket.pickRule,
    pickN: basket.pickRule === PICK_RULE_ANY_N ? clampPickN(basket.pickN, basket.options.length, 1) : null,
    options: (basket.options || []).map((id) => toIdString(id)).filter(Boolean),
  }));

  return sanitizeDraft({
    structure: {
      compulsory_count: normalized.compulsory_count,
      elective_slot_count: normalized.elective_slot_count,
      compulsory_credit_target: normalized.compulsory_credit_target,
      elective_credit_target: normalized.elective_credit_target,
      credit_target_total: normalized.credit_target_total,
      enforce_credit_target: normalized.enforce_credit_target,
    },
    compulsorySlots,
    electiveBlocks,
  });
};

const pruneDraftByCourses = (draft, courses) => {
  const normalizedDraft = sanitizeDraft(draft);
  const validCourseIds = new Set((courses || []).map((course) => toIdString(course?._id)).filter(Boolean));

  const compulsorySlots = (normalizedDraft.compulsorySlots || []).map((slot, index) => {
    const slotId = slot.slotId || `comp-${index + 1}`;
    const courseId = toIdString(slot.courseId);
    if (!courseId) return { slotId, courseId: "" };
    return { slotId, courseId: validCourseIds.has(courseId) ? courseId : "" };
  });

  const compulsorySet = new Set(compulsorySlots.map((slot) => slot.courseId).filter(Boolean));
  const seenElective = new Set();
  const electiveBlocks = (normalizedDraft.electiveBlocks || []).map((block, index) => {
    const options = [];
    (block.options || []).forEach((optionId) => {
      const id = toIdString(optionId);
      if (!id) return;
      if (!validCourseIds.has(id)) return;
      if (compulsorySet.has(id)) return;
      if (seenElective.has(id)) return;
      seenElective.add(id);
      options.push(id);
    });
    const pickN =
      block.rule === PICK_RULE_ANY_N ? clampPickN(block.pickN, options.length, 1) : null;
    return {
      blockId: block.blockId || `elec-${index + 1}`,
      name: block.name || `Elective Course ${index + 1}`,
      rule: block.rule || PICK_RULE_ANY_ONE,
      pickN,
      options,
    };
  });

  return sanitizeDraft({
    structure: normalizedDraft.structure,
    compulsorySlots,
    electiveBlocks,
  });
};

const buildFixedBasket = (index) =>
  sanitizeBasket(
    {
      basketId: `elective-slot-${index + 1}`,
      name: `Elective Course ${index + 1}`,
      pickRule: PICK_RULE_ANY_ONE,
      pickN: 1,
      options: [],
    },
    index
  );

const ensureFixedBasketSlots = (baskets = [], slotCount = 0) => {
  const totalSlots = toNonNegativeInt(slotCount, 0);
  const incoming = Array.isArray(baskets) ? baskets : [];

  return Array.from({ length: totalSlots }, (_, index) => {
    const fixed = buildFixedBasket(index);
    const source = incoming[index] || {};
    const merged = sanitizeBasket(
      {
        ...fixed,
        ...source,
        basketId: source.basketId || fixed.basketId,
        name: source.name || fixed.name,
      },
      index
    );
    return {
      ...merged,
      name: merged.name || fixed.name,
    };
  });
};

const getBasketPickTotal = (basket = {}) => {
  const optionsCount = (basket.options || []).length;
  if (basket.pickRule === PICK_RULE_ALL) return optionsCount;
  if (basket.pickRule === PICK_RULE_ANY_N) {
    const pickN = Number(basket.pickN) || 1;
    return Math.min(pickN, optionsCount);
  }
  return optionsCount > 0 ? 1 : 0;
};

const mapBasketsToLegacy = (baskets = []) =>
  baskets.map((basket) => ({
    basketId: basket.basketId,
    name: basket.name,
    ruleType: basket.pickRule === PICK_RULE_ALL ? PICK_RULE_ALL : PICK_RULE_ANY_N,
    pickCount: getBasketPickTotal(basket),
    optionCourseIds: basket.options,
  }));

const normalizeCourseAssignment = (input) => {
  const source = input && typeof input === "object" ? input : {};
  const structure = source.structure && typeof source.structure === "object" ? source.structure : {};

  const compulsory_count = toNonNegativeInt(
    source.compulsory_count ?? structure.compulsory_count ?? source.compulsoryCount ?? structure.compulsoryCount,
    0
  );
  const elective_slot_count = toNonNegativeInt(
    source.elective_slot_count ?? structure.elective_slot_count ?? source.electiveSlotCount ?? structure.electiveSlotCount,
    0
  );

  const rawCompulsoryCreditTarget =
    source.compulsory_credit_target ??
    structure.compulsory_credit_target ??
    source.compulsoryCreditTarget ??
    structure.compulsoryCreditTarget;
  const compulsory_credit_target =
    rawCompulsoryCreditTarget === null ||
    rawCompulsoryCreditTarget === undefined ||
    rawCompulsoryCreditTarget === ""
      ? null
      : toNonNegativeInt(rawCompulsoryCreditTarget, null);

  const rawElectiveCreditTarget =
    source.elective_credit_target ??
    structure.elective_credit_target ??
    source.electiveCreditTarget ??
    structure.electiveCreditTarget;
  const elective_credit_target =
    rawElectiveCreditTarget === null ||
    rawElectiveCreditTarget === undefined ||
    rawElectiveCreditTarget === ""
      ? null
      : toNonNegativeInt(rawElectiveCreditTarget, null);

  const rawCreditTarget =
    source.credit_target_total ??
    structure.credit_target_total ??
    source.creditTargetTotal ??
    structure.creditTargetTotal;
  let credit_target_total =
    rawCreditTarget === null || rawCreditTarget === undefined || rawCreditTarget === ""
      ? null
      : toNonNegativeInt(rawCreditTarget, null);

  const enforce_credit_target = toBooleanFlag(
    source.enforce_credit_target ??
      structure.enforce_credit_target ??
      source.enforceCreditTarget ??
      structure.enforceCreditTarget,
    false
  );

  const compulsoryCourseIds = Array.from(
    new Set(
      (Array.isArray(source.compulsoryCourseIds) ? source.compulsoryCourseIds : [])
        .map((value) => toIdString(value))
        .filter(Boolean)
    )
  );

  const rawConfig =
    source.electiveConfig && typeof source.electiveConfig === "object"
      ? source.electiveConfig
      : {};

  const incomingBaskets = (
    Array.isArray(rawConfig.baskets)
      ? rawConfig.baskets
      : Array.isArray(source.electiveBaskets)
      ? source.electiveBaskets
      : []
  ).map((basket, index) => sanitizeBasket(basket, index));

  const baskets = ensureFixedBasketSlots(incomingBaskets, elective_slot_count);

  const derivedElectiveCount =
    baskets.reduce((sum, basket) => sum + getBasketPickTotal(basket), 0);

  return {
    compulsory_count,
    elective_slot_count,
    compulsory_credit_target,
    elective_credit_target,
    credit_target_total,
    enforce_credit_target,
    compulsoryCourseIds,
    electiveConfig: {
      mode: ELECTIVE_MODE_BASKET,
      baskets,
      tracks: [],
      electiveCount: derivedElectiveCount,
      derivedElectiveCount,
    },
    electiveBaskets: mapBasketsToLegacy(baskets),
    electiveTotalRequired: derivedElectiveCount,
  };
};

const parseFiniteNumber = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const getCourseCredits = (course) => {
  if (!course || typeof course !== "object") return 0;

  const creditPoints = course.creditPoints || course.creditPoint || course.creditpoints;
  if (creditPoints && typeof creditPoints === "object") {
    const totalCredits = parseFiniteNumber(
      creditPoints.totalCredits ??
        creditPoints.totalCredit ??
        creditPoints.total ??
        creditPoints.C ??
        creditPoints.c
    );
    if (totalCredits !== null) return Math.max(0, totalCredits);

    const lecture = parseFiniteNumber(
      creditPoints.lecture ?? creditPoints.L ?? creditPoints.l
    );
    const tutorial = parseFiniteNumber(
      creditPoints.tutorial ?? creditPoints.T ?? creditPoints.t
    );
    const practical = parseFiniteNumber(
      creditPoints.practical ?? creditPoints.P ?? creditPoints.p
    );
    if (lecture !== null || tutorial !== null || practical !== null) {
      return Math.max(0, (lecture || 0) + (tutorial || 0) + (practical || 0));
    }
  }

  const ltp = course.ltp || course.LTPC || course.LTP;
  if (ltp && typeof ltp === "object") {
    const totalCredits = parseFiniteNumber(ltp.C ?? ltp.c);
    if (totalCredits !== null) return Math.max(0, totalCredits);
    const lecture = parseFiniteNumber(ltp.lecture ?? ltp.L ?? ltp.l);
    const tutorial = parseFiniteNumber(ltp.tutorial ?? ltp.T ?? ltp.t);
    const practical = parseFiniteNumber(ltp.practical ?? ltp.P ?? ltp.p);
    if (lecture !== null || tutorial !== null || practical !== null) {
      return Math.max(0, (lecture || 0) + (tutorial || 0) + (practical || 0));
    }
  }

  const directCredit = parseFiniteNumber(
    course.courseCredits ??
      course.credits ??
      course.credit ??
      course.C ??
      course.c ??
      course?.LTPC?.C ??
      course?.LTPC?.c ??
      course?.ltp?.C ??
      course?.ltp?.c
  );
  if (directCredit !== null) return Math.max(0, directCredit);

  return 0;
};

const sumCourseCredits = (course) => getCourseCredits(course);

const getCourseDisplayLabel = (courseId, courseLabelMap) =>
  courseLabelMap.get(courseId) || courseId;

const buildElectiveUsageMap = (baskets = []) => {
  const usageMap = new Map();
  (baskets || []).forEach((basket, basketIndex) => {
    (basket.options || []).forEach((courseId) => {
      const normalizedCourseId = toIdString(courseId);
      if (!normalizedCourseId) return;
      if (!usageMap.has(normalizedCourseId)) {
        usageMap.set(normalizedCourseId, new Set());
      }
      usageMap.get(normalizedCourseId).add(basketIndex);
    });
  });
  return usageMap;
};

const getElectiveCandidateDisableReason = ({
  courseId,
  basketIndex,
  compulsorySet,
  usageMap,
}) => {
  if (compulsorySet.has(courseId)) {
    return "Compulsory subject";
  }

  const usedInOtherSlots = Array.from(usageMap.get(courseId) || []).filter(
    (slotIndex) => slotIndex !== basketIndex
  );

  if (usedInOtherSlots.length > 0) {
    return `Already used in Elective Course ${usedInOtherSlots[0] + 1}`;
  }

  return "";
};

const getRuleExplanation = (pickRule, pickN = 1) => {
  if (pickRule === PICK_RULE_ALL) {
    return "No student choice; all these will be assigned automatically (in student portal).";
  }
  if (pickRule === PICK_RULE_ANY_N) {
    return `Student will pick exactly ${pickN || 1} from these options (in student portal).`;
  }
  return "Student will pick exactly 1 from these options (in student portal).";
};

const computeSummary = (assignment, courses) => {
  const normalized = normalizeCourseAssignment(assignment);
  const byId = new Map(
    (courses || []).map((course) => [toIdString(course?._id), sumCourseCredits(course)])
  );

  const compulsoryCredits = normalized.compulsoryCourseIds.reduce(
    (sum, courseId) => sum + (byId.get(courseId) || 0),
    0
  );

  let electiveCreditsMin = 0;
  let electiveCreditsMax = 0;
  const electiveSlotCredits = [];
  let hasRangeSlot = false;

  (normalized.electiveConfig.baskets || []).forEach((basket) => {
    const slotIndex = electiveSlotCredits.length;
    const options = (basket.options || [])
      .map((courseId) => byId.get(courseId) || 0)
      .sort((a, b) => a - b);

    if (options.length === 0) {
      electiveSlotCredits.push({
        slotIndex,
        pickRule: basket.pickRule,
        pickN: basket.pickN || 1,
        candidateCount: 0,
        minCredits: 0,
        maxCredits: 0,
        isRange: false,
      });
      return;
    }

    if (basket.pickRule === PICK_RULE_ALL) {
      const total = options.reduce((sum, value) => sum + value, 0);
      electiveCreditsMin += total;
      electiveCreditsMax += total;

      electiveSlotCredits.push({
        slotIndex,
        pickRule: basket.pickRule,
        pickN: null,
        candidateCount: options.length,
        minCredits: total,
        maxCredits: total,
        isRange: false,
      });
      return;
    }

    const pickCount =
      basket.pickRule === PICK_RULE_ANY_N
        ? Math.max(1, Math.min(Number(basket.pickN) || 1, options.length))
        : 1;

    const basketMin = options
      .slice(0, pickCount)
      .reduce((sum, value) => sum + value, 0);
    const basketMax = options
      .slice(options.length - pickCount)
      .reduce((sum, value) => sum + value, 0);

    electiveCreditsMin += basketMin;
    electiveCreditsMax += basketMax;
    const isRange = basketMin !== basketMax;
    hasRangeSlot = hasRangeSlot || isRange;

    electiveSlotCredits.push({
      slotIndex,
      pickRule: basket.pickRule,
      pickN: basket.pickRule === PICK_RULE_ANY_N ? pickCount : 1,
      candidateCount: options.length,
      minCredits: basketMin,
      maxCredits: basketMax,
      isRange,
    });
  });

  const electiveOptionsTotal =
    (normalized.electiveConfig.baskets || []).reduce(
      (sum, basket) => sum + (basket.options || []).length,
      0
    );

  const totalCreditsMin = compulsoryCredits + electiveCreditsMin;
  const totalCreditsMax = compulsoryCredits + electiveCreditsMax;
  const hasPossibleRange = hasRangeSlot || totalCreditsMin !== totalCreditsMax;
  const creditTargetValue = normalized.credit_target_total;
  const targetEnabled = Boolean(normalized.enforce_credit_target);
  const targetAchievable =
    targetEnabled && creditTargetValue !== null
      ? creditTargetValue >= totalCreditsMin && creditTargetValue <= totalCreditsMax
      : true;

  return {
    compulsoryTarget: normalized.compulsory_count,
    electiveSlotTarget: normalized.elective_slot_count,
    compulsoryCount: normalized.compulsoryCourseIds.length,
    electiveBasketCount: (normalized.electiveConfig.baskets || []).length,
    electiveOptionsTotal,
    electivePickTotal: normalized.electiveConfig.derivedElectiveCount,
    compulsoryCredits,
    electiveCreditsMin,
    electiveCreditsMax,
    electiveSlotCredits,
    totalCreditsMin,
    totalCreditsMax,
    hasPossibleRange,
    targetEnabled,
    creditTargetValue,
    targetAchievable,
  };
};

const pruneAssignmentByCourses = (assignment, courses) => {
  const normalized = normalizeCourseAssignment(assignment);
  const validCourseIds = new Set((courses || []).map((course) => toIdString(course?._id)));

  const compulsoryCourseIds = (normalized.compulsoryCourseIds || [])
    .map((id) => toIdString(id))
    .filter((id) => validCourseIds.has(id));
  const compulsorySet = new Set(compulsoryCourseIds);

  const baskets = ensureFixedBasketSlots(
    (normalized.electiveConfig.baskets || [])
    .map((basket, index) =>
      sanitizeBasket(
        {
          ...basket,
          options: (basket.options || []).filter(
            (courseId) => {
              const normalizedCourseId = toIdString(courseId);
              return (
                validCourseIds.has(normalizedCourseId) &&
                !compulsorySet.has(normalizedCourseId)
              );
            }
          ),
        },
        index
      )
    ),
    normalized.elective_slot_count
  );

  return normalizeCourseAssignment({
    ...normalized,
    compulsoryCourseIds,
    electiveConfig: { baskets },
  });
};

const extractTeachers = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.teachers)) return payload.teachers;
  if (Array.isArray(payload.users)) return payload.users;
  return [];
};

const mapFieldErrors = (details = []) => {
  if (!Array.isArray(details)) return {};
  return details.reduce((acc, item) => {
    const path = item?.path || "global";
    const message = item?.message || "Invalid value";
    if (!acc[path]) {
      acc[path] = message;
    }
    return acc;
  }, {});
};

const extractApiWarnings = (payload) =>
  Array.from(
    new Set(
      (Array.isArray(payload?.warnings) ? payload.warnings : [])
        .map((warning) => (warning ? warning.toString().trim() : ""))
        .filter(Boolean)
    )
  );

const CoursePickerModal = ({
  open,
  title,
  subtitle,
  courses,
  onClose,
  onSelect,
}) => {
  const [query, setQuery] = useState("");

  const normalizedQuery = query.trim().toLowerCase();
  const list = Array.isArray(courses) ? courses : [];
  const filtered = useMemo(() => {
    if (!normalizedQuery) return list;
    return list.filter((course) => {
      const code = (course?.courseCode || "").toString().toLowerCase();
      const name = (course?.title || "").toString().toLowerCase();
      return code.includes(normalizedQuery) || name.includes(normalizedQuery);
    });
  }, [list, normalizedQuery]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 p-4 overflow-y-auto">
      <div className="mx-auto w-full max-w-2xl rounded-lg bg-white shadow-lg">
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-4 py-3">
          <div>
            <div className="text-base font-semibold text-gray-900">{title}</div>
            {subtitle ? (
              <div className="mt-1 text-xs text-gray-500">{subtitle}</div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-4 py-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by code or course name..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="max-h-[60vh] overflow-y-auto border-t border-gray-100">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">
              No eligible courses found.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map((course) => (
                <button
                  key={toIdString(course?._id) || course?.courseCode || course?.title}
                  type="button"
                  onClick={() => onSelect(course)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900">
                      {safeDisplay(course?.courseCode)}
                    </div>
                    <div className="truncate text-xs text-gray-500">
                      {safeDisplay(course?.title)}
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-xs text-gray-400">
                    {sumCourseCredits(course)} cr
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SemesterCourseTable = ({
  semesterId,
  semesterData,
  periodTotalCredits,
  programId,
  periodType = "semester",
  hideCoursePool = false,
  onUpdate,
  onAddSemester,
}) => {
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [teachersLoading, setTeachersLoading] = useState(false);
  const [teacherLoadError, setTeacherLoadError] = useState("");

  const [loading, setLoading] = useState(false);
  const [courseError, setCourseError] = useState("");
  const [savingCourse, setSavingCourse] = useState(false);

  const [addMode, setAddMode] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [existingCourse, setExistingCourse] = useState(null);
  const [draft, setDraft] = useState({
    courseType: "theory",
    title: "",
    courseCode: "",
    creditLecture: "0",
    creditTutorial: "0",
    creditPractical: "0",
    teacherAssignments: [],
  });

  const [teacherAssignments, setTeacherAssignments] = useState({});

  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [assignmentSaving, setAssignmentSaving] = useState(false);
  const [assignmentError, setAssignmentError] = useState("");
  const [assignmentNotice, setAssignmentNotice] = useState("");
  const [assignmentFieldErrors, setAssignmentFieldErrors] = useState({});
  const [assignmentDraft, setAssignmentDraft] = useState(emptyAssignmentDraft);
  const [structureDraft, setStructureDraft] = useState({
    compulsory_count: 0,
    elective_slot_count: 0,
    compulsory_credit_target: "",
    elective_credit_target: "",
    credit_target_total: "",
    enforce_credit_target: false,
  });
  const [assignmentSource, setAssignmentSource] = useState("");
  const blockedElectiveToggleRef = useRef(null);
  const [coursePicker, setCoursePicker] = useState(null);
  const [pendingAssignTarget, setPendingAssignTarget] = useState(null);

  const periodLabel = getPeriodLabel(periodType) || "Semester";
  const semesterLabel =
    semesterData?.name ||
    (semesterData?.semNumber ? `${periodLabel} ${semesterData.semNumber}` : periodLabel);

  const resetDraft = () => {
    setDraft({
      courseType: "theory",
      title: "",
      courseCode: "",
      creditLecture: "0",
      creditTutorial: "0",
      creditPractical: "0",
      teacherAssignments: [],
    });
    setExistingCourse(null);
  };

  const teacherName = (teacher) => {
    if (!teacher) return "";
    return (
      teacher.name ||
      teacher.user?.name ||
      [teacher.firstName, teacher.lastName].filter(Boolean).join(" ") ||
      teacher.email ||
      teacher._id ||
      "Unknown"
    );
  };

  const fetchTeachers = async ({ silent = false } = {}) => {
    if (!silent) setTeachersLoading(true);
    setTeacherLoadError("");

    try {
      const response = await getTeachers({ page: 1, limit: 200 });
      const teacherList = extractTeachers(response);
      setTeachers(teacherList);
      if (!teacherList.length) {
        setTeacherLoadError(
          "No teachers found. Add teacher users first in User Management."
        );
      }
    } catch (error) {
      console.error("Failed to load teachers:", error);
      setTeachers([]);
      const reason =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        "Unknown error";
      setTeacherLoadError(
        `Unable to load teachers. Please login again or check server. (${reason})`
      );
    } finally {
      if (!silent) setTeachersLoading(false);
    }
  };

  const fetchCourses = async () => {
    if (!semesterId) return;

    setLoading(true);
    setCourseError("");

    try {
      const response = await getCoursesForSemester(semesterId);
      const list = Array.isArray(response) ? response : response?.courses || [];

      const assignmentMap = {};
      list.forEach((course) => {
        assignmentMap[course._id] = Array.isArray(course.assignedTeachers)
          ? course.assignedTeachers
              .map((teacher) => ({
                teacherId:
                  teacher?._id ||
                  teacher?.teacherId ||
                  teacher?.teacher ||
                  "",
                roleLabel: teacher?.roleLabel || "Teacher",
              }))
              .filter((entry) => entry.teacherId)
          : [];
      });

      setCourses(list);
      setTeacherAssignments(assignmentMap);
    } catch (error) {
      console.error("Failed to load semester courses:", error);
      setCourseError(error?.response?.data?.message || "Failed to load courses");
      setCourses([]);
      setTeacherAssignments({});
    } finally {
      setLoading(false);
    }
  };

  const fetchCourseAssignment = async () => {
    if (!programId || !semesterId) {
      setAssignmentSource("");
      setAssignmentDraft(emptyAssignmentDraft);
      return;
    }

    setAssignmentLoading(true);
    setAssignmentError("");
    setAssignmentNotice("");

    try {
      const response = await getSemesterCourseAssignment(programId, semesterId);
      const normalized = normalizeCourseAssignment(response?.courseAssignment);

      // Hydration sanitize: never allow compulsory IDs to exist inside elective basket options.
      // This self-heals any invalid payload persisted in DB and prevents UI overlap display.
      const compulsorySet = new Set((normalized.compulsoryCourseIds || []).map((id) => toIdString(id)).filter(Boolean));
      const baskets = (normalized.electiveConfig?.baskets || []).map((basket, index) =>
        sanitizeBasket(
          {
            ...basket,
            options: (basket.options || [])
              .map((optionId) => toIdString(optionId))
              .filter((optionId) => optionId && !compulsorySet.has(optionId)),
          },
          index
        )
      );
      const hydrated = normalizeCourseAssignment({
        ...normalized,
        electiveConfig: {
          ...normalized.electiveConfig,
          baskets,
        },
      });

      if (import.meta?.env?.DEV) {
        const overlapIds = [];
        (normalized.electiveConfig?.baskets || []).forEach((basket, idx) => {
          (basket.options || []).forEach((optionId) => {
            const normalizedOptionId = toIdString(optionId);
            if (normalizedOptionId && compulsorySet.has(normalizedOptionId)) {
              overlapIds.push({ basketIndex: idx, courseId: normalizedOptionId });
            }
          });
        });

        if (overlapIds.length > 0) {
          console.warn("[ca][invalid-data-from-api]", {
            semesterId,
            programId,
            compulsoryCourseIds: normalized.compulsoryCourseIds || [],
            baskets: (normalized.electiveConfig?.baskets || []).map((basket) => ({
              basketId: basket.basketId,
              options: basket.options || [],
            })),
            overlapIds,
          });
        }
      }

      const nextDraft = assignmentToDraft(hydrated);
      setAssignmentDraft(nextDraft);
      setStructureDraft({
        compulsory_count: nextDraft.structure.compulsory_count ?? 0,
        elective_slot_count: nextDraft.structure.elective_slot_count ?? 0,
        compulsory_credit_target:
          nextDraft.structure.compulsory_credit_target === null ||
          nextDraft.structure.compulsory_credit_target === undefined
            ? ""
            : String(nextDraft.structure.compulsory_credit_target),
        elective_credit_target:
          nextDraft.structure.elective_credit_target === null ||
          nextDraft.structure.elective_credit_target === undefined
            ? ""
            : String(nextDraft.structure.elective_credit_target),
        credit_target_total:
          nextDraft.structure.credit_target_total === null ||
          nextDraft.structure.credit_target_total === undefined
            ? ""
          : String(nextDraft.structure.credit_target_total),
        enforce_credit_target: Boolean(nextDraft.structure.enforce_credit_target),
      });
      setAssignmentSource(response?.source || "");
      setAssignmentFieldErrors({});
      const apiWarnings = extractApiWarnings(response);
      const incompleteReasons = Array.isArray(response?.incompleteReasons)
        ? response.incompleteReasons
        : [];
      const noticeMessages = [
        ...apiWarnings,
        ...(response?.incomplete && incompleteReasons.length > 0
          ? [`Configuration incomplete: ${incompleteReasons.join(" ")}`]
          : []),
      ];
      setAssignmentNotice(noticeMessages.join(" "));
    } catch (error) {
      console.error("Failed to load course assignment:", error);
      setAssignmentError(
        error?.response?.data?.error || "Failed to load course assignment"
      );
      setAssignmentDraft(emptyAssignmentDraft);
      setStructureDraft({
        compulsory_count: 0,
        elective_slot_count: 0,
        compulsory_credit_target: "",
        elective_credit_target: "",
        credit_target_total: "",
        enforce_credit_target: false,
      });
      setAssignmentSource("");
      setAssignmentNotice("");
    } finally {
      setAssignmentLoading(false);
    }
  };

  const fetchData = async () => {
    if (!semesterId) return;
    await fetchCourses();
    await fetchTeachers({ silent: false });
    await fetchCourseAssignment();
  };

  useEffect(() => {
    setAddMode("");
    resetDraft();
    setAssignmentDraft(emptyAssignmentDraft);
    setAssignmentSource("");
    setAssignmentError("");
    setAssignmentNotice("");
    setAssignmentFieldErrors({});
    setStructureDraft({
      compulsory_count: 0,
      elective_slot_count: 0,
      compulsory_credit_target: "",
      elective_credit_target: "",
      credit_target_total: "",
      enforce_credit_target: false,
    });
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semesterId, programId]);

  useEffect(() => {
    setAssignmentDraft((prev) => pruneDraftByCourses(prev, courses));
  }, [courses]);

  const sortedCourses = useMemo(() => {
    return [...courses].sort((a, b) => {
      const aCode = (a?.courseCode || a?.title || "").toString();
      const bCode = (b?.courseCode || b?.title || "").toString();
      return aCode.localeCompare(bCode);
    });
  }, [courses]);

  useEffect(() => {
    if (!import.meta?.env?.DEV) return;
    const sample = (sortedCourses || []).slice(0, 3);
    const missing = (sortedCourses || [])
      .filter((course) => sumCourseCredits(course) <= 0)
      .slice(0, 3);
    [...sample, ...missing].forEach((course) => {
      console.debug("[ca][credit-debug]", {
        courseId: toIdString(course?._id),
        rawCourse: course,
        derivedCredits: sumCourseCredits(course),
      });
    });
  }, [sortedCourses]);

  const courseLabelMap = useMemo(
    () =>
      new Map(
        (sortedCourses || []).map((course) => {
          const courseId = toIdString(course?._id);
          const courseLabel =
            safeDisplay(course?.courseCode) || safeDisplay(course?.title) || courseId;
          return [courseId, courseLabel];
        })
      ),
    [sortedCourses]
  );

  const assignmentPayload = useMemo(
    () => draftToAssignmentPayload(assignmentDraft),
    [assignmentDraft]
  );

  const totalCreditFromPrevStep = useMemo(() => {
    const explicitCredit = parseFiniteNumber(periodTotalCredits);
    if (explicitCredit !== null) return Math.max(0, explicitCredit);

    const periodCredit = parseFiniteNumber(
      semesterData?.totalCredits ??
        semesterData?.totalCredit ??
        semesterData?.creditTotal ??
        semesterData?.credit_total
    );
    if (periodCredit !== null) return Math.max(0, periodCredit);

    const assignmentCredit = parseFiniteNumber(
      assignmentPayload?.credit_target_total ?? assignmentPayload?.creditTargetTotal
    );
    if (assignmentCredit !== null) return Math.max(0, assignmentCredit);

    return 0;
  }, [
    periodTotalCredits,
    semesterData,
    assignmentPayload?.credit_target_total,
    assignmentPayload?.creditTargetTotal,
  ]);

  useEffect(() => {
    // Total Credit is read-only here; keep draft in sync with previous step.
    const nextValue =
      Number.isFinite(totalCreditFromPrevStep) && totalCreditFromPrevStep > 0
        ? String(totalCreditFromPrevStep)
        : "";
    setStructureDraft((prev) => {
      if (String(prev.credit_target_total ?? "") === nextValue && prev.enforce_credit_target === false) return prev;
      return { ...prev, credit_target_total: nextValue, enforce_credit_target: false };
    });
  }, [totalCreditFromPrevStep]);

  const assignmentSummary = useMemo(
    () => computeSummary(assignmentPayload, courses),
    [assignmentPayload, courses]
  );

  const creditTargetStatus = useMemo(() => {
    const normalized = assignmentPayload;
    const byId = new Map(
      (courses || []).map((course) => [toIdString(course?._id), sumCourseCredits(course)])
    );

    const compulsoryCredits = (normalized.compulsoryCourseIds || []).reduce(
      (sum, courseId) => sum + (byId.get(courseId) || 0),
      0
    );

    const basketContributions = [];
    const uniformCreditErrors = [];
    const missingCreditWarnings = [];

    let electiveContributedCredits = 0;
    (normalized.electiveConfig?.baskets || []).forEach((basket, index) => {
      const optionIds = Array.isArray(basket.options) ? basket.options : [];
      const optionCredits = optionIds.map((courseId) => {
        const value = byId.get(courseId);
        return Number.isFinite(value) ? value : 0;
      });
      const uniqueCredits = new Set(optionCredits);

      let contribution = 0;
      if (basket.pickRule === PICK_RULE_ALL) {
        contribution = optionCredits.reduce((sum, value) => sum + value, 0);
      } else if (optionCredits.length > 0) {
        const requiresUniform = basket.pickRule === PICK_RULE_ANY_ONE || basket.pickRule === PICK_RULE_ANY_N;
        if (requiresUniform && uniqueCredits.size > 1) {
          uniformCreditErrors.push(
            `Elective Course ${index + 1}: options must have same credit for ${basket.pickRule}.`
          );
        }
        const commonCredit = optionCredits[0] || 0;
        const pickCount =
          basket.pickRule === PICK_RULE_ANY_N
            ? clampPickN(basket.pickN, optionCredits.length, 1)
            : 1;
        contribution =
          basket.pickRule === PICK_RULE_ANY_N ? commonCredit * pickCount : commonCredit;
      }

      optionIds.forEach((courseId, optionIndex) => {
        const value = byId.get(courseId);
        if (!Number.isFinite(value) || value <= 0) {
          const label = courseLabelMap.get(courseId) || courseId;
          missingCreditWarnings.push(
            `Elective Course ${index + 1} option ${optionIndex + 1} (${label}) has missing/zero credit.`
          );
        }
      });

      basketContributions.push({
        basketIndex: index,
        pickRule: basket.pickRule,
        pickN: basket.pickRule === PICK_RULE_ANY_N ? Number(basket.pickN) || 1 : null,
        optionCount: optionIds.length,
        contribution,
        uniformCredits:
          basket.pickRule === PICK_RULE_ALL || optionCredits.length === 0
            ? true
            : uniqueCredits.size <= 1,
        commonCredit:
          optionCredits.length > 0 ? optionCredits[0] || 0 : 0,
      });
      electiveContributedCredits += contribution;
    });

    const compulsory_credit_target =
      normalized.compulsory_credit_target === null || normalized.compulsory_credit_target === undefined
        ? null
        : Number(normalized.compulsory_credit_target);
    const elective_credit_target =
      normalized.elective_credit_target === null || normalized.elective_credit_target === undefined
        ? null
        : Number(normalized.elective_credit_target);

    const totalTargetDerived =
      compulsory_credit_target !== null || elective_credit_target !== null
        ? (compulsory_credit_target || 0) + (elective_credit_target || 0)
        : null;

    const totalSelectedCredits = compulsoryCredits + electiveContributedCredits;

    const mismatchErrors = [];
    const mismatchWarnings = [];
    const enforce = Boolean(normalized.enforce_credit_target);

    if (enforce) {
      if (compulsory_credit_target === null || elective_credit_target === null) {
        mismatchErrors.push(
          "Compulsory and elective credit targets must be set when enforcement is enabled."
        );
      } else {
        if (compulsoryCredits !== compulsory_credit_target) {
          mismatchErrors.push(
            `Compulsory credits must equal target (${compulsoryCredits} != ${compulsory_credit_target}).`
          );
        }
        if (electiveContributedCredits !== elective_credit_target) {
          mismatchErrors.push(
            `Elective contributed credits must equal target (${electiveContributedCredits} != ${elective_credit_target}).`
          );
        }
        if (totalTargetDerived !== null && totalSelectedCredits !== totalTargetDerived) {
          mismatchErrors.push(
            `Total selected credits must equal semester target (${totalSelectedCredits} != ${totalTargetDerived}).`
          );
        }
      }
    } else {
      if (totalTargetDerived !== null && totalSelectedCredits !== totalTargetDerived) {
        mismatchWarnings.push(
          `Credits mismatch (enforcement OFF): selected ${totalSelectedCredits}, target ${totalTargetDerived}.`
        );
      }
    }

    return {
      compulsoryCredits,
      electiveContributedCredits,
      totalSelectedCredits,
      compulsory_credit_target,
      elective_credit_target,
      totalTargetDerived,
      basketContributions,
      uniformCreditErrors: Array.from(new Set(uniformCreditErrors)),
      missingCreditWarnings: Array.from(new Set(missingCreditWarnings)),
      mismatchErrors: Array.from(new Set(mismatchErrors)),
      mismatchWarnings: Array.from(new Set(mismatchWarnings)),
    };
  }, [assignmentPayload, courses, courseLabelMap]);

  const localAssignmentWarnings = useMemo(() => {
    const warnings = [];
    const normalized = assignmentPayload;
    const compulsorySet = new Set(normalized.compulsoryCourseIds || []);
    const requiredCompulsory = normalized.compulsory_count || 0;
    const requiredElectiveSlots = normalized.elective_slot_count || 0;
    const baskets = normalized.electiveConfig?.baskets || [];

    if (normalized.compulsoryCourseIds.length !== requiredCompulsory) {
      warnings.push(
        `Compulsory selection must be exactly ${requiredCompulsory} course(s).`
      );
    }

    if (baskets.length !== requiredElectiveSlots) {
      warnings.push(
        `Elective blocks must be exactly ${requiredElectiveSlots} block(s).`
      );
    }

    const firstSeenBasketByCourse = new Map();
    baskets.forEach((basket, index) => {
      const options = basket.options || [];
      if (!options.length) {
        warnings.push(`Elective Course ${index + 1} requires at least one candidate.`);
      }

      if (basket.pickRule === PICK_RULE_ANY_N) {
        const pickN = Number(basket.pickN) || 0;
        if (pickN < 1) {
          warnings.push(`Elective Course ${index + 1} Any N requires N >= 1.`);
        }
        if (pickN > options.length) {
          warnings.push(
            `Elective Course ${index + 1} Any N cannot exceed candidate count.`
          );
        }
      }

      options.forEach((courseId) => {
        if (compulsorySet.has(courseId)) {
          warnings.push(
            `Elective Course ${index + 1} contains compulsory subject ${getCourseDisplayLabel(
              courseId,
              courseLabelMap
            )}.`
          );
        }
        if (firstSeenBasketByCourse.has(courseId)) {
          const firstBasketIndex = firstSeenBasketByCourse.get(courseId);
          warnings.push(
            `Elective overlap: Course ${getCourseDisplayLabel(
              courseId,
              courseLabelMap
            )} appears in Elective Course ${firstBasketIndex + 1} and Elective Course ${
              index + 1
            }.`
          );
        } else {
          firstSeenBasketByCourse.set(courseId, index);
        }
      });
    });

    (creditTargetStatus.uniformCreditErrors || []).forEach((message) => warnings.push(message));
    if (normalized.enforce_credit_target) {
      (creditTargetStatus.mismatchErrors || []).forEach((message) => warnings.push(message));
    }

    if (
      normalized.enforce_credit_target &&
      (normalized.credit_target_total === null ||
        normalized.credit_target_total === undefined)
    ) {
      warnings.push(
        "Credit target value is required when credit target enforcement is enabled."
      );
    }

    return Array.from(new Set(warnings));
  }, [assignmentPayload, courseLabelMap, creditTargetStatus]);

  const openAddPanel = (mode) => {
    setAddMode(mode);
    resetDraft();
    setCourseError("");
  };

  const closeAddPanel = () => {
    setAddMode("");
    resetDraft();
    setPendingAssignTarget(null);
  };

  const updateDraftField = (field, value) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
    if (field === "courseCode" && addMode === "existing") {
      setExistingCourse(null);
    }
  };

  const addDraftTeacherRow = () => {
    setDraft((prev) => ({
      ...prev,
      teacherAssignments: [
        ...(prev.teacherAssignments || []),
        { teacherId: "", roleLabel: "Teacher" },
      ],
    }));
  };

  const updateDraftTeacherRow = (index, field, value) => {
    setDraft((prev) => ({
      ...prev,
      teacherAssignments: (prev.teacherAssignments || []).map((entry, i) =>
        i === index ? { ...entry, [field]: value } : entry
      ),
    }));
  };

  const removeDraftTeacherRow = (index) => {
    setDraft((prev) => ({
      ...prev,
      teacherAssignments: (prev.teacherAssignments || []).filter((_, i) => i !== index),
    }));
  };

  const handleLookupExisting = async () => {
    if (!draft.courseCode) {
      setCourseError("Course Code is required");
      return;
    }

    setLookupLoading(true);
    setCourseError("");

    try {
      const data = await lookupCourseByCode(draft.courseCode);
      const found = data?.course || data;
      setExistingCourse(found);
    } catch (error) {
      setExistingCourse(null);
      setCourseError(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          "Course not found"
      );
    } finally {
      setLookupLoading(false);
    }
  };

  const handleSubmitCourse = async () => {
    if (!semesterId) return;

    setSavingCourse(true);
    setCourseError("");

    try {
      const assignTarget = pendingAssignTarget;
      const teachersPayload = (draft.teacherAssignments || [])
        .filter((entry) => entry.teacherId)
        .map((entry) => ({
          teacherId: entry.teacherId,
          roleLabel: entry.roleLabel || "Teacher",
        }));

      let createdCourseId = "";
      if (addMode === "existing") {
        if (!existingCourse) {
          setCourseError("Lookup an existing course first.");
          return;
        }

        const result = await createCourse({
          semester: semesterId,
          courseCode: existingCourse.courseCode,
          useExistingCourse: true,
          teachers: teachersPayload.length ? teachersPayload : undefined,
        });
        createdCourseId = toIdString(result?.course?._id || result?.courseId || "");
      } else {
        if (!draft.title || !draft.courseCode) {
          setCourseError("Course name and code are required.");
          return;
        }

        const parseCreditField = (value) => {
          const trimmed = String(value ?? "").trim();
          if (!trimmed) return 0;
          const parsed = Number.parseInt(trimmed, 10);
          if (!Number.isFinite(parsed) || parsed < 0) return null;
          return parsed;
        };
        const lecture = parseCreditField(draft.creditLecture);
        const tutorial = parseCreditField(draft.creditTutorial);
        const practical = parseCreditField(draft.creditPractical);
        if (lecture === null || tutorial === null || practical === null) {
          setCourseError("Credits (L/T/P) must be integers >= 0.");
          return;
        }
        if (lecture + tutorial + practical <= 0) {
          setCourseError("Enter course credits (L/T/P) greater than 0.");
          return;
        }

        const result = await createCourse({
          semester: semesterId,
          courseType: draft.courseType,
          title: draft.title,
          courseCode: draft.courseCode,
          creditPoints: { lecture, tutorial, practical },
          teachers: teachersPayload.length ? teachersPayload : undefined,
        });
        createdCourseId = toIdString(result?.course?._id || result?.courseId || "");
      }

      closeAddPanel();
      await fetchCourses();

      if (assignTarget && createdCourseId) {
        if (import.meta?.env?.DEV) {
          console.debug("[ca][click-source]", {
            source: "SemesterCourseTable:createCourseModal.save",
            assignTarget,
            courseId: createdCourseId,
          });
        }

        if (assignTarget.kind === "compulsory") {
          setCompulsorySlotCourse(assignTarget.slotIndex, createdCourseId);
        } else if (assignTarget.kind === "elective") {
          addElectiveOption(assignTarget.blockIndex, createdCourseId);
        }
      }

      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Failed to save course:", error);
      setCourseError(error?.response?.data?.message || "Failed to save course");
    } finally {
      setSavingCourse(false);
    }
  };

  const handleRemoveCourse = async (courseId) => {
    if (!window.confirm("Are you sure you want to remove this course?")) return;

    setSavingCourse(true);
    setCourseError("");

    try {
      await unlinkCourseFromSemester(semesterId, courseId);
      await fetchCourses();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Failed to remove course:", error);
      setCourseError(error?.response?.data?.message || "Failed to remove course");
    } finally {
      setSavingCourse(false);
    }
  };

  const addTeacherRow = (courseId) => {
    setTeacherAssignments((prev) => {
      const current = prev[courseId] || [];
      return {
        ...prev,
        [courseId]: [...current, { teacherId: "", roleLabel: "Teacher" }],
      };
    });
  };

  const updateTeacherRow = (courseId, index, field, value) => {
    setTeacherAssignments((prev) => {
      const current = prev[courseId] || [];
      return {
        ...prev,
        [courseId]: current.map((entry, i) =>
          i === index ? { ...entry, [field]: value } : entry
        ),
      };
    });
  };

  const removeTeacherRow = (courseId, index) => {
    setTeacherAssignments((prev) => {
      const current = prev[courseId] || [];
      return {
        ...prev,
        [courseId]: current.filter((_, i) => i !== index),
      };
    });
  };

  const saveTeacherAssignment = async (courseId) => {
    setSavingCourse(true);
    setCourseError("");

    try {
      const payload = (teacherAssignments[courseId] || [])
        .filter((entry) => entry.teacherId)
        .map((entry) => ({
          teacherId: entry.teacherId,
          roleLabel: entry.roleLabel || "Teacher",
        }));

      await updateCourseTeachers(semesterId, courseId, payload);
      await fetchCourses();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Failed to update teachers:", error);
      setCourseError(
        error?.response?.data?.message || "Failed to update teacher assignments"
      );
    } finally {
      setSavingCourse(false);
    }
  };

  const setCompulsorySlotCourse = (slotIndex, courseId) => {
    const normalizedCourseId = toIdString(courseId);
    if (!normalizedCourseId) return;

    setAssignmentFieldErrors({});
    setAssignmentNotice("");
    setAssignmentError("");

    if (import.meta?.env?.DEV) {
      console.debug("[ca][click-source]", {
        source: "SemesterCourseTable:compulsorySlot.chooseExisting",
        slotIndex,
        courseId: normalizedCourseId,
      });
    }

    setAssignmentDraft((prev) => {
      const prevDraft = sanitizeDraft(prev);
      const slotsNext = (prevDraft.compulsorySlots || []).map((slot) => ({ ...slot }));
      const blocksNext = (prevDraft.electiveBlocks || []).map((block) => ({
        ...block,
        options: [...(block.options || [])],
      }));

      // Ensure fixed slot length.
      while (slotsNext.length < prevDraft.structure.compulsory_count) {
        slotsNext.push({ slotId: `comp-${slotsNext.length + 1}`, courseId: "" });
      }

      // Remove course from any other compulsory slot (keep the last action's slot).
      slotsNext.forEach((slot, idx) => {
        if (idx !== slotIndex && toIdString(slot.courseId) === normalizedCourseId) {
          slotsNext[idx] = { ...slot, courseId: "" };
        }
      });

      if (slotsNext[slotIndex]) {
        slotsNext[slotIndex] = {
          ...slotsNext[slotIndex],
          courseId: normalizedCourseId,
        };
      }

      // Hard disjointness: prune the selected compulsory course from all elective options.
      blocksNext.forEach((block, idx) => {
        blocksNext[idx] = {
          ...block,
          options: (block.options || [])
            .map((id) => toIdString(id))
            .filter((id) => id && id !== normalizedCourseId),
        };
      });

      return sanitizeDraft({
        ...prevDraft,
        compulsorySlots: slotsNext,
        electiveBlocks: blocksNext,
      });
    });
  };

  const clearCompulsorySlotCourse = (slotIndex) => {
    setAssignmentFieldErrors({});
    setAssignmentNotice("");
    setAssignmentError("");

    if (import.meta?.env?.DEV) {
      console.debug("[ca][click-source]", {
        source: "SemesterCourseTable:compulsorySlot.clear",
        slotIndex,
      });
    }

    setAssignmentDraft((prev) => {
      const prevDraft = sanitizeDraft(prev);
      const slotsNext = (prevDraft.compulsorySlots || []).map((slot, idx) =>
        idx === slotIndex ? { ...slot, courseId: "" } : slot
      );
      return sanitizeDraft({
        ...prevDraft,
        compulsorySlots: slotsNext,
      });
    });
  };

  const updateStructureDraftField = (field, value) => {
    setStructureDraft((prev) => {
      return { ...prev, [field]: value };
    });
    setAssignmentFieldErrors({});
    setAssignmentNotice("");
    setAssignmentError("");
  };

  const saveStructure = async () => {
    if (!semesterId || !programId) {
      setAssignmentError("Program and semester are required to save structure.");
      return;
    }

    const compulsoryCount = toNonNegativeInt(structureDraft.compulsory_count, 0);
    const electiveSlotCount = toNonNegativeInt(structureDraft.elective_slot_count, 0);
    const totalCredit = Number(totalCreditFromPrevStep) || 0;
    if (totalCredit <= 0) {
      setAssignmentError("Total credit is not set. Please set it in the previous step.");
      return;
    }

    const parseTarget = (value, label) => {
      const raw = value === undefined ? "" : String(value).trim();
      if (raw === "") return null;
      const parsed = Number.parseInt(raw, 10);
      if (!Number.isFinite(parsed) || parsed < 0) {
        setAssignmentError(`${label} must be an integer >= 0.`);
        return { error: true, value: null };
      }
      return { error: false, value: parsed };
    };

    const compTargetResult = parseTarget(
      structureDraft.compulsory_credit_target,
      "Compulsory credit target"
    );
    if (compTargetResult?.error) return;
    const elecTargetResult = parseTarget(
      structureDraft.elective_credit_target,
      "Elective credit target"
    );
    if (elecTargetResult?.error) return;

    const compulsoryCreditTarget = compTargetResult?.value ?? null;
    const electiveCreditTarget = elecTargetResult?.value ?? null;
    const targetSum = (compulsoryCreditTarget || 0) + (electiveCreditTarget || 0);
    if (targetSum > totalCredit) {
      setAssignmentError("Compulsory + Elective target credit cannot exceed Total Credit.");
      return;
    }

    setAssignmentSaving(true);
    setAssignmentError("");
    setAssignmentNotice("");
    setAssignmentFieldErrors({});

    try {
      const response = await updateSemesterCourseAssignment(programId, semesterId, {
        structureOnly: true,
        compulsory_count: compulsoryCount,
        elective_slot_count: electiveSlotCount,
        compulsory_credit_target: compulsoryCreditTarget,
        elective_credit_target: electiveCreditTarget,
        credit_target_total: totalCredit,
        enforce_credit_target: false,
      });
      const nextDraft = assignmentToDraft(response?.courseAssignment);
      setAssignmentDraft(nextDraft);
      setStructureDraft({
        compulsory_count: nextDraft.structure.compulsory_count ?? 0,
        elective_slot_count: nextDraft.structure.elective_slot_count ?? 0,
        compulsory_credit_target:
          nextDraft.structure.compulsory_credit_target === null ||
          nextDraft.structure.compulsory_credit_target === undefined
            ? ""
            : String(nextDraft.structure.compulsory_credit_target),
        elective_credit_target:
          nextDraft.structure.elective_credit_target === null ||
          nextDraft.structure.elective_credit_target === undefined
            ? ""
            : String(nextDraft.structure.elective_credit_target),
        credit_target_total:
          nextDraft.structure.credit_target_total === null ||
          nextDraft.structure.credit_target_total === undefined
            ? ""
            : String(nextDraft.structure.credit_target_total),
        enforce_credit_target: false,
      });
      setAssignmentSource("persisted");
      const apiWarnings = extractApiWarnings(response);
      const incompleteReasons = Array.isArray(response?.incompleteReasons)
        ? response.incompleteReasons
        : [];
      if (apiWarnings.length > 0 || (response?.incomplete && incompleteReasons.length > 0)) {
        const noticeMessages = [
          ...apiWarnings,
          ...(response?.incomplete && incompleteReasons.length > 0
            ? [`Configuration incomplete: ${incompleteReasons.join(" ")}`]
            : []),
        ];
        setAssignmentNotice(noticeMessages.join(" "));
      } else {
        setAssignmentNotice("Structure saved successfully.");
      }
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Failed to save structure:", error);
      const apiError = error?.response?.data;
      setAssignmentError(apiError?.error || "Failed to save structure");
      setAssignmentFieldErrors(mapFieldErrors(apiError?.details));
    } finally {
      setAssignmentSaving(false);
    }
  };

  const updateElectiveBlockField = (blockIndex, field, value) => {
    setAssignmentFieldErrors({});
    setAssignmentNotice("");
    setAssignmentError("");

    setAssignmentDraft((prev) => {
      const prevDraft = sanitizeDraft(prev);
      const blocksNext = (prevDraft.electiveBlocks || []).map((block, index) => {
        if (index !== blockIndex) return block;

        const updated = { ...block };
        if (field === "rule") {
          const nextRule = String(value || "").toUpperCase();
          updated.rule = [PICK_RULE_ANY_ONE, PICK_RULE_ANY_N, PICK_RULE_ALL].includes(nextRule)
            ? nextRule
            : PICK_RULE_ANY_ONE;
          updated.pickN =
            updated.rule === PICK_RULE_ANY_N
              ? clampPickN(updated.pickN ?? 1, (updated.options || []).length, 1)
              : null;
        } else if (field === "pickN") {
          updated.pickN =
            updated.rule === PICK_RULE_ANY_N
              ? clampPickN(value, (updated.options || []).length, 1)
              : null;
        } else if (field === "name") {
          updated.name = String(value || "");
        }

        return updated;
      });

      return sanitizeDraft({
        ...prevDraft,
        electiveBlocks: blocksNext,
      });
    });
  };

  const addElectiveOption = (blockIndex, courseId) => {
    const normalizedCourseId = toIdString(courseId);
    if (!normalizedCourseId) return;
    blockedElectiveToggleRef.current = null;

    setAssignmentFieldErrors({});
    setAssignmentNotice("");
    setAssignmentError("");

    if (import.meta?.env?.DEV) {
      console.debug("[ca][click-source]", {
        source: "SemesterCourseTable:electiveBlock.chooseExisting",
        blockIndex,
        courseId: normalizedCourseId,
      });
    }

    setAssignmentDraft((prev) => {
      const prevDraft = sanitizeDraft(prev);
      const compulsorySetPrev = new Set(
        (prevDraft.compulsorySlots || [])
          .map((slot) => toIdString(slot.courseId))
          .filter(Boolean)
      );

      if (compulsorySetPrev.has(normalizedCourseId)) {
        const courseLabel = getCourseDisplayLabel(normalizedCourseId, courseLabelMap);
        blockedElectiveToggleRef.current = `Cannot add ${courseLabel}: Compulsory subject.`;
        return prev;
      }

      const usedInOtherBlock = (prevDraft.electiveBlocks || []).findIndex((block, idx) => {
        if (idx === blockIndex) return false;
        return (block.options || []).some((id) => toIdString(id) === normalizedCourseId);
      });
      if (usedInOtherBlock >= 0) {
        const courseLabel = getCourseDisplayLabel(normalizedCourseId, courseLabelMap);
        blockedElectiveToggleRef.current = `Cannot add ${courseLabel}: Already used in Elective Course ${usedInOtherBlock + 1}.`;
        return prev;
      }

      const blocksNext = (prevDraft.electiveBlocks || []).map((block, idx) => {
        if (idx !== blockIndex) return block;
        const optionSet = new Set((block.options || []).map((id) => toIdString(id)).filter(Boolean));
        optionSet.add(normalizedCourseId);
        const nextOptions = Array.from(optionSet);
        return {
          ...block,
          options: nextOptions,
          pickN:
            block.rule === PICK_RULE_ANY_N
              ? clampPickN(block.pickN ?? 1, nextOptions.length, 1)
              : null,
        };
      });

      return sanitizeDraft({
        ...prevDraft,
        electiveBlocks: blocksNext,
      });
    });

    const flushBlocked = () => {
      const message = blockedElectiveToggleRef.current;
      if (!message) return;
      blockedElectiveToggleRef.current = null;
      setAssignmentError(message);
    };

    if (typeof queueMicrotask === "function") {
      queueMicrotask(flushBlocked);
    } else {
      setTimeout(flushBlocked, 0);
    }
  };

  const removeElectiveOption = (blockIndex, courseId) => {
    const normalizedCourseId = toIdString(courseId);
    if (!normalizedCourseId) return;

    setAssignmentFieldErrors({});
    setAssignmentNotice("");
    setAssignmentError("");

    if (import.meta?.env?.DEV) {
      console.debug("[ca][click-source]", {
        source: "SemesterCourseTable:electiveBlock.removeOption",
        blockIndex,
        courseId: normalizedCourseId,
      });
    }

    setAssignmentDraft((prev) => {
      const prevDraft = sanitizeDraft(prev);
      const blocksNext = (prevDraft.electiveBlocks || []).map((block, idx) => {
        if (idx !== blockIndex) return block;
        const nextOptions = (block.options || [])
          .map((id) => toIdString(id))
          .filter((id) => id && id !== normalizedCourseId);
        return {
          ...block,
          options: nextOptions,
          pickN:
            block.rule === PICK_RULE_ANY_N
              ? clampPickN(block.pickN ?? 1, nextOptions.length, 1)
              : null,
        };
      });
      return sanitizeDraft({
        ...prevDraft,
        electiveBlocks: blocksNext,
      });
    });
  };

  const saveCourseAssignment = async () => {
    if (!semesterId || !programId) {
      setAssignmentError("Program and semester are required to save course assignment.");
      return;
    }

    if (structureDirty) {
      setAssignmentError("Save structure first before saving assignment.");
      return;
    }

    if (localAssignmentWarnings.length > 0) {
      setAssignmentError("Resolve assignment validation issues before saving.");
      return;
    }

    setAssignmentSaving(true);
    setAssignmentError("");
    setAssignmentNotice("");
    setAssignmentFieldErrors({});

    try {
      const normalizedDraft = sanitizeDraft(assignmentDraft);
      const totalCredit = Number(totalCreditFromPrevStep) || 0;
      const compulsoryCourseIds = (normalizedDraft.compulsorySlots || [])
        .map((slot) => toIdString(slot.courseId))
        .filter(Boolean);

      const baskets = (normalizedDraft.electiveBlocks || []).map((block, index) => ({
        basketId: `elective-slot-${index + 1}`,
        name: block.name || `Elective Course ${index + 1}`,
        pickRule: block.rule,
        pickN:
          block.rule === PICK_RULE_ANY_N
            ? clampPickN(block.pickN ?? 1, (block.options || []).length, 1)
            : null,
        options: (block.options || []).map((id) => toIdString(id)).filter(Boolean),
      }));
      const payload = {
        compulsory_count: normalizedDraft.structure.compulsory_count,
        elective_slot_count: normalizedDraft.structure.elective_slot_count,
        compulsory_credit_target: normalizedDraft.structure.compulsory_credit_target,
        elective_credit_target: normalizedDraft.structure.elective_credit_target,
        credit_target_total: totalCredit > 0 ? totalCredit : normalizedDraft.structure.credit_target_total,
        enforce_credit_target: false,
        compulsoryCourseIds,
        electiveConfig: {
          mode: ELECTIVE_MODE_BASKET,
          baskets,
          tracks: [],
        },
      };

      const response = await updateSemesterCourseAssignment(programId, semesterId, payload);
      const nextDraft = assignmentToDraft(response?.courseAssignment);
      setAssignmentDraft(nextDraft);
      setStructureDraft({
        compulsory_count: nextDraft.structure.compulsory_count ?? 0,
        elective_slot_count: nextDraft.structure.elective_slot_count ?? 0,
        compulsory_credit_target:
          nextDraft.structure.compulsory_credit_target === null ||
          nextDraft.structure.compulsory_credit_target === undefined
            ? ""
            : String(nextDraft.structure.compulsory_credit_target),
        elective_credit_target:
          nextDraft.structure.elective_credit_target === null ||
          nextDraft.structure.elective_credit_target === undefined
            ? ""
            : String(nextDraft.structure.elective_credit_target),
        credit_target_total:
          nextDraft.structure.credit_target_total === null ||
          nextDraft.structure.credit_target_total === undefined
            ? ""
            : String(nextDraft.structure.credit_target_total),
        enforce_credit_target: false,
      });
      setAssignmentSource("persisted");
      const apiWarnings = extractApiWarnings(response);
      if (apiWarnings.length > 0) {
        setAssignmentNotice(apiWarnings.join(" "));
      } else {
        setAssignmentNotice("Course assignment saved successfully.");
      }

      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Failed to save course assignment:", error);
      const apiError = error?.response?.data;
      setAssignmentError(apiError?.error || "Failed to save course assignment");
      setAssignmentFieldErrors(mapFieldErrors(apiError?.details));
    } finally {
      setAssignmentSaving(false);
    }
  };

  const getBasketErrors = (basketIndex) => {
    const prefixes = [
      `electiveConfig.baskets[${basketIndex}]`,
      `electiveBaskets[${basketIndex}]`,
    ];
    return Object.entries(assignmentFieldErrors)
      .filter(([path]) => prefixes.some((prefix) => path.startsWith(prefix)))
      .map(([, message]) => message);
  };

  const basketRuleLabel = (basket) => {
    const optionCount = (basket.options || []).length;
    if (basket.pickRule === PICK_RULE_ALL) {
      return `All (${optionCount} courses)`;
    }
    if (basket.pickRule === PICK_RULE_ANY_N) {
      return `Any ${basket.pickN || 1} of ${optionCount}`;
    }
    return `Any 1 of ${optionCount}`;
  };

  const totalCourseCredits = useMemo(
    () => sortedCourses.reduce((sum, course) => sum + sumCourseCredits(course), 0),
    [sortedCourses]
  );

  const normalizedDraft = useMemo(() => sanitizeDraft(assignmentDraft), [assignmentDraft]);
  const normalizedAssignment = assignmentPayload;
  const structureCreditValidation = useMemo(() => {
    const total = Number(totalCreditFromPrevStep) || 0;
    const totalMissing = !(Number.isFinite(total) && total > 0);

    const rawComp = String(structureDraft.compulsory_credit_target ?? "").trim();
    const rawElec = String(structureDraft.elective_credit_target ?? "").trim();

    const compValue = rawComp === "" ? 0 : toNonNegativeInt(rawComp, 0);
    const elecValue = rawElec === "" ? 0 : toNonNegativeInt(rawElec, 0);
    const sumTargets = (compValue || 0) + (elecValue || 0);

    const overLimit = !totalMissing && sumTargets > total;

    return {
      total,
      totalMissing,
      sumTargets,
      overLimit,
    };
  }, [
    totalCreditFromPrevStep,
    structureDraft.compulsory_credit_target,
    structureDraft.elective_credit_target,
  ]);
  const structureCreditInvalid =
    structureCreditValidation.totalMissing || structureCreditValidation.overLimit;
  const compulsoryIdSet = useMemo(
    () =>
      new Set(
        (normalizedDraft.compulsorySlots || [])
          .map((slot) => toIdString(slot.courseId))
          .filter(Boolean)
      ),
    [normalizedDraft.compulsorySlots]
  );
  const requiredCompulsory = normalizedAssignment.compulsory_count || 0;
  const requiredElectiveSlots = normalizedAssignment.elective_slot_count || 0;
	  const selectedCompulsoryCount =
	    normalizedAssignment.compulsoryCourseIds?.length || 0;
	  const structureDirty =
	    toNonNegativeInt(structureDraft.compulsory_count, 0) !== requiredCompulsory ||
	    toNonNegativeInt(structureDraft.elective_slot_count, 0) !== requiredElectiveSlots ||
	    (String(structureDraft.compulsory_credit_target || "").trim() === ""
	      ? null
	      : toNonNegativeInt(
	          String(structureDraft.compulsory_credit_target || "").trim(),
	          null
	        )) !== (normalizedAssignment.compulsory_credit_target ?? null) ||
	    (String(structureDraft.elective_credit_target || "").trim() === ""
	      ? null
	      : toNonNegativeInt(
	          String(structureDraft.elective_credit_target || "").trim(),
	          null
	        )) !== (normalizedAssignment.elective_credit_target ?? null) ||
	    (String(structureDraft.credit_target_total || "").trim() === ""
	      ? null
	      : toNonNegativeInt(String(structureDraft.credit_target_total || "").trim(), null)) !==
	      (normalizedAssignment.credit_target_total ?? null);
  const disableSaveAssignment =
    assignmentSaving ||
    assignmentLoading ||
    !programId ||
    !assignmentSource ||
    assignmentSource === "empty" ||
    structureDirty ||
    structureCreditInvalid ||
    localAssignmentWarnings.length > 0;

  const selectionLocked =
    assignmentSaving ||
    assignmentLoading ||
    !assignmentSource ||
    assignmentSource === "empty" ||
    structureDirty ||
    structureCreditInvalid;

  const electiveUsageByCourseId = useMemo(() => {
    const usage = new Map();
    (normalizedDraft.electiveBlocks || []).forEach((block, blockIndex) => {
      (block.options || []).forEach((courseId) => {
        const id = toIdString(courseId);
        if (!id) return;
        usage.set(id, blockIndex);
      });
    });
    return usage;
  }, [normalizedDraft.electiveBlocks]);

  const pickerTitle = "Existing Course";
  const pickerSubtitle =
    coursePicker?.kind === "elective"
      ? "Select an existing course to add as a candidate. Courses used in compulsory slots or other elective blocks are not eligible."
      : "Select an existing course for this compulsory slot. Courses used in elective blocks or other compulsory slots are not eligible.";

  const pickerEligibleCourses = useMemo(() => {
    if (!coursePicker) return [];
    const allCourses = Array.isArray(sortedCourses) ? sortedCourses : [];

    if (coursePicker.kind === "compulsory") {
      const slotIndex = Number(coursePicker.slotIndex) || 0;
      const currentCourseId = toIdString(normalizedDraft.compulsorySlots?.[slotIndex]?.courseId);
      const usedInOtherSlots = new Set(compulsoryIdSet);
      if (currentCourseId) usedInOtherSlots.delete(currentCourseId);

      return allCourses.filter((course) => {
        const id = toIdString(course?._id);
        if (!id) return false;
        if (usedInOtherSlots.has(id)) return false;
        if (electiveUsageByCourseId.has(id)) return false;
        return true;
      });
    }

    const blockIndex = Number(coursePicker.blockIndex) || 0;
    const currentOptionsSet = new Set(
      (normalizedDraft.electiveBlocks?.[blockIndex]?.options || [])
        .map((id) => toIdString(id))
        .filter(Boolean)
    );

    return allCourses.filter((course) => {
      const id = toIdString(course?._id);
      if (!id) return false;
      if (compulsoryIdSet.has(id)) return false;
      const usedIn = electiveUsageByCourseId.get(id);
      if (usedIn !== undefined && usedIn !== blockIndex) return false;
      if (currentOptionsSet.has(id)) return false;
      return true;
    });
  }, [
    coursePicker,
    sortedCourses,
    normalizedDraft.compulsorySlots,
    normalizedDraft.electiveBlocks,
    compulsoryIdSet,
    electiveUsageByCourseId,
  ]);

  const handlePickerSelect = (course) => {
    if (!coursePicker) return;
    const courseId = toIdString(course?._id);
    if (!courseId) return;

    if (import.meta?.env?.DEV) {
      console.debug("[ca][click-source]", {
        source: "SemesterCourseTable:pickExistingModal.select",
        picker: coursePicker,
        courseId,
      });
    }

    if (coursePicker.kind === "compulsory") {
      setCompulsorySlotCourse(coursePicker.slotIndex, courseId);
    } else {
      addElectiveOption(coursePicker.blockIndex, courseId);
    }
    setCoursePicker(null);
  };

  useEffect(() => {
    if (selectionLocked && coursePicker) {
      setCoursePicker(null);
    }
  }, [selectionLocked, coursePicker]);

  if (!semesterId) {
    return (
      <p className="text-sm italic text-gray-400">
        Select a {periodLabel.toLowerCase()} to configure course assignment.
      </p>
    );
  }

  if (loading && !courses.length) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {import.meta?.env?.DEV && (
        <div
          data-ca-build="CA_REDESIGN_V2"
          style={{ display: "none" }}
        />
      )}
      {courseError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {courseError}
        </div>
      )}

      {assignmentError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {assignmentError}
        </div>
      )}

      {assignmentNotice && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {assignmentNotice}
        </div>
      )}

      {addMode === "new" && (
        <div className="fixed inset-0 z-50 bg-black/50 p-4 overflow-y-auto">
          <div className="mx-auto w-full max-w-2xl rounded-lg bg-white shadow-lg">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-4 py-3">
              <div>
                <div className="text-base font-semibold text-gray-900">New Course</div>
                <div className="mt-1 text-xs text-gray-500">
                  Create a new course and link it to this {periodLabel.toLowerCase()}.
                </div>
              </div>
              <button
                type="button"
                onClick={closeAddPanel}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 px-4 py-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-gray-500">
                    Course Type
                  </label>
                  <select
                    value={draft.courseType}
                    onChange={(event) =>
                      updateDraftField("courseType", event.target.value)
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="theory">Theory</option>
                    <option value="practical">Practical</option>
                    <option value="project">Project</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-gray-500">
                    Course Name *
                  </label>
                  <input
                    value={draft.title}
                    onChange={(event) => updateDraftField("title", event.target.value)}
                    placeholder="Course name"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-gray-500">
                    Course Code *
                  </label>
                  <input
                    value={draft.courseCode}
                    onChange={(event) =>
                      updateDraftField("courseCode", event.target.value)
                    }
                    placeholder="Course code"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">
                  L T P C
                </div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-[11px] uppercase tracking-widest text-gray-500">
                      L
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={draft.creditLecture}
                      onChange={(event) =>
                        updateDraftField("creditLecture", event.target.value)
                      }
                      className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] uppercase tracking-widest text-gray-500">
                      T
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={draft.creditTutorial}
                      onChange={(event) =>
                        updateDraftField("creditTutorial", event.target.value)
                      }
                      className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] uppercase tracking-widest text-gray-500">
                      P
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={draft.creditPractical}
                      onChange={(event) =>
                        updateDraftField("creditPractical", event.target.value)
                      }
                      className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] uppercase tracking-widest text-gray-500">
                      C
                    </label>
                    <input
                      value={
                        (toNonNegativeInt(draft.creditLecture, 0) || 0) +
                        (toNonNegativeInt(draft.creditTutorial, 0) || 0) +
                        (toNonNegativeInt(draft.creditPractical, 0) || 0)
                      }
                      readOnly
                      className="w-full rounded border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-700"
                    />
                    <div className="mt-1 text-[11px] text-gray-500">C = L + T + P</div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeAddPanel}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitCourse}
                  disabled={savingCourse}
                  className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                >
                  {savingCourse ? "Creating..." : "Create Course"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Course Pool section hidden in Course Assignment context (client request). */}
      {!hideCoursePool && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3">
            <div>
              <h3 className="text-base font-semibold text-gray-900">{semesterLabel}</h3>
              <p className="text-xs text-gray-500">
                Course Pool Credits:{" "}
                <span className="font-semibold text-gray-700">{totalCourseCredits}</span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setPendingAssignTarget(null);
                  setCoursePicker(null);
                  openAddPanel("new");
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-100"
              >
                <Plus size={14} />
                Add New Course
              </button>
              <button
                type="button"
                onClick={() => {
                  setPendingAssignTarget(null);
                  setCoursePicker(null);
                  openAddPanel("existing");
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                <Plus size={14} />
                Add Existing Course
              </button>
              <button
                type="button"
                onClick={fetchData}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 hover:bg-gray-50"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-left">Course Name</th>
                  <th className="px-3 py-2 text-left">Code</th>
                  <th className="px-3 py-2 text-left">Teachers</th>
                  <th className="px-1 py-2 text-center">L</th>
                  <th className="px-1 py-2 text-center">T</th>
                  <th className="px-1 py-2 text-center">P</th>
                  <th className="px-1 py-2 text-center">C</th>
                  <th className="px-3 py-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedCourses.map((course) => (
                  <tr key={course._id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm capitalize text-gray-700">
                      {safeDisplay(course.courseType)}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900">
                      {safeDisplay(course.title)}
                    </td>
                    <td className="px-3 py-2 text-sm font-mono text-gray-600">
                      {safeDisplay(course.courseCode)}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-700">
                      <div className="flex flex-col gap-2">
                        {(teacherAssignments[course._id] || []).length ? (
                          (teacherAssignments[course._id] || []).map((assignment, index) => (
                            <div
                              key={`${course._id}-${index}`}
                              className="text-[11px] text-gray-600"
                            >
                              {assignment?.teacherId
                                ? safeDisplay(assignment.teacherId)
                                : "Teacher"}
                            </div>
                          ))
                        ) : (
                          <p className="text-[11px] text-gray-400">No teachers assigned</p>
                        )}
                      </div>
                    </td>
                    <td className="px-1 py-2 text-center text-sm text-gray-500">
                      {course.creditPoints?.lecture || 0}
                    </td>
                    <td className="px-1 py-2 text-center text-sm text-gray-500">
                      {course.creditPoints?.tutorial || 0}
                    </td>
                    <td className="px-1 py-2 text-center text-sm text-gray-500">
                      {course.creditPoints?.practical || 0}
                    </td>
                    <td className="px-1 py-2 text-center text-sm font-semibold text-gray-900">
                      {sumCourseCredits(course)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveCourse(course._id)}
                        disabled={savingCourse}
                        className="p-1 text-gray-400 hover:text-red-600"
                        title="Remove course"
                      >
                        <X size={16} />
                      </button>
                    </td>
                  </tr>
                ))}

                {!sortedCourses.length && (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-6 text-center text-sm text-gray-400"
                    >
                      No courses linked to this semester yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              Course Assignment (Admin Structure Flow)
            </h3>
            <p className="text-xs text-gray-500">
              Define structure first, then configure exactly C compulsory courses and E elective blocks.
            </p>
            {assignmentSource === "empty" && (
              <p className="mt-1 text-xs text-amber-700">
                Save structure to start selecting compulsory and elective courses.
              </p>
            )}
            {assignmentSource && (
              <p className="mt-1 text-[11px] text-gray-400">
                Loaded source: {assignmentSource}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={saveCourseAssignment}
            disabled={disableSaveAssignment}
            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Save size={14} />
            {assignmentSaving ? "Saving..." : "Save Assignment"}
          </button>
        </div>

	        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
	          <div className="mb-3 text-sm font-semibold text-gray-900">Define Structure</div>
	          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
	            <div>
	              <label className="mb-1 block text-[11px] uppercase tracking-widest text-gray-500">
	                Compulsory Count (C)
	              </label>
              <input
                type="number"
                min="0"
                value={structureDraft.compulsory_count}
                onChange={(event) =>
                  updateStructureDraftField("compulsory_count", event.target.value)
                }
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-widest text-gray-500">
                Compulsory Credit Target
              </label>
              <input
                type="number"
                min="0"
                value={structureDraft.compulsory_credit_target}
                onChange={(event) =>
                  updateStructureDraftField("compulsory_credit_target", event.target.value)
                }
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-widest text-gray-500">
                Elective Slot Count (E)
              </label>
              <input
                type="number"
                min="0"
                value={structureDraft.elective_slot_count}
                onChange={(event) =>
                  updateStructureDraftField("elective_slot_count", event.target.value)
                }
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-widest text-gray-500">
                Elective Credit Target
              </label>
              <input
                type="number"
                min="0"
                value={structureDraft.elective_credit_target}
                onChange={(event) =>
                  updateStructureDraftField("elective_credit_target", event.target.value)
                }
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
	            <div>
	              <label className="mb-1 block text-[11px] uppercase tracking-widest text-gray-500">
	                Total Credit
	              </label>
		              <input
		                value={
		                  structureCreditValidation.totalMissing
		                    ? "—"
		                    : structureDraft.credit_target_total
		                }
		                readOnly
		                disabled
		                className="w-full rounded border border-gray-200 bg-gray-100 px-2 py-1.5 text-sm text-gray-700"
		              />
	              <div className="mt-1 text-[11px] text-gray-500">
	                Read-only. Set in the previous step.
	              </div>
	            </div>
	          </div>
	          <div className="mt-2 space-y-1 text-xs">
	            <div className="text-gray-600">
	              Target Sum: {structureCreditValidation.sumTargets} / Total Credit:{" "}
	              {structureCreditValidation.totalMissing ? "-" : structureCreditValidation.total}
	            </div>
	            {structureCreditValidation.totalMissing && (
	              <div className="text-amber-700">
	                Total credit not set in previous step.
	              </div>
	            )}
	            {structureCreditValidation.overLimit && (
	              <div className="text-red-700">
	                Compulsory + Elective target credit cannot exceed Total Credit.
	              </div>
	            )}
	          </div>
	          <div className="mt-3 flex flex-wrap items-center gap-3">
	            <button
	              type="button"
	              onClick={saveStructure}
	              disabled={assignmentSaving || !programId || structureCreditInvalid}
	              className="rounded bg-gray-900 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
	            >
	              {assignmentSaving ? "Saving..." : "Save Structure"}
	            </button>
            {structureDirty && (
              <span className="text-xs text-amber-700">
                Structure changed. Save structure before saving assignment.
              </span>
            )}
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-gray-100 bg-gray-50">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-xs uppercase tracking-wider text-gray-600">
              <tr>
                <th className="px-3 py-2 text-left">Metric</th>
                <th className="px-3 py-2 text-center">Required</th>
                <th className="px-3 py-2 text-center">Selected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-gray-700">
              <tr>
                <td className="px-3 py-2">Compulsory Courses</td>
                <td className="px-3 py-2 text-center">{requiredCompulsory}</td>
                <td className="px-3 py-2 text-center">{selectedCompulsoryCount}</td>
              </tr>
              <tr>
                <td className="px-3 py-2">Elective Blocks</td>
                <td className="px-3 py-2 text-center">{requiredElectiveSlots}</td>
                <td className="px-3 py-2 text-center">{assignmentSummary.electiveBasketCount}</td>
              </tr>
	              <tr>
	                <td className="px-3 py-2">Compulsory Credits</td>
	                <td className="px-3 py-2 text-center">
	                  {creditTargetStatus.compulsory_credit_target === null
	                    ? "-"
	                    : creditTargetStatus.compulsory_credit_target}
	                </td>
	                <td className="px-3 py-2 text-center">{creditTargetStatus.compulsoryCredits}</td>
	              </tr>
	              {creditTargetStatus.basketContributions.map((slotSummary) => (
	                <tr key={`slot-credit-${slotSummary.basketIndex}`}>
	                  <td className="px-3 py-2">
	                    Elective Course {slotSummary.basketIndex + 1} Credits
	                  </td>
	                  <td className="px-3 py-2 text-center">-</td>
	                  <td className="px-3 py-2 text-center">
	                    {slotSummary.pickRule === PICK_RULE_ALL
	                      ? `Exact: ${slotSummary.contribution}`
	                      : slotSummary.pickRule === PICK_RULE_ANY_N
	                      ? `Contribution: ${slotSummary.commonCredit} x ${slotSummary.pickN || 1} = ${slotSummary.contribution}`
	                      : `Contribution: ${slotSummary.commonCredit}`}
	                  </td>
	                </tr>
	              ))}
	              <tr>
	                <td className="px-3 py-2">Elective Credit Target</td>
	                <td className="px-3 py-2 text-center">
	                  {creditTargetStatus.elective_credit_target === null
	                    ? "-"
	                    : creditTargetStatus.elective_credit_target}
	                </td>
	                <td className="px-3 py-2 text-center">
	                  {creditTargetStatus.electiveContributedCredits}
	                </td>
	              </tr>
	              <tr>
	                <td className="px-3 py-2">Total Selected Credits</td>
	                <td className="px-3 py-2 text-center">
	                  {creditTargetStatus.totalTargetDerived === null
	                    ? "-"
	                    : creditTargetStatus.totalTargetDerived}
	                </td>
	                <td className="px-3 py-2 text-center">
	                  {creditTargetStatus.totalSelectedCredits}
	                </td>
	              </tr>
	            </tbody>
	          </table>
	        </div>

	        <div className="flex flex-wrap items-center gap-2 text-xs">
	          <span className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-blue-800">
	            Total Credits: {creditTargetStatus.totalSelectedCredits}
	          </span>
	          {(creditTargetStatus.totalTargetDerived !== null ||
	            Boolean(assignmentPayload.enforce_credit_target)) && (
	            <span
	              className={`rounded border px-2 py-1 ${
	                Boolean(assignmentPayload.enforce_credit_target) &&
	                creditTargetStatus.mismatchErrors.length > 0
	                  ? "border-red-200 bg-red-50 text-red-700"
	                  : "border-gray-200 bg-gray-50 text-gray-700"
	              }`}
	            >
	              Target:{" "}
	              {creditTargetStatus.totalTargetDerived === null
	                ? "Not set"
	                : creditTargetStatus.totalTargetDerived}{" "}
	              | Selected: {creditTargetStatus.totalSelectedCredits}
	            </span>
		          )}
		        </div>

            {(creditTargetStatus.mismatchWarnings.length > 0 ||
              creditTargetStatus.missingCreditWarnings.length > 0) && (
              <div className="space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                {creditTargetStatus.mismatchWarnings.map((message) => (
                  <div key={`credit-warning-${message}`}>{message}</div>
                ))}
                {creditTargetStatus.missingCreditWarnings.map((message) => (
                  <div key={`credit-missing-${message}`}>{message}</div>
                ))}
              </div>
            )}

	        {assignmentLoading ? (
	          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-4 text-sm text-gray-500">
	            Loading assignment definition...
	          </div>
        ) : (
          <>
            <div
              className={`grid grid-cols-1 gap-4 lg:grid-cols-2 ${
                selectionLocked ? "pointer-events-none opacity-60" : ""
              }`}
            >
              <div className="rounded-lg border border-gray-200 p-3">
                <div className="mb-1 text-sm font-semibold text-gray-900">Compulsory Slots</div>
                <div className="mb-2 text-xs text-gray-500">
                  Filled {selectedCompulsoryCount}/{requiredCompulsory}
                </div>

                {requiredCompulsory === 0 ? (
                  <div className="rounded border border-dashed border-gray-300 px-3 py-4 text-center text-sm text-gray-400">
                    Set compulsory count (C) greater than 0 in structure.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(normalizedDraft.compulsorySlots || []).map((slot, slotIndex) => {
                      const courseId = toIdString(slot.courseId);
                      const course = sortedCourses.find(
                        (item) => toIdString(item._id) === courseId
                      );
                      return (
                        <div
                          key={slot.slotId || `comp-slot-${slotIndex}`}
                          className="rounded border border-gray-200 bg-white p-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">
                              Compulsory {slotIndex + 1}
                            </div>
                            {courseId ? (
                              <button
                                type="button"
                                onClick={() => clearCompulsorySlotCourse(slotIndex)}
                                className="text-[11px] text-gray-500 hover:text-red-600"
                              >
                                Clear
                              </button>
                            ) : null}
                          </div>

                          {courseId ? (
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-gray-900">
                                  {safeDisplay(course?.courseCode) || courseId}
                                </div>
                                <div className="truncate text-xs text-gray-500">
                                  {safeDisplay(course?.title)}
                                </div>
                              </div>
                              <div className="text-xs text-gray-400">
                                {course ? sumCourseCredits(course) : 0} cr
                              </div>
                            </div>
                          ) : (
                            <div className="mt-2 text-xs text-gray-400">
                              No course selected.
                            </div>
                          )}

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (import.meta?.env?.DEV) {
                                  console.debug("[ca][click-source]", {
                                    source: "SemesterCourseTable:pickExistingModal.open",
                                    kind: "compulsory",
                                    slotIndex,
                                  });
                                }
                                setCoursePicker({ kind: "compulsory", slotIndex });
                              }}
                              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                            >
                              + Existing Course
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (import.meta?.env?.DEV) {
                                  console.debug("[ca][click-source]", {
                                    source: "SemesterCourseTable:createCourseModal.open",
                                    kind: "compulsory",
                                    slotIndex,
                                  });
                                }
                                setPendingAssignTarget({ kind: "compulsory", slotIndex });
                                openAddPanel("new");
                              }}
                              className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-100"
                            >
                              + New Course
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {assignmentFieldErrors["compulsoryCourseIds"] && (
                  <p className="mt-2 text-xs text-red-600">
                    {assignmentFieldErrors["compulsoryCourseIds"]}
                  </p>
                )}
              </div>

              <div className="rounded-lg border border-gray-200 p-3">
                <div className="mb-2 text-sm font-semibold text-gray-900">Elective Blocks</div>
                <div className="mb-2 text-[11px] text-gray-500">
                  Compulsory and elective pools are strictly disjoint. Courses used in one pool are not eligible for the other.
                </div>

                {requiredElectiveSlots === 0 ? (
                  <div className="rounded border border-dashed border-gray-300 px-3 py-4 text-center text-sm text-gray-400">
                    Set elective slot count (E) greater than 0 in structure.
                  </div>
                ) : (
                  <div className="max-h-[32rem] space-y-3 overflow-y-auto pr-1">
                    {(normalizedDraft.electiveBlocks || []).map((block, blockIndex) => {
                      const blockErrors = getBasketErrors(blockIndex);
                      const options = Array.isArray(block.options) ? block.options : [];
                      return (
                        <div
                          key={block.blockId || `block-${blockIndex}`}
                          className="space-y-3 rounded border border-gray-200 bg-gray-50 p-3"
                        >
                          <div className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                            Elective Course {blockIndex + 1}
                          </div>

                          <div>
                            <label className="mb-1 block text-[11px] uppercase tracking-widest text-gray-500">
                              Rule
                            </label>
                            <select
                              value={block.rule}
                              onChange={(event) =>
                                updateElectiveBlockField(blockIndex, "rule", event.target.value)
                              }
                              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                            >
                              <option value={PICK_RULE_ANY_ONE}>ANY_ONE</option>
                              <option value={PICK_RULE_ANY_N}>ANY_N</option>
                              <option value={PICK_RULE_ALL}>ALL</option>
                            </select>
                            <p className="mt-1 text-[11px] text-gray-500">
                              {getRuleExplanation(block.rule, block.pickN || 1)}
                            </p>
                          </div>

                          {block.rule === PICK_RULE_ANY_N && (
                            <div>
                              <label className="mb-1 block text-[11px] uppercase tracking-widest text-gray-500">
                                N
                              </label>
                              <input
                                type="number"
                                min="1"
                                max={Math.max(1, options.length)}
                                value={block.pickN || 1}
                                onChange={(event) =>
                                  updateElectiveBlockField(blockIndex, "pickN", event.target.value)
                                }
                                className="w-28 rounded border border-gray-300 px-2 py-1.5 text-sm"
                              />
                            </div>
                          )}

                          <div>
                            <div className="mb-1 text-[11px] uppercase tracking-widest text-gray-500">
                              Candidate Courses ({options.length})
                            </div>
                            {options.length === 0 ? (
                              <div className="rounded border border-dashed border-gray-200 bg-white px-3 py-3 text-center text-xs text-gray-400">
                                No candidates yet. Add at least one.
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {options.map((courseId) => {
                                  const normalizedId = toIdString(courseId);
                                  const course = sortedCourses.find(
                                    (item) => toIdString(item._id) === normalizedId
                                  );
                                  return (
                                    <div
                                      key={`${block.blockId}-${normalizedId}`}
                                      className="flex items-center justify-between gap-2 rounded border border-gray-200 bg-white px-2 py-2 text-xs"
                                    >
                                      <div className="min-w-0">
                                        <div className="font-medium text-gray-900">
                                          {safeDisplay(course?.courseCode) || normalizedId}
                                        </div>
                                        <div className="truncate text-[11px] text-gray-500">
                                          {safeDisplay(course?.title)}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-gray-400">
                                          {course ? sumCourseCredits(course) : 0} cr
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => removeElectiveOption(blockIndex, normalizedId)}
                                          className="text-gray-400 hover:text-red-600"
                                          title="Remove candidate"
                                        >
                                          <X size={14} />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (import.meta?.env?.DEV) {
                                  console.debug("[ca][click-source]", {
                                    source: "SemesterCourseTable:pickExistingModal.open",
                                    kind: "elective",
                                    blockIndex,
                                  });
                                }
                                setCoursePicker({ kind: "elective", blockIndex });
                              }}
                              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                            >
                              + Existing Course
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (import.meta?.env?.DEV) {
                                  console.debug("[ca][click-source]", {
                                    source: "SemesterCourseTable:createCourseModal.open",
                                    kind: "elective",
                                    blockIndex,
                                  });
                                }
                                setPendingAssignTarget({ kind: "elective", blockIndex });
                                openAddPanel("new");
                              }}
                              className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-100"
                            >
                              + New Course
                            </button>
                          </div>

                          <div className="rounded border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700">
                            Elective Course {blockIndex + 1}: {block.rule === PICK_RULE_ALL
                              ? `All (${options.length} courses)`
                              : block.rule === PICK_RULE_ANY_N
                              ? `Any ${block.pickN || 1} of ${options.length}`
                              : `Any 1 of ${options.length}`}
                          </div>

                          {blockErrors.length > 0 && (
                            <div className="space-y-1 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                              {blockErrors.map((message) => (
                                <div key={`${block.blockId}-${message}`}>{message}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {(assignmentFieldErrors["electiveConfig.baskets"] ||
                  assignmentFieldErrors["electiveBaskets"]) && (
                  <p className="mt-2 text-xs text-red-600">
                    {assignmentFieldErrors["electiveConfig.baskets"] ||
                      assignmentFieldErrors["electiveBaskets"]}
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
		              <div className="mb-2 text-sm font-semibold text-gray-900">Elective Preview</div>
		              <div className="space-y-2 text-xs text-gray-700">
			                {(normalizedDraft.electiveBlocks || []).map((block, blockIndex) => {
			                  const previewCandidates = (block.options || [])
			                    .map((courseId) => toIdString(courseId))
			                    .filter((courseId) => courseId && !compulsoryIdSet.has(courseId));

			                  return (
			                    <div
			                      key={`preview-${block.blockId || blockIndex}`}
		                      className="rounded border border-gray-200 bg-white px-2 py-1.5"
		                    >
		                      <div className="font-medium">Elective Course {blockIndex + 1}</div>
		                      <div>
		                        Rule: {block.rule}
		                        {block.rule === PICK_RULE_ANY_N
		                          ? ` (N=${block.pickN || 1})`
		                          : ""}
		                      </div>
		                      <div className="text-gray-600">
		                        {getRuleExplanation(block.rule, block.pickN || 1)}
		                      </div>
			                      <div>
			                        Candidates ({previewCandidates.length}):{" "}
		                        {previewCandidates
		                          .map((courseId) => {
		                            const course = sortedCourses.find(
		                              (item) => toIdString(item._id) === toIdString(courseId)
		                            );
		                            return course ? safeDisplay(course.courseCode) : courseId;
		                          })
		                          .join(", ") || "None"}
	                      </div>
	                    </div>
	                  );
	                })}
		                {(normalizedDraft.electiveBlocks || []).length === 0 && (
		                  <div className="text-gray-500">No elective blocks configured.</div>
		                )}
		              </div>
	            </div>

            {localAssignmentWarnings.length > 0 && (
              <div className="space-y-1 rounded border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {localAssignmentWarnings.map((warning) => (
                  <div key={warning}>{warning}</div>
                ))}
              </div>
            )}

            {import.meta?.env?.DEV && (
              <div className="mt-2 text-[11px] text-gray-400">
                Course Assignment UI: CA_REDESIGN_V2
              </div>
            )}
          </>
        )}
      </div>

      <div className="pt-2">
        <button
          type="button"
          onClick={onAddSemester}
          disabled={!onAddSemester}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          + Add {periodLabel}
        </button>
      </div>

      <CoursePickerModal
        open={Boolean(coursePicker)}
        title={pickerTitle}
        subtitle={pickerSubtitle}
        courses={pickerEligibleCourses}
        onClose={() => setCoursePicker(null)}
        onSelect={handlePickerSelect}
      />
    </div>
  );
};

export default SemesterCourseTable;
