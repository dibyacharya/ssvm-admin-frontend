import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight, ChevronLeft, Search, X, BookOpen,
  AlertTriangle, Loader2, Check, Edit3, Save,
} from 'lucide-react';
import { getAllCourses, createCourse, lookupCourseByCode, updateCourse } from '../../services/courses.service';
import { updateSemesterCourseAssignment } from '../../services/program.service';
import { getPeriodLabel } from '../../utils/periodLabel';

/* ── Constants ── */
const PICK_RULE_ANY_ONE = 'ANY_ONE';
const PICK_RULE_ANY_N = 'ANY_N';
const PICK_RULE_ALL = 'ALL';

const emptyStructure = () => ({
  compulsory_count: '',
  compulsory_credit_target: '',
  elective_slot_count: '',
  elective_credit_target: '',
  enforce_credit_target: false,
});

const emptyDraft = () => ({
  structure: emptyStructure(),
  structureApplied: false,
  compulsorySlots: [],
  electiveBlocks: [],
});

const toIdString = (v) => (v == null ? '' : String(v));
const getSemId = (sem) => toIdString(sem?._id || sem?.id || sem?.tempId || '');
const toNum = (v, fb = 0) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : fb; };

const getCourseCredits = (course) => {
  if (!course) return 0;
  if (course.credits != null && course.credits !== '') return toNum(course.credits);
  const cp = course.creditPoints || {};
  return toNum(cp.totalCredits) || (toNum(cp.lecture) + toNum(cp.tutorial) + toNum(cp.practical));
};

/* ── Component ── */
const StepCourseAssignment = ({ state, dispatch, goNext, goBack }) => {
  const { semesters, coursesBySemester, programData } = state;
  const periodType = programData?.periodType || 'semester';
  const periodLabel = getPeriodLabel(periodType);

  const [activeTab, setActiveTab] = useState(getSemId(semesters[0]) || '');
  const [allCourses, setAllCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [drafts, setDrafts] = useState({});
  const [coursePicker, setCoursePicker] = useState(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerTab, setPickerTab] = useState('existing');
  const [newCourse, setNewCourse] = useState({ courseCode: '', title: '', lecture: '', tutorial: '', practical: '' });
  const [saveFlash, setSaveFlash] = useState(null);
  const [draftSaving, setDraftSaving] = useState(false);
  // Edit course inline: { kind: 'compulsory', slotIndex, course } or { kind: 'elective', blockIndex, courseId, course }
  const [editingCourse, setEditingCourse] = useState(null);

  /* ── Init drafts from wizard state ── */
  useEffect(() => {
    const initial = {};
    semesters.forEach((sem) => {
      const semId = getSemId(sem);
      if (!semId) return;
      const saved = coursesBySemester[semId];
      if (saved && typeof saved === 'object' && !Array.isArray(saved) && saved.structure) {
        initial[semId] = {
          structure: { ...emptyStructure(), ...saved.structure },
          structureApplied: true,
          compulsorySlots: Array.isArray(saved.compulsorySlots) ? saved.compulsorySlots : [],
          electiveBlocks: Array.isArray(saved.electiveBlocks) ? saved.electiveBlocks : [],
        };
      } else {
        initial[semId] = emptyDraft();
      }
    });
    setDrafts(initial);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Load courses (read-only) ── */
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingCourses(true);
      try {
        const data = await getAllCourses({ limit: 500 });
        if (cancelled) return;
        const courses = data?.courses || data || [];
        setAllCourses(Array.isArray(courses) ? courses : []);
      } catch { /* ignore */ }
      finally { if (!cancelled) setLoadingCourses(false); }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  /* ── Keep active tab valid ── */
  useEffect(() => {
    if (!semesters.length) { if (activeTab) setActiveTab(''); return; }
    const exists = semesters.some((s) => getSemId(s) === activeTab);
    if (!exists) setActiveTab(getSemId(semesters[0]));
  }, [semesters, activeTab]);

  /* ── Current draft ── */
  const draft = drafts[activeTab] || emptyDraft();
  const structure = draft.structure || emptyStructure();

  const updateDraft = useCallback((semId, updater) => {
    setDrafts((prev) => ({ ...prev, [semId]: updater(prev[semId] || emptyDraft()) }));
  }, []);

  /* ── Save current tab to wizard state ── */
  const saveTabToWizard = useCallback((semId, d) => {
    if (!semId || !d?.structureApplied) return;
    dispatch({
      type: 'SET_COURSES_FOR_SEMESTER',
      semesterId: semId,
      courses: {
        structure: { ...d.structure },
        structureApplied: true,
        compulsorySlots: [...(d.compulsorySlots || [])],
        electiveBlocks: [...(d.electiveBlocks || [])],
      },
    });
  }, [dispatch]);

  /* ── Structure handlers ── */
  const updateStructureField = (field, value) => {
    updateDraft(activeTab, (d) => ({
      ...d,
      structure: { ...d.structure, [field]: value },
    }));
  };

  const applyStructure = () => {
    const compCount = toNum(structure.compulsory_count);
    if (compCount === 0) {
      setSaveFlash({ type: 'error', message: 'Set compulsory count (C) > 0.' });
      setTimeout(() => setSaveFlash(null), 3000);
      return;
    }
    const elecCount = toNum(structure.elective_slot_count);

    updateDraft(activeTab, (d) => {
      const existSlots = d.compulsorySlots || [];
      const existBlocks = d.electiveBlocks || [];
      const slots = Array.from({ length: compCount }, (_, i) =>
        existSlots[i] || { slotIndex: i, course: null }
      );
      const blocks = Array.from({ length: elecCount }, (_, i) =>
        existBlocks[i] || { blockIndex: i, rule: PICK_RULE_ANY_ONE, pickN: 1, options: [] }
      );
      return { ...d, structureApplied: true, compulsorySlots: slots, electiveBlocks: blocks };
    });
  };

  /* ── Compulsory slot handlers ── */
  const assignCompulsoryCourse = (slotIndex, course) => {
    updateDraft(activeTab, (d) => {
      const slots = [...(d.compulsorySlots || [])];
      slots[slotIndex] = { ...slots[slotIndex], slotIndex, course };
      return { ...d, compulsorySlots: slots };
    });
  };
  const clearCompulsorySlot = (slotIndex) => assignCompulsoryCourse(slotIndex, null);

  /* ── Elective block handlers ── */
  const addElectiveOption = (blockIndex, course) => {
    updateDraft(activeTab, (d) => {
      const blocks = [...(d.electiveBlocks || [])];
      const block = { ...blocks[blockIndex] };
      const opts = [...(block.options || [])];
      if (opts.some((c) => (c._id || c.id) === (course._id || course.id))) return d;
      opts.push(course);
      block.options = opts;
      blocks[blockIndex] = block;
      return { ...d, electiveBlocks: blocks };
    });
  };

  const removeElectiveOption = (blockIndex, courseId) => {
    updateDraft(activeTab, (d) => {
      const blocks = [...(d.electiveBlocks || [])];
      const block = { ...blocks[blockIndex] };
      block.options = (block.options || []).filter((c) => toIdString(c._id || c.id) !== courseId);
      blocks[blockIndex] = block;
      return { ...d, electiveBlocks: blocks };
    });
  };

  const updateBlockField = (blockIndex, field, value) => {
    updateDraft(activeTab, (d) => {
      const blocks = [...(d.electiveBlocks || [])];
      blocks[blockIndex] = { ...blocks[blockIndex], [field]: value };
      return { ...d, electiveBlocks: blocks };
    });
  };

  /* ── Course picker filtering ── */
  const usedCompulsoryIds = useMemo(() => {
    const ids = new Set();
    (draft.compulsorySlots || []).forEach((s) => {
      if (s.course) ids.add(toIdString(s.course._id || s.course.id));
    });
    return ids;
  }, [draft.compulsorySlots]);

  const pickerEligible = useMemo(() => {
    if (!coursePicker) return [];
    const q = pickerSearch.toLowerCase().trim();
    let courses = allCourses;
    if (q) {
      courses = courses.filter(
        (c) =>
          (c.title || c.name || '').toLowerCase().includes(q) ||
          (c.courseCode || c.code || '').toLowerCase().includes(q)
      );
    }
    if (coursePicker.kind === 'compulsory') {
      courses = courses.filter((c) => {
        const cid = toIdString(c._id || c.id);
        if (!usedCompulsoryIds.has(cid)) return true;
        const cur = (draft.compulsorySlots || [])[coursePicker.slotIndex];
        return cur?.course && toIdString(cur.course._id || cur.course.id) === cid;
      });
    } else if (coursePicker.kind === 'elective') {
      courses = courses.filter((c) => !usedCompulsoryIds.has(toIdString(c._id || c.id)));
      const block = (draft.electiveBlocks || [])[coursePicker.blockIndex];
      const blockIds = new Set((block?.options || []).map((c) => toIdString(c._id || c.id)));
      courses = courses.filter((c) => !blockIds.has(toIdString(c._id || c.id)));
    }
    return courses.slice(0, 30);
  }, [coursePicker, pickerSearch, allCourses, usedCompulsoryIds, draft]);

  const handlePickerSelect = (course) => {
    if (!coursePicker) return;
    if (coursePicker.kind === 'compulsory') {
      assignCompulsoryCourse(coursePicker.slotIndex, course);
      setCoursePicker(null);
      setPickerSearch('');
    } else if (coursePicker.kind === 'elective') {
      addElectiveOption(coursePicker.blockIndex, course);
      // Keep open for adding multiple
    }
  };

  const handleCreateDraftCourse = () => {
    if (!newCourse.courseCode.trim() || !newCourse.title.trim()) return;
    const lecture = Number(newCourse.lecture) || 0;
    const tutorial = Number(newCourse.tutorial) || 0;
    const practical = Number(newCourse.practical) || 0;
    const draftCourse = {
      _id: `draft_course_${Date.now()}`,
      courseCode: newCourse.courseCode.trim(),
      title: newCourse.title.trim(),
      lecture,
      tutorial,
      practical,
      credits: lecture + tutorial + practical,
      isDraft: true,
    };
    if (coursePicker?.kind === 'compulsory') {
      assignCompulsoryCourse(coursePicker.slotIndex, draftCourse);
      setCoursePicker(null);
    } else if (coursePicker?.kind === 'elective') {
      addElectiveOption(coursePicker.blockIndex, draftCourse);
    }
    setNewCourse({ courseCode: '', title: '', lecture: '', tutorial: '', practical: '' });
    setPickerTab('existing');
  };

  /* ── Edit Course (inline) ── */
  const openEditCourse = (kind, index, course) => {
    const cp = course.creditPoints || {};
    setEditingCourse({
      kind, // 'compulsory' or 'elective'
      slotIndex: kind === 'compulsory' ? index : undefined,
      blockIndex: kind === 'elective' ? index.blockIndex : undefined,
      courseId: kind === 'elective' ? toIdString(course._id || course.id) : undefined,
      courseCode: course.courseCode || course.code || '',
      title: course.title || course.name || '',
      lecture: course.lecture ?? cp.lecture ?? '',
      tutorial: course.tutorial ?? cp.tutorial ?? '',
      practical: course.practical ?? cp.practical ?? '',
    });
  };

  const saveEditCourse = () => {
    if (!editingCourse) return;
    const lecture = Number(editingCourse.lecture) || 0;
    const tutorial = Number(editingCourse.tutorial) || 0;
    const practical = Number(editingCourse.practical) || 0;
    const updated = {
      courseCode: editingCourse.courseCode.trim(),
      title: editingCourse.title.trim(),
      lecture,
      tutorial,
      practical,
      credits: lecture + tutorial + practical,
    };
    if (!updated.courseCode || !updated.title) return;

    if (editingCourse.kind === 'compulsory') {
      updateDraft(activeTab, (d) => {
        const slots = [...(d.compulsorySlots || [])];
        const slot = slots[editingCourse.slotIndex];
        if (slot?.course) {
          slots[editingCourse.slotIndex] = {
            ...slot,
            course: { ...slot.course, ...updated },
          };
        }
        return { ...d, compulsorySlots: slots };
      });
    } else if (editingCourse.kind === 'elective') {
      updateDraft(activeTab, (d) => {
        const blocks = [...(d.electiveBlocks || [])];
        const block = { ...blocks[editingCourse.blockIndex] };
        block.options = (block.options || []).map((c) => {
          if (toIdString(c._id || c.id) === editingCourse.courseId) {
            return { ...c, ...updated };
          }
          return c;
        });
        blocks[editingCourse.blockIndex] = block;
        return { ...d, electiveBlocks: blocks };
      });
    }
    setEditingCourse(null);
  };

  /* ── Auto-save current tab to wizard state on draft changes ── */
  const prevDraftsRef = useRef(null);
  useEffect(() => {
    if (!activeTab) return;
    const d = drafts[activeTab];
    if (!d?.structureApplied) return;
    // Skip initial mount
    if (prevDraftsRef.current === null) {
      prevDraftsRef.current = drafts;
      return;
    }
    const timer = setTimeout(() => {
      saveTabToWizard(activeTab, d);
    }, 400);
    return () => clearTimeout(timer);
  }, [drafts, activeTab, saveTabToWizard]);

  /* ── Save Draft: persist course assignments to backend ── */
  const handleSaveDraft = async () => {
    const programId = state.programId;
    if (!programId || String(programId).startsWith('draft_') || String(programId).startsWith('temp_')) {
      setSaveFlash({ type: 'error', message: 'Please save program draft first (go to Step 1 and click Save Draft).' });
      setTimeout(() => setSaveFlash(null), 5000);
      return;
    }

    // Save all tabs to wizard state first
    Object.entries(drafts).forEach(([semId, d]) => {
      saveTabToWizard(semId, d);
    });

    setDraftSaving(true);
    setSaveFlash(null);

    const errors = [];
    let savedCount = 0;

    try {
      for (const [semId, data] of Object.entries(drafts)) {
        // Skip temp semesters and empty drafts
        if (String(semId).startsWith('temp_') || String(semId).startsWith('draft_')) {
          errors.push(`${semId}: Semester not saved to backend yet. Save Step 1 draft first.`);
          continue;
        }
        if (!data?.structureApplied) continue;

        const s = data.structure;
        const compCount = toNum(s.compulsory_count);
        const elecCount = toNum(s.elective_slot_count);
        if (compCount === 0 && elecCount === 0) continue;

        // Create any draft courses first
        const draftIdMap = {};
        const allDraftCourses = [
          ...(data.compulsorySlots || []).filter((sl) => sl.course?.isDraft).map((sl) => sl.course),
          ...(data.electiveBlocks || []).flatMap((b) =>
            (b.options || []).filter((c) => c.isDraft)
          ),
        ];
        const seenDraftIds = new Set();
        for (const dc of allDraftCourses) {
          if (seenDraftIds.has(dc._id)) continue;
          seenDraftIds.add(dc._id);
          try {
            const courseRes = await createCourse({
              courseCode: dc.courseCode,
              title: dc.title,
              creditPoints: {
                lecture: dc.lecture || 0,
                tutorial: dc.tutorial || 0,
                practical: dc.practical || 0,
              },
            });
            const created = courseRes.course || courseRes;
            if (created?._id) draftIdMap[dc._id] = created._id;
          } catch (err) {
            const msg = err?.response?.data?.error || err?.message || "Unknown error";
            // If course already exists, look it up by code and use existing ID
            if (msg.toLowerCase().includes("already exists")) {
              try {
                const existing = await lookupCourseByCode(dc.courseCode);
                const existingCourse = existing?.course || existing;
                if (existingCourse?._id) {
                  draftIdMap[dc._id] = existingCourse._id;
                  console.log(`[wizard][saveDraft] draft course ${dc.courseCode} already exists, using ID: ${existingCourse._id}`);
                  continue;
                }
              } catch (lookupErr) {
                // Lookup failed — fall through to error
              }
            }
            errors.push(`Failed to create course ${dc.courseCode}: ${msg}`);
          }
        }

        // Update credit values for existing (non-draft) courses that may have been edited
        const allEditedCourses = [
          ...(data.compulsorySlots || [])
            .filter((sl) => sl.course && !sl.course.isDraft)
            .map((sl) => sl.course),
          ...(data.electiveBlocks || [])
            .flatMap((b) => (b.options || []).filter((c) => !c.isDraft)),
        ];
        for (const course of allEditedCourses) {
          const courseCode = course.courseCode || course.code;
          if (!courseCode) continue;
          const lecture = Number(course.lecture ?? course.creditPoints?.lecture ?? 0);
          const tutorial = Number(course.tutorial ?? course.creditPoints?.tutorial ?? 0);
          const practical = Number(course.practical ?? course.creditPoints?.practical ?? 0);
          try {
            await updateCourse(courseCode, {
              courseCode,
              title: course.title || course.name,
              creditPoints: { lecture, tutorial, practical },
            });
          } catch (err) {
            console.log(`[wizard][saveDraft] failed to update course ${courseCode} credits:`, err?.message);
          }
        }

        const resolveId = (id) => draftIdMap[id] || id;

        // Build compulsory course IDs
        const compulsoryCourseIds = (data.compulsorySlots || [])
          .filter((sl) => sl.course)
          .map((sl) => resolveId(sl.course._id || sl.course.id))
          .filter(Boolean);

        // Build elective baskets
        const baskets = (data.electiveBlocks || []).map((block, idx) => ({
          basketId: `basket_${idx}`,
          rule: block.rule || 'ANY_ONE',
          pickN: block.pickN || 1,
          options: (block.options || [])
            .map((c) => resolveId(c._id || c.id))
            .filter(Boolean),
        }));

        try {
          const sem = semesters.find((ss) => getSemId(ss) === semId);
          await updateSemesterCourseAssignment(programId, semId, {
            compulsory_count: compCount,
            elective_slot_count: elecCount,
            compulsory_credit_target: toNum(s.compulsory_credit_target),
            elective_credit_target: toNum(s.elective_credit_target),
            credit_target_total: toNum(sem?.totalCredits),
            enforce_credit_target: Boolean(s.enforce_credit_target),
            finalizeStructure: true,
            compulsoryCourseIds,
            electiveConfig: { mode: 'BASKET', baskets, tracks: [] },
          });
          savedCount++;
        } catch (err) {
          const semName = semesters.find((ss) => getSemId(ss) === semId)?.name || semId;
          const details = err?.response?.data?.details;
          const detailMsg = Array.isArray(details) ? details.map((d) => d.message).join('; ') : '';
          errors.push(`${semName}: ${detailMsg || err?.response?.data?.error || err?.message || 'Unknown error'}`);
        }
      }

      if (errors.length > 0 && savedCount === 0) {
        setSaveFlash({ type: 'error', message: `Draft save failed: ${errors.join('. ')}` });
      } else if (errors.length > 0) {
        setSaveFlash({ type: 'error', message: `Saved ${savedCount} semester(s), but some had errors: ${errors.join('. ')}` });
      } else if (savedCount > 0) {
        setSaveFlash({ type: 'success', message: `Course assignments saved for ${savedCount} semester(s)!` });
        dispatch({ type: 'MARK_COMPLETE', step: 2 });
      } else {
        setSaveFlash({ type: 'error', message: 'Nothing to save. Apply structure and add courses first, then save.' });
      }
      setTimeout(() => setSaveFlash(null), 6000);
    } catch (err) {
      setSaveFlash({ type: 'error', message: `Draft save failed: ${err?.message || 'Unknown error'}` });
      setTimeout(() => setSaveFlash(null), 5000);
    } finally {
      setDraftSaving(false);
    }
  };

  /* ── Continue ── */
  const handleContinue = () => {
    // Save ALL semester tabs to wizard state (not just the active one)
    Object.entries(drafts).forEach(([semId, d]) => {
      saveTabToWizard(semId, d);
    });
    dispatch({ type: 'MARK_COMPLETE', step: 2 });
    goNext();
  };

  /* ── Metrics ── */
  const compCount = toNum(structure.compulsory_count);
  const selectedComp = (draft.compulsorySlots || []).filter((s) => s.course).length;
  const elecSlotCount = toNum(structure.elective_slot_count);
  const configuredElec = (draft.electiveBlocks || []).filter((b) => (b.options || []).length > 0).length;
  const compCredits = (draft.compulsorySlots || []).reduce(
    (sum, s) => sum + (s.course ? getCourseCredits(s.course) : 0), 0
  );
  const semTotalCredits = semesters.find((s) => getSemId(s) === activeTab)?.totalCredits;

  /* ── No semesters ── */
  if (semesters.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Course Assignment</h1>
        <hr className="my-6 border-gray-200" />
        <div className="text-center py-12">
          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
          <p className="text-sm text-gray-500 mb-6">
            No {periodLabel.toLowerCase()}s created yet. Go back to add them, or skip.
          </p>
          <div className="flex items-center justify-center gap-4">
            <button onClick={goBack} className="inline-flex items-center px-5 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 transition">
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </button>
            <button onClick={handleContinue} className="inline-flex items-center px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition">
              Skip & Continue <ChevronRight className="w-4 h-4 ml-2" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Course Assignment</h1>
      <p className="mt-1 text-sm text-gray-500">
        Define course structure for each {periodLabel.toLowerCase()}.
      </p>
      <hr className="my-6 border-gray-200" />

      {/* ── Semester tabs ── */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
        {semesters.map((sem) => {
          const semId = getSemId(sem);
          const saved = coursesBySemester[semId];
          const hasSaved = saved && typeof saved === 'object' && !Array.isArray(saved) && saved.structure;
          const isActive = activeTab === semId;
          return (
            <button
              key={semId || sem.name}
              onClick={() => {
                if (activeTab !== semId) {
                  saveTabToWizard(activeTab, drafts[activeTab]);
                  setActiveTab(semId);
                  setCoursePicker(null);
                  setPickerSearch('');
                }
              }}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {sem.name}
              {hasSaved && (
                <Check className={`inline w-3.5 h-3.5 ml-1.5 ${isActive ? 'text-blue-200' : 'text-green-500'}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Per-semester content ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="space-y-4"
        >
          {/* ── Define Structure ── */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="mb-3 text-sm font-semibold text-gray-900">Course Plan</div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
              <div>
                <label className="mb-1 block text-[11px] uppercase tracking-widest text-gray-500">
                  Compulsory Count (C) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number" min="0"
                  value={structure.compulsory_count}
                  onChange={(e) => updateStructureField('compulsory_count', e.target.value)}
                  placeholder="0"
                  className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] uppercase tracking-widest text-gray-500">
                  Compulsory Credit Target
                </label>
                <input
                  type="number" min="0"
                  value={structure.compulsory_credit_target}
                  onChange={(e) => updateStructureField('compulsory_credit_target', e.target.value)}
                  placeholder="0"
                  className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] uppercase tracking-widest text-gray-500">
                  Elective Slot Count (E)
                </label>
                <input
                  type="number" min="0"
                  value={structure.elective_slot_count}
                  onChange={(e) => updateStructureField('elective_slot_count', e.target.value)}
                  placeholder="0"
                  className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] uppercase tracking-widest text-gray-500">
                  Elective Credit Target
                </label>
                <input
                  type="number" min="0"
                  value={structure.elective_credit_target}
                  onChange={(e) => updateStructureField('elective_credit_target', e.target.value)}
                  placeholder="0"
                  className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] uppercase tracking-widest text-gray-500">
                  Total Credit
                </label>
                <input
                  value={semTotalCredits || '—'}
                  readOnly disabled
                  className="w-full rounded border border-gray-200 bg-gray-100 px-2 py-1.5 text-sm text-gray-700"
                />
                <div className="mt-1 text-[10px] text-gray-400">Set in Step 1</div>
              </div>
            </div>

            <label className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-gray-700">
              <input
                type="checkbox"
                checked={Boolean(structure.enforce_credit_target)}
                onChange={(e) => updateStructureField('enforce_credit_target', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Enforce Credit Target
            </label>

            <div className="mt-2 text-xs text-gray-500">
              Target Sum: {toNum(structure.compulsory_credit_target) + toNum(structure.elective_credit_target)}
              {semTotalCredits ? ` / Total Credit: ${semTotalCredits}` : ''}
            </div>

            <div className="mt-3">
              <button
                type="button"
                onClick={applyStructure}
                disabled={!structure.compulsory_count}
                className="rounded bg-gray-900 px-3 py-2 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Apply Plan
              </button>
              {!draft.structureApplied && (
                <span className="ml-3 text-xs text-amber-600">
                  Click &quot;Apply Plan&quot; to generate slots.
                </span>
              )}
            </div>
          </div>

          {/* ── Metrics table ── */}
          {draft.structureApplied && (
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
                    <td className="px-3 py-2 text-center">{compCount}</td>
                    <td className="px-3 py-2 text-center">{selectedComp}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2">Elective Blocks</td>
                    <td className="px-3 py-2 text-center">{elecSlotCount}</td>
                    <td className="px-3 py-2 text-center">{configuredElec}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2">Compulsory Credits</td>
                    <td className="px-3 py-2 text-center">{structure.compulsory_credit_target || '—'}</td>
                    <td className="px-3 py-2 text-center">{compCredits}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* ── Compulsory & Elective grid ── */}
          {draft.structureApplied && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* Compulsory Slots */}
              <div className="rounded-lg border border-gray-200 p-3">
                <div className="mb-1 text-sm font-semibold text-gray-900">Compulsory Slots</div>
                <div className="mb-2 text-xs text-gray-500">Filled {selectedComp}/{compCount}</div>

                {compCount === 0 ? (
                  <div className="rounded border border-dashed border-gray-300 px-3 py-4 text-center text-sm text-gray-400">
                    Set compulsory count (C) &gt; 0 in structure.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(draft.compulsorySlots || []).map((slot, idx) => (
                      <div key={`comp-${idx}`} className="rounded border border-gray-200 bg-white p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">
                            Compulsory {idx + 1}
                          </div>
                          {slot.course && (
                            <div className="flex items-center gap-2">
                              <button type="button"
                                onClick={() => openEditCourse('compulsory', idx, slot.course)}
                                className="text-[11px] text-gray-500 hover:text-blue-600 inline-flex items-center gap-0.5">
                                <Edit3 size={12} /> Edit
                              </button>
                              <button type="button" onClick={() => clearCompulsorySlot(idx)}
                                className="text-[11px] text-gray-500 hover:text-red-600">
                                Clear
                              </button>
                            </div>
                          )}
                        </div>

                        {slot.course ? (
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-gray-900">
                                {slot.course.courseCode || slot.course.code}
                              </div>
                              <div className="truncate text-xs text-gray-500">
                                {slot.course.title || slot.course.name}
                              </div>
                            </div>
                            <div className="text-xs text-gray-400 flex-shrink-0">
                              {getCourseCredits(slot.course)} cr
                              {slot.course.isDraft && <span className="ml-1 text-amber-600">(draft)</span>}
                            </div>
                          </div>
                        ) : (
                          <div className="mt-2 text-xs text-gray-400">No course selected.</div>
                        )}

                        <div className="mt-3">
                          <button type="button"
                            onClick={() => { setCoursePicker({ kind: 'compulsory', slotIndex: idx }); setPickerSearch(''); setPickerTab('existing'); }}
                            className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-100">
                            + Add Course
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Elective Blocks */}
              <div className="rounded-lg border border-gray-200 p-3">
                <div className="mb-2 text-sm font-semibold text-gray-900">Elective Blocks</div>
                <div className="mb-2 text-[11px] text-gray-500">
                  Compulsory and elective pools are strictly disjoint.
                </div>

                {elecSlotCount === 0 ? (
                  <div className="rounded border border-dashed border-gray-300 px-3 py-4 text-center text-sm text-gray-400">
                    Elective is optional. Set elective slot count (E) &gt; 0 to add.
                  </div>
                ) : (
                  <div className="max-h-[32rem] space-y-3 overflow-y-auto pr-1">
                    {(draft.electiveBlocks || []).map((block, bIdx) => {
                      const options = Array.isArray(block.options) ? block.options : [];
                      return (
                        <div key={`block-${bIdx}`} className="space-y-3 rounded border border-gray-200 bg-gray-50 p-3">
                          <div className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                            Elective Course {bIdx + 1}
                          </div>

                          <div>
                            <label className="mb-1 block text-[11px] uppercase tracking-widest text-gray-500">Rule</label>
                            <select
                              value={block.rule || PICK_RULE_ANY_ONE}
                              onChange={(e) => updateBlockField(bIdx, 'rule', e.target.value)}
                              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm">
                              <option value={PICK_RULE_ANY_ONE}>ANY_ONE — Pick 1</option>
                              <option value={PICK_RULE_ANY_N}>ANY_N — Pick N</option>
                              <option value={PICK_RULE_ALL}>ALL — All required</option>
                            </select>
                          </div>

                          {block.rule === PICK_RULE_ANY_N && (
                            <div>
                              <label className="mb-1 block text-[11px] uppercase tracking-widest text-gray-500">N</label>
                              <input type="number" min="1"
                                value={block.pickN || 1}
                                onChange={(e) => updateBlockField(bIdx, 'pickN', e.target.value)}
                                className="w-28 rounded border border-gray-300 px-2 py-1.5 text-sm" />
                            </div>
                          )}

                          <div>
                            <div className="mb-1 text-[11px] uppercase tracking-widest text-gray-500">
                              Candidates ({options.length})
                            </div>
                            {options.length === 0 ? (
                              <div className="rounded border border-dashed border-gray-200 bg-white px-3 py-3 text-center text-xs text-gray-400">
                                No candidates yet. Add at least one.
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {options.map((course) => {
                                  const cId = toIdString(course._id || course.id);
                                  return (
                                    <div key={cId} className="flex items-center justify-between gap-2 rounded border border-gray-200 bg-white px-2 py-2 text-xs">
                                      <div className="min-w-0">
                                        <div className="font-medium text-gray-900">{course.courseCode || course.code}</div>
                                        <div className="truncate text-[11px] text-gray-500">{course.title || course.name}</div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-gray-400">
                                          {getCourseCredits(course)} cr
                                          {course.isDraft && <span className="text-amber-600"> (draft)</span>}
                                        </span>
                                        <button type="button"
                                          onClick={() => openEditCourse('elective', { blockIndex: bIdx }, course)}
                                          className="text-gray-400 hover:text-blue-600" title="Edit course">
                                          <Edit3 size={14} />
                                        </button>
                                        <button type="button" onClick={() => removeElectiveOption(bIdx, cId)}
                                          className="text-gray-400 hover:text-red-600" title="Remove">
                                          <X size={14} />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          <div className="mt-1">
                            <button type="button"
                              onClick={() => { setCoursePicker({ kind: 'elective', blockIndex: bIdx }); setPickerSearch(''); setPickerTab('existing'); }}
                              className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-100">
                              + Add Course
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Draft auto-saves — no manual save button needed */}
        </motion.div>
      </AnimatePresence>

      {/* ── Navigation ── */}
      <div className="flex items-center justify-between pt-8">
        <button onClick={goBack}
          className="inline-flex items-center px-5 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 transition">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </button>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-3">
            <button onClick={handleContinue}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition">
              Continue <ChevronRight className="w-4 h-4 ml-2" />
            </button>
          </div>
          <div className="text-[11px] text-gray-400">
            Course assignment is optional — you can complete it later.
          </div>
        </div>
      </div>

      {/* ── Course Picker Modal ── */}
      {coursePicker && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) { setCoursePicker(null); setPickerSearch(''); } }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  {coursePicker.kind === 'compulsory'
                    ? `Select Course — Compulsory ${coursePicker.slotIndex + 1}`
                    : `Add Course — Elective ${coursePicker.blockIndex + 1}`}
                </h3>
              </div>
              <button onClick={() => { setCoursePicker(null); setPickerSearch(''); setPickerTab('existing'); }}
                className="p-1 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex border-b border-gray-200 px-5">
              <button onClick={() => setPickerTab('existing')}
                className={`px-3 py-2 text-xs font-medium border-b-2 transition ${
                  pickerTab === 'existing' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>
                Existing Course
              </button>
              <button onClick={() => setPickerTab('new')}
                className={`px-3 py-2 text-xs font-medium border-b-2 transition ${
                  pickerTab === 'new' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>
                Create New (Draft)
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {pickerTab === 'existing' ? (
                <>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" value={pickerSearch}
                      onChange={(e) => setPickerSearch(e.target.value)}
                      placeholder="Search by name or code..."
                      autoFocus
                      className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                  </div>
                  {loadingCourses ? (
                    <div className="flex items-center gap-2 py-4 text-sm text-gray-500 justify-center">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                    </div>
                  ) : pickerEligible.length === 0 ? (
                    <div className="text-center py-6 text-sm text-gray-400">
                      {pickerSearch ? `No courses found for "${pickerSearch}"` : 'No courses available.'}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {pickerEligible.map((course) => {
                        const cId = toIdString(course._id || course.id);
                        return (
                          <button key={cId} onClick={() => handlePickerSelect(course)}
                            className="w-full text-left px-3 py-2.5 rounded-md text-sm hover:bg-blue-50 transition flex items-center justify-between">
                            <div>
                              <span className="font-medium text-gray-900">{course.courseCode || course.code}</span>
                              <span className="mx-2 text-gray-300">—</span>
                              <span className="text-gray-700">{course.title || course.name}</span>
                            </div>
                            <span className="text-xs text-gray-400 flex-shrink-0">{getCourseCredits(course)} cr</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-gray-500">
                    Create a draft course. It will be saved to the system on final setup.
                  </p>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Course Code *</label>
                    <input type="text" value={newCourse.courseCode}
                      onChange={(e) => setNewCourse((p) => ({ ...p, courseCode: e.target.value }))}
                      placeholder="e.g. CS101"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
                    <input type="text" value={newCourse.title}
                      onChange={(e) => setNewCourse((p) => ({ ...p, title: e.target.value }))}
                      placeholder="e.g. Introduction to Programming"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Credit Points (L-T-P)</label>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-0.5">Lecture (L)</label>
                        <input type="number" min="0" value={newCourse.lecture}
                          onChange={(e) => setNewCourse((p) => ({ ...p, lecture: e.target.value }))}
                          placeholder="0"
                          className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-0.5">Tutorial (T)</label>
                        <input type="number" min="0" value={newCourse.tutorial}
                          onChange={(e) => setNewCourse((p) => ({ ...p, tutorial: e.target.value }))}
                          placeholder="0"
                          className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-0.5">Practical (P)</label>
                        <input type="number" min="0" value={newCourse.practical}
                          onChange={(e) => setNewCourse((p) => ({ ...p, practical: e.target.value }))}
                          placeholder="0"
                          className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1">
                      Total Credits: {(Number(newCourse.lecture) || 0) + (Number(newCourse.tutorial) || 0) + (Number(newCourse.practical) || 0)}
                    </div>
                  </div>
                  <button type="button" onClick={handleCreateDraftCourse}
                    disabled={!newCourse.courseCode.trim() || !newCourse.title.trim()}
                    className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition">
                    Create & Assign
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Course Modal ── */}
      {editingCourse && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setEditingCourse(null); }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Edit Course</h3>
              <button onClick={() => setEditingCourse(null)}
                className="p-1 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Course Code</label>
                <input type="text" value={editingCourse.courseCode}
                  onChange={(e) => setEditingCourse((p) => ({ ...p, courseCode: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
                <input type="text" value={editingCourse.title}
                  onChange={(e) => setEditingCourse((p) => ({ ...p, title: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Credit Points (L-T-P)</label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-0.5">Lecture (L)</label>
                    <input type="number" min="0" value={editingCourse.lecture}
                      onChange={(e) => setEditingCourse((p) => ({ ...p, lecture: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-0.5">Tutorial (T)</label>
                    <input type="number" min="0" value={editingCourse.tutorial}
                      onChange={(e) => setEditingCourse((p) => ({ ...p, tutorial: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-0.5">Practical (P)</label>
                    <input type="number" min="0" value={editingCourse.practical}
                      onChange={(e) => setEditingCourse((p) => ({ ...p, practical: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                  </div>
                </div>
                <div className="text-[10px] text-gray-400 mt-1">
                  Total Credits: {(Number(editingCourse.lecture) || 0) + (Number(editingCourse.tutorial) || 0) + (Number(editingCourse.practical) || 0)}
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEditingCourse(null)}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button type="button" onClick={saveEditCourse}
                  disabled={!editingCourse.courseCode.trim() || !editingCourse.title.trim()}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition">
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StepCourseAssignment;
