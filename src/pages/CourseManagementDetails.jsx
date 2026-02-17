import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  getCourseDescription,
  getCourseTaxonomyCategories,
  getCourseTaxonomySubcategories,
  updateCourseDescription,
  getCourseMaterials,
  getAdminCourseMaterials,
  addCourseMaterialItem,
  updateCourseMaterialItem,
  deleteCourseMaterialItem,
  getCourseStudents,
} from "../services/courses.service";
import { useAuth } from "../contexts/AuthContext";
import {
  NCRF_LEVEL_OPTIONS as TOP_LEVEL_NCRF_LEVEL_OPTIONS,
  NCRF_LEVEL_VALUES as TOP_LEVEL_NCRF_LEVEL_VALUES,
} from "../constants/ncrf";

const tabs = [
  { id: "description", label: "Course Description" },
  { id: "material", label: "Course Material" },
  { id: "students", label: "Course Students" },
];

const NCRF_LEVEL_OPTIONS = [4.5, 5, 6, 6.5, 7, 8];
const defaultOutcomeRows = Array.from({ length: 6 }, (_, index) => ({
  code: `CO${index + 1}`,
  outcome: "",
  bloomLevel: "",
  ncrfLevel: "",
  weightage: "",
}));
const defaultCoCodes = Array.from({ length: 6 }, (_, index) => `CO${index + 1}`);
const defaultMoCodes = Array.from({ length: 6 }, (_, index) => `MO${index + 1}`);
const materialCategoryConfig = [
  {
    type: "pdf",
    label: "PDFs",
    isFile: true,
    accept: ".pdf,application/pdf",
    helper: "Upload PDF files.",
  },
  {
    type: "presentation",
    label: "Presentations",
    isFile: true,
    accept:
      ".ppt,.pptx,.pdf,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation",
    helper: "Upload PPT/PPTX/PDF slides.",
  },
  {
    type: "video",
    label: "Videos",
    isFile: false,
    accept: "",
    helper: "Add a video URL (YouTube/Drive/etc.).",
  },
  {
    type: "link",
    label: "Links",
    isFile: false,
    accept: "",
    helper: "Add a learning resource URL (must start with http/https).",
  },
];

const emptyDescription = {
  nameOfCourse: "",
  ncrfLevel: "",
  courseType: "theory",
  categoryId: "",
  subcategoryIds: [],
  courseCredits: 1,
  kiitxCourseCode: "",
  offeredBySchool: "",
  mediumOfInstruction: "English",
  developedFor: "",
  coordinator: null,
  introduction: "",
  prerequisites: [],
  courseOutcomes: defaultOutcomeRows,
  moduleOutcomes: [],
  syllabus: [],
  referenceBooks: [],
  journals: [],
  onlineResources: [],
  moocs: [],
};

const toRole = (role) => (role || "").toString().toLowerCase();
const validTopLevelNcrfValueSet = new Set(
  TOP_LEVEL_NCRF_LEVEL_OPTIONS.map((option) => String(option.value))
);
const validCourseOutcomeNcrfValueSet = new Set(NCRF_LEVEL_OPTIONS.map((value) => String(value)));

const buildStepOptions = (min = 0.05, max = 1, step = 0.05) => {
  const minInt = Math.round(Number(min) * 100);
  const maxInt = Math.round(Number(max) * 100);
  const stepInt = Math.round(Number(step) * 100);
  if (!Number.isFinite(minInt) || !Number.isFinite(maxInt) || !Number.isFinite(stepInt)) {
    return [];
  }
  if (stepInt <= 0 || minInt <= 0 || maxInt < minInt) {
    return [];
  }
  const options = [];
  for (let value = minInt; value <= maxInt; value += stepInt) {
    options.push((value / 100).toFixed(2));
  }
  return options;
};

const COURSE_OUTCOME_WEIGHTAGE_OPTIONS = buildStepOptions(0.05, 1, 0.05);

const normalizeNcrfLevel = (value) => {
  if (value === undefined || value === null || value === "") return "";
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return "";
  const normalized = String(parsed);
  return validCourseOutcomeNcrfValueSet.has(normalized) ? parsed : "";
};

const normalizeWeightageValue = (value) => {
  if (value === undefined || value === null || value === "") return "";
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return "";

  const min = 0.05;
  const max = 1;
  const step = 0.05;
  const clamped = Math.min(Math.max(parsed, min), max);
  const stepCount = Math.round((clamped - min) / step);
  const rounded = min + stepCount * step;
  return rounded.toFixed(2);
};

const normalizeTimeWeightageValue = (value) => {
  if (value === undefined || value === null || value === "") return "";
  const raw = String(value).trim();
  if (!raw) return "";
  let parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return "";

  // Legacy inputs may be stored as percentages (e.g. "20%"). Treat that as 0.20.
  if (raw.includes("%") && parsed > 1) {
    parsed = parsed / 100;
  }

  const min = 0.05;
  const max = 1;
  const step = 0.05;
  const clamped = Math.min(Math.max(parsed, min), max);
  const stepCount = Math.round((clamped - min) / step);
  const rounded = min + stepCount * step;
  return rounded.toFixed(2);
};

const toNcrfSelectValue = (value) => {
  if (value === undefined || value === null || value === "") return "";
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return "";
  const normalized = String(parsed);
  return validTopLevelNcrfValueSet.has(normalized) ? normalized : "";
};

const normalizeCode = (value) => (value || "").toString().trim().toUpperCase();

const normalizeCodeList = (values = []) =>
  Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => normalizeCode(value))
        .filter(Boolean)
    )
  );

const normalizeObjectIdValue = (value) => {
  const normalized = (value || "").toString().trim();
  return normalized || "";
};

const normalizeObjectIdList = (values = []) =>
  Array.from(
    new Set(
      (Array.isArray(values) ? values : [values])
        .map((value) => normalizeObjectIdValue(value?._id || value))
        .filter(Boolean)
    )
  );

const normalizeCourseOutcomeRowsForUi = (rows = []) => {
  const sourceRows = Array.isArray(rows) ? rows : [];
  return defaultOutcomeRows.map((defaultRow, index) => {
    const code = defaultRow.code || `CO${index + 1}`;
    const matchedRow =
      sourceRows.find((row) => normalizeCode(row?.code) === code) ||
      sourceRows[index] ||
      {};
    return {
      code,
      outcome: (matchedRow?.outcome || "").toString(),
      bloomLevel: (matchedRow?.bloomLevel || "").toString(),
      ncrfLevel: normalizeNcrfLevel(matchedRow?.ncrfLevel),
      weightage: normalizeWeightageValue(matchedRow?.weightage),
    };
  });
};

const CourseManagementDetails = () => {
  const { courseId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState("description");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [descriptionFieldError, setDescriptionFieldError] = useState("");
  const [descriptionErrorDetails, setDescriptionErrorDetails] = useState([]);
  const [courseOutcomeErrors, setCourseOutcomeErrors] = useState({});
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const [description, setDescription] = useState(emptyDescription);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [subcategoryOptions, setSubcategoryOptions] = useState([]);
  const [taxonomyLoading, setTaxonomyLoading] = useState(false);
  const [materials, setMaterials] = useState({
    courseId: "",
    modules: [],
  });
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [materialSaving, setMaterialSaving] = useState(false);
  const [selectedModuleNo, setSelectedModuleNo] = useState(null);
  const [materialDrafts, setMaterialDrafts] = useState({
    pdf: { title: "", file: null, url: "" },
    presentation: { title: "", file: null, url: "" },
    video: { title: "", file: null, url: "" },
    link: { title: "", file: null, url: "" },
  });
  const [editingMaterialId, setEditingMaterialId] = useState("");
  const [editingMaterialDraft, setEditingMaterialDraft] = useState({
    title: "",
    url: "",
    file: null,
    type: "",
  });

  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [filters, setFilters] = useState({
    program: "",
    stream: "",
    batch: "",
    semester: "",
    stage: "",
    status: "",
    teacher: "",
  });
  const moduleOutcomesSectionRef = useRef(null);
  const syllabusSectionRef = useRef(null);
  const referenceBooksSectionRef = useRef(null);
  const journalsSectionRef = useRef(null);
  const onlineResourcesSectionRef = useRef(null);
  const moocsSectionRef = useRef(null);

  const normalizedUserRole = toRole(user?.role === "Super Admin" ? "admin" : user?.role);
  const isAdmin = normalizedUserRole === "admin";
  const isTeacher = normalizedUserRole === "teacher";
  const isCoordinator =
    description?.coordinator?._id &&
    user?._id &&
    description.coordinator._id.toString() === user._id.toString();
  const canEditDescription = isAdmin || isCoordinator;
  const canManageMaterials = isAdmin;
  const canViewMaterials = isAdmin || isTeacher || isCoordinator;
  const canViewStudents = isAdmin || isTeacher || isCoordinator;
  const safeCredits =
    Number.isFinite(Number(description.courseCredits)) &&
    Number(description.courseCredits) >= 1
      ? Number(description.courseCredits)
      : 1;
  const coMappingOptions = useMemo(() => {
    const courseOutcomeCodes = normalizeCodeList(
      (Array.isArray(description.courseOutcomes) ? description.courseOutcomes : [])
        .map((row) => row?.code)
        .filter((code) => /^CO[1-6]$/i.test((code || "").toString()))
    );
    return courseOutcomeCodes.length ? courseOutcomeCodes : defaultCoCodes;
  }, [description.courseOutcomes]);

  const ncrfSummary = useMemo(() => {
    const rows = Array.isArray(description.courseOutcomes)
      ? description.courseOutcomes
      : [];
    const totals = rows.reduce(
      (acc, row) => {
        const level = normalizeNcrfLevel(row?.ncrfLevel);
        const weight = Number.parseFloat(row?.weightage);
        if (level !== "" && Number.isFinite(weight) && weight > 0) {
          acc.weighted += level * weight;
          acc.weight += weight;
          acc.includedRows += 1;
        }
        return acc;
      },
      { weighted: 0, weight: 0, includedRows: 0 }
    );
    const avgFromRows = totals.weight > 0 ? totals.weighted / totals.weight : null;
    const avgFromResponse = Number(description?.avgNcrfLevel);
    const finalAvg =
      avgFromRows !== null
        ? avgFromRows
        : Number.isFinite(avgFromResponse)
        ? avgFromResponse
        : 0;

    return {
      averageValue: finalAvg,
      averageDisplay: finalAvg.toFixed(2),
      includedRows: totals.includedRows,
    };
  }, [description.avgNcrfLevel, description.courseOutcomes]);

  const courseOutcomesForPreview = useMemo(
    () => normalizeCourseOutcomeRowsForUi(description.courseOutcomes || []),
    [description.courseOutcomes]
  );

  const moduleOutcomesForPreview = useMemo(() => {
    const rows = Array.isArray(description.moduleOutcomes)
      ? description.moduleOutcomes
      : [];
    return defaultMoCodes.map((code) => {
      const matchedRow = rows.find((row) => normalizeCode(row?.code) === code);
      return {
        code,
        text: (matchedRow?.text || "").toString(),
        coMappings: normalizeCodeList(matchedRow?.coMappings || []),
      };
    });
  }, [description.moduleOutcomes]);

  const previewPrerequisites = useMemo(
    () =>
      (Array.isArray(description.prerequisites) ? description.prerequisites : []).filter(
        (item) => (item || "").toString().trim().length > 0
      ),
    [description.prerequisites]
  );

  const previewSyllabusRows = useMemo(
    () =>
      (Array.isArray(description.syllabus) ? description.syllabus : []).slice().sort((a, b) => {
        const left = Number.parseInt(a?.moduleNo, 10);
        const right = Number.parseInt(b?.moduleNo, 10);
        const normalizedLeft = Number.isFinite(left) ? left : 0;
        const normalizedRight = Number.isFinite(right) ? right : 0;
        return normalizedLeft - normalizedRight;
      }),
    [description.syllabus]
  );

  const selectedCategoryLabel = useMemo(() => {
    const selectedCategoryId = normalizeObjectIdValue(
      description?.category?._id || description?.categoryId
    );
    if (!selectedCategoryId) return "";
    const fromOptions = (categoryOptions || []).find(
      (item) => normalizeObjectIdValue(item?._id) === selectedCategoryId
    );
    if (fromOptions?.name) return fromOptions.name;
    return (description?.category?.name || "").toString();
  }, [categoryOptions, description?.category?._id, description?.category?.name, description?.categoryId]);

  const selectedSubcategoryLabels = useMemo(() => {
    const optionMap = new Map(
      (subcategoryOptions || []).map((item) => [
        normalizeObjectIdValue(item?._id),
        (item?.name || "").toString(),
      ])
    );
    const selectedIds = normalizeObjectIdList(description?.subcategoryIds || []);
    const fromOptions = selectedIds
      .map((id) => optionMap.get(id) || "")
      .filter((name) => name.length > 0);
    if (fromOptions.length > 0) return fromOptions;
    return (Array.isArray(description?.subcategories) ? description.subcategories : [])
      .map((item) => (item?.name || "").toString().trim())
      .filter(Boolean);
  }, [description?.subcategories, description?.subcategoryIds, subcategoryOptions]);

  const materialModules = useMemo(
    () =>
      (Array.isArray(materials?.modules) ? materials.modules : [])
        .slice()
        .sort((left, right) => Number(left?.moduleNo || 0) - Number(right?.moduleNo || 0)),
    [materials]
  );

  const apiOrigin = useMemo(() => {
    const base = (import.meta.env.VITE_API_BASE_URL || "").toString().trim();
    if (!base) return "";
    try {
      return new URL(base).origin;
    } catch {
      return "";
    }
  }, []);

  const selectedMaterialModule = useMemo(() => {
    if (materialModules.length === 0) return null;
    const exactMatch = materialModules.find(
      (module) => Number(module?.moduleNo) === Number(selectedModuleNo)
    );
    return exactMatch || materialModules[0];
  }, [materialModules, selectedModuleNo]);

  const optionSets = useMemo(() => {
    const collect = (selector) =>
      Array.from(
        new Set(
          students
            .map(selector)
            .filter(Boolean)
            .map((value) => value.toString())
        )
      ).sort((a, b) => a.localeCompare(b));

    const collectEntity = (selector, labelSelector) => {
      const map = new Map();
      students.forEach((row) => {
        const value = selector(row);
        if (!value) return;
        if (!map.has(value)) {
          map.set(value, labelSelector(row));
        }
      });
      return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
    };

    return {
      programs: collectEntity(
        (row) => row.program?._id,
        (row) => row.program?.name || ""
      ),
      streams: collect((row) => row.stream),
      batches: collectEntity(
        (row) => row.batch?._id,
        (row) => row.batch?.name || ""
      ),
      semesters: collectEntity(
        (row) => row.semester?._id,
        (row) => row.semester?.name || ""
      ),
      stages: collect((row) => row.stage),
      statuses: collect((row) => row.status),
      teachers: collect((row) => row.teacherNames),
    };
  }, [students]);

  const loadTaxonomyCategories = async () => {
    const response = await getCourseTaxonomyCategories();
    const nextCategories = Array.isArray(response?.categories) ? response.categories : [];
    setCategoryOptions(nextCategories);
    return nextCategories;
  };

  const loadTaxonomySubcategories = async (categoryId) => {
    const normalizedCategoryId = normalizeObjectIdValue(categoryId);
    if (!normalizedCategoryId) {
      setSubcategoryOptions([]);
      return [];
    }
    setTaxonomyLoading(true);
    try {
      const response = await getCourseTaxonomySubcategories(normalizedCategoryId);
      const nextSubcategories = Array.isArray(response?.subcategories)
        ? response.subcategories
        : [];
      setSubcategoryOptions(nextSubcategories);
      return nextSubcategories;
    } finally {
      setTaxonomyLoading(false);
    }
  };

  const loadDescription = async () => {
    const response = await getCourseDescription(courseId);
    const incoming = response?.description || emptyDescription;
    const incomingCategoryId = normalizeObjectIdValue(
      incoming?.category?._id || incoming?.categoryId
    );
    const incomingSubcategoryIds = normalizeObjectIdList(
      Array.isArray(incoming?.subcategoryIds)
        ? incoming.subcategoryIds
        : Array.isArray(incoming?.subcategories)
        ? incoming.subcategories.map((item) => item?._id || item)
        : []
    );
    if (incomingCategoryId) {
      await loadTaxonomySubcategories(incomingCategoryId);
    } else {
      setSubcategoryOptions([]);
    }
    setDescription({
      ...emptyDescription,
      ...incoming,
      categoryId: incomingCategoryId,
      subcategoryIds: incomingSubcategoryIds,
      ncrfLevel: toNcrfSelectValue(incoming?.ncrfLevel),
      prerequisites: Array.isArray(incoming?.prerequisites)
        ? incoming.prerequisites
        : [],
      courseOutcomes:
        Array.isArray(incoming?.courseOutcomes) && incoming.courseOutcomes.length
          ? normalizeCourseOutcomeRowsForUi(incoming.courseOutcomes)
          : defaultOutcomeRows,
      moduleOutcomes: Array.isArray(incoming?.moduleOutcomes)
        ? incoming.moduleOutcomes
        : [],
      syllabus: Array.isArray(incoming?.syllabus)
        ? incoming.syllabus.map((row) => ({
            ...row,
            moduleTitle: (row?.moduleTitle || "").toString(),
            timeWeightage: normalizeTimeWeightageValue(row?.timeWeightage),
          }))
        : [],
      referenceBooks: Array.isArray(incoming?.referenceBooks)
        ? incoming.referenceBooks
        : [],
      journals: Array.isArray(incoming?.journals) ? incoming.journals : [],
      onlineResources: Array.isArray(incoming?.onlineResources)
        ? incoming.onlineResources
        : [],
      moocs: Array.isArray(incoming?.moocs) ? incoming.moocs : [],
    });
  };

  const loadMaterials = async () => {
    setMaterialsLoading(true);
    try {
      const response = isAdmin
        ? await getAdminCourseMaterials(courseId)
        : await getCourseMaterials(courseId);
      const nextModules = Array.isArray(response?.modules) ? response.modules : [];
      setMaterials({
        courseId: response?.courseId || courseId,
        modules: nextModules,
      });
      if (nextModules.length > 0) {
        setSelectedModuleNo((prev) => {
          const hasCurrentSelection = nextModules.some(
            (module) => Number(module?.moduleNo) === Number(prev)
          );
          return hasCurrentSelection
            ? prev
            : Number(nextModules[0]?.moduleNo) || null;
        });
      } else {
        setSelectedModuleNo(null);
      }
    } catch (err) {
      setError(
        err?.response?.data?.error || err?.message || "Failed to load materials"
      );
    } finally {
      setMaterialsLoading(false);
    }
  };

  const loadStudents = async (appliedFilters = filters) => {
    if (!canViewStudents) return;
    setStudentsLoading(true);
    try {
      const response = await getCourseStudents(courseId, appliedFilters);
      setStudents(Array.isArray(response?.rows) ? response.rows : []);
    } catch (err) {
      setError(
        err?.response?.data?.error || err?.message || "Failed to load course students"
      );
    } finally {
      setStudentsLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");
    Promise.all([loadTaxonomyCategories(), loadDescription(), loadMaterials()])
      .catch((err) => {
        if (!mounted) return;
        setError(
          err?.response?.data?.error || err?.message || "Failed to load course details"
        );
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  useEffect(() => {
    if (activeTab === "students") {
      loadStudents(filters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (materialModules.length === 0) return;
    if (selectedMaterialModule) {
      if (selectedModuleNo !== selectedMaterialModule.moduleNo) {
        setSelectedModuleNo(selectedMaterialModule.moduleNo);
      }
      return;
    }
    setSelectedModuleNo(materialModules[0].moduleNo);
  }, [materialModules, selectedMaterialModule, selectedModuleNo]);

  useEffect(() => {
    const tabFromQuery = (searchParams.get("tab") || "").toLowerCase();
    if (!tabs.some((tab) => tab.id === tabFromQuery)) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set("tab", "description");
      setSearchParams(nextParams, { replace: true });
      return;
    }
    if (tabFromQuery !== activeTab) {
      setActiveTab(tabFromQuery);
    }
  }, [activeTab, searchParams, setSearchParams]);

  useEffect(() => {
    if (!courseId || typeof window === "undefined") return;
    localStorage.setItem("lastManagedCourseId", courseId);
  }, [courseId]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    if (!showPreviewModal) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showPreviewModal]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", tabId);
    setSearchParams(nextParams, { replace: true });
  };

  const handlePreviewPrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleDescriptionField = (field, value) => {
    setDescription((prev) => ({ ...prev, [field]: value }));
  };

  const handleCategoryChange = async (value) => {
    const nextCategoryId = normalizeObjectIdValue(value);
    setDescription((prev) => ({
      ...prev,
      categoryId: nextCategoryId,
      subcategoryIds: [],
    }));
    if (!nextCategoryId) {
      setSubcategoryOptions([]);
      return;
    }
    try {
      await loadTaxonomySubcategories(nextCategoryId);
    } catch (err) {
      setSubcategoryOptions([]);
      setError(
        err?.response?.data?.error || err?.message || "Failed to load subcategories"
      );
    }
  };

  const handleSubcategoryChange = (values = []) => {
    setDescription((prev) => ({
      ...prev,
      subcategoryIds: normalizeObjectIdList(values),
    }));
  };

  const handleOutcomeChange = (index, field, value) => {
    setDescription((prev) => ({
      ...prev,
      courseOutcomes: (prev.courseOutcomes || []).map((row, idx) =>
        idx === index ? { ...row, [field]: value } : row
      ),
    }));
    setCourseOutcomeErrors((prev) => {
      if (!prev[index]) return prev;
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const handlePrerequisiteChange = (index, value) => {
    setDescription((prev) => ({
      ...prev,
      prerequisites: (prev.prerequisites || []).map((item, idx) =>
        idx === index ? value : item
      ),
    }));
  };

  const addPrerequisite = () => {
    setDescription((prev) => ({
      ...prev,
      prerequisites: [...(prev.prerequisites || []), ""],
    }));
  };

  const removePrerequisite = (index) => {
    setDescription((prev) => ({
      ...prev,
      prerequisites: (prev.prerequisites || []).filter((_, idx) => idx !== index),
    }));
  };

  const getModuleOutcomeRow = (code) => {
    const rows = Array.isArray(description.moduleOutcomes)
      ? description.moduleOutcomes
      : [];
    const matched = rows.find((row) => normalizeCode(row?.code) === code);
    return {
      code,
      text: matched?.text || "",
      coMappings: normalizeCodeList(matched?.coMappings || []),
    };
  };

  const updateModuleOutcomeRow = (code, updater) => {
    setDescription((prev) => {
      const existingRows = Array.isArray(prev.moduleOutcomes) ? prev.moduleOutcomes : [];
      const normalizedRows = [];
      const seenCodes = new Set();

      existingRows.forEach((row, index) => {
        const normalizedCode = normalizeCode(row?.code || `MO${index + 1}`);
        if (!/^MO[1-6]$/.test(normalizedCode) || seenCodes.has(normalizedCode)) return;
        seenCodes.add(normalizedCode);
        normalizedRows.push({
          code: normalizedCode,
          text: (row?.text || "").toString(),
          coMappings: normalizeCodeList(row?.coMappings || []),
        });
      });

      const targetIndex = normalizedRows.findIndex((row) => row.code === code);
      const baseRow =
        targetIndex >= 0
          ? normalizedRows[targetIndex]
          : { code, text: "", coMappings: [] };
      const nextRow = updater(baseRow);
      const sanitizedRow = {
        code,
        text: (nextRow?.text || "").toString(),
        coMappings: normalizeCodeList(nextRow?.coMappings || []),
      };

      if (targetIndex >= 0) {
        normalizedRows[targetIndex] = sanitizedRow;
      } else {
        normalizedRows.push(sanitizedRow);
      }

      return {
        ...prev,
        moduleOutcomes: normalizedRows,
      };
    });
  };

  const handleModuleOutcomeTextChange = (code, value) => {
    updateModuleOutcomeRow(code, (row) => ({
      ...row,
      text: value,
    }));
  };

  const handleModuleOutcomeMappingToggle = (code, coCode, checked) => {
    updateModuleOutcomeRow(code, (row) => {
      const existingMappings = normalizeCodeList(row.coMappings || []);
      const nextMappings = checked
        ? normalizeCodeList([...existingMappings, coCode])
        : existingMappings.filter((item) => item !== coCode);
      return {
        ...row,
        coMappings: nextMappings,
      };
    });
  };

  const handleSyllabusChange = (index, field, value) => {
    setDescription((prev) => ({
      ...prev,
      syllabus: (Array.isArray(prev.syllabus) ? prev.syllabus : []).map((row, idx) =>
        idx === index ? { ...row, [field]: value } : row
      ),
    }));
  };

  const addSyllabusRow = () => {
    setDescription((prev) => {
      const rows = Array.isArray(prev.syllabus) ? prev.syllabus : [];
      const nextModuleNo =
        rows.reduce((max, row) => {
          const parsed = Number.parseInt(row?.moduleNo, 10);
          if (Number.isFinite(parsed) && parsed > max) return parsed;
          return max;
        }, 0) + 1;
      return {
        ...prev,
        syllabus: [
          ...rows,
          { moduleNo: nextModuleNo, moduleTitle: "", moduleDetails: "", timeWeightage: "" },
        ],
      };
    });
  };

  const removeSyllabusRow = (index) => {
    setDescription((prev) => ({
      ...prev,
      syllabus: (Array.isArray(prev.syllabus) ? prev.syllabus : []).filter(
        (_, idx) => idx !== index
      ),
    }));
  };

  const handleReferenceBookChange = (index, field, value) => {
    setDescription((prev) => ({
      ...prev,
      referenceBooks: (Array.isArray(prev.referenceBooks) ? prev.referenceBooks : []).map(
        (row, idx) => (idx === index ? { ...row, [field]: value } : row)
      ),
    }));
  };

  const addReferenceBookRow = () => {
    setDescription((prev) => ({
      ...prev,
      referenceBooks: [
        ...(Array.isArray(prev.referenceBooks) ? prev.referenceBooks : []),
        { title: "", author: "", publisher: "", yearEdition: "" },
      ],
    }));
  };

  const removeReferenceBookRow = (index) => {
    setDescription((prev) => ({
      ...prev,
      referenceBooks: (Array.isArray(prev.referenceBooks) ? prev.referenceBooks : []).filter(
        (_, idx) => idx !== index
      ),
    }));
  };

  const handleJournalChange = (index, value) => {
    setDescription((prev) => ({
      ...prev,
      journals: (Array.isArray(prev.journals) ? prev.journals : []).map((row, idx) =>
        idx === index ? { ...row, name: value } : row
      ),
    }));
  };

  const addJournalRow = () => {
    setDescription((prev) => ({
      ...prev,
      journals: [...(Array.isArray(prev.journals) ? prev.journals : []), { name: "" }],
    }));
  };

  const removeJournalRow = (index) => {
    setDescription((prev) => ({
      ...prev,
      journals: (Array.isArray(prev.journals) ? prev.journals : []).filter(
        (_, idx) => idx !== index
      ),
    }));
  };

  const handleUrlListChange = (field, index, value) => {
    setDescription((prev) => ({
      ...prev,
      [field]: (Array.isArray(prev[field]) ? prev[field] : []).map((row, idx) =>
        idx === index ? { ...row, url: value } : row
      ),
    }));
  };

  const addUrlListRow = (field) => {
    setDescription((prev) => ({
      ...prev,
      [field]: [...(Array.isArray(prev[field]) ? prev[field] : []), { url: "" }],
    }));
  };

  const removeUrlListRow = (field, index) => {
    setDescription((prev) => ({
      ...prev,
      [field]: (Array.isArray(prev[field]) ? prev[field] : []).filter(
        (_, idx) => idx !== index
      ),
    }));
  };

  const handleSaveDescription = async () => {
    if (!canEditDescription) return;
    setSaving(true);
    setError("");
    setSuccess("");
    setDescriptionFieldError("");
    setDescriptionErrorDetails([]);
    setCourseOutcomeErrors({});
    try {
      const normalizedCategoryId = normalizeObjectIdValue(
        description?.category?._id || description?.categoryId
      );
      const normalizedSubcategoryIds = normalizeObjectIdList(
        description?.subcategoryIds || []
      );
      if (!normalizedCategoryId) {
        setDescriptionFieldError("categoryId");
        setError("Category is required before saving.");
        return;
      }
      if (normalizedSubcategoryIds.length === 0) {
        setDescriptionFieldError("subcategoryIds");
        setError("Subcategory is required before saving.");
        return;
      }

      const parsedNcrfLevel = Number.parseFloat(description.ncrfLevel);
      const isAllowedNcrf = TOP_LEVEL_NCRF_LEVEL_VALUES.some(
        (value) => Math.abs(value - parsedNcrfLevel) < 1e-9
      );
      if (!Number.isFinite(parsedNcrfLevel) || !isAllowedNcrf) {
        setError("Select a valid NCrF level before saving.");
        return;
      }

      const normalizedCourseOutcomes = normalizeCourseOutcomeRowsForUi(
        description.courseOutcomes || []
      ).map((row, index) => {
        const code = normalizeCode(row?.code || `CO${index + 1}`) || `CO${index + 1}`;
        const outcome = (row?.outcome || "").toString().trim();
        const bloomLevel = (row?.bloomLevel || "").toString().trim();
        const ncrfLevel = normalizeNcrfLevel(row?.ncrfLevel);
        const parsedWeightage = Number.parseFloat(row?.weightage);
        const weightage =
          Number.isFinite(parsedWeightage) && parsedWeightage > 0
            ? parsedWeightage
            : null;
        return {
          code,
          outcome,
          bloomLevel,
          ncrfLevel: ncrfLevel === "" ? null : ncrfLevel,
          weightage,
        };
      });

      const nextCourseOutcomeErrors = {};
      normalizedCourseOutcomes.forEach((row, index) => {
        const rowErrors = [];
        if (row.outcome) {
          if (row.ncrfLevel === null) {
            rowErrors.push(`${row.code}: select NCrF level`);
          }
          if (!(Number.isFinite(row.weightage) && row.weightage > 0)) {
            rowErrors.push(`${row.code}: enter weightage`);
          }
        }
        if (rowErrors.length > 0) {
          nextCourseOutcomeErrors[index] = rowErrors;
        }
      });

      if (Object.keys(nextCourseOutcomeErrors).length > 0) {
        const flattenedErrors = Object.values(nextCourseOutcomeErrors).flat();
        setCourseOutcomeErrors(nextCourseOutcomeErrors);
        setDescriptionFieldError("courseOutcomes");
        setDescriptionErrorDetails(flattenedErrors);
        setError(flattenedErrors[0] || "Fix Course Outcomes rows before saving.");
        return;
      }

      const normalizedModuleOutcomesForSave = (
        Array.isArray(description.moduleOutcomes) ? description.moduleOutcomes : []
      )
        .map((row, index) => ({
          code: normalizeCode(row?.code || `MO${index + 1}`),
          text: (row?.text || "").toString(),
          coMappings: normalizeCodeList(row?.coMappings || []),
        }))
        .filter((row) => /^MO[1-6]$/.test(row.code))
        .reduce((acc, row) => {
          if (acc.seen.has(row.code)) return acc;
          acc.seen.add(row.code);
          acc.rows.push(row);
          return acc;
        }, { seen: new Set(), rows: [] }).rows;
      const normalizedSyllabusForSave = (
        Array.isArray(description.syllabus) ? description.syllabus : []
      ).map((row) => {
        const parsedModuleNo = Number.parseInt(row?.moduleNo, 10);
        const normalizedTimeWeightage = normalizeTimeWeightageValue(row?.timeWeightage);
        return {
          moduleNo: Number.isFinite(parsedModuleNo) && parsedModuleNo >= 1 ? parsedModuleNo : 1,
          moduleTitle: (row?.moduleTitle || "").toString(),
          moduleDetails: (row?.moduleDetails || "").toString(),
          timeWeightage: normalizedTimeWeightage,
        };
      });

      await updateCourseDescription(courseId, {
        nameOfCourse: description.nameOfCourse,
        categoryId: normalizedCategoryId,
        subcategoryIds: normalizedSubcategoryIds,
        ncrfLevel: parsedNcrfLevel,
        courseType: description.courseType,
        courseCredits: safeCredits,
        kiitxCourseCode: description.kiitxCourseCode,
        offeredBySchool: description.offeredBySchool,
        mediumOfInstruction: description.mediumOfInstruction,
        developedFor: description.developedFor,
        coordinatorId: description?.coordinator?._id || null,
        introduction: description.introduction,
        prerequisites: description.prerequisites || [],
        courseOutcomes: normalizedCourseOutcomes,
        moduleOutcomes: normalizedModuleOutcomesForSave,
        syllabus: normalizedSyllabusForSave,
        referenceBooks: description.referenceBooks || [],
        journals: description.journals || [],
        onlineResources: description.onlineResources || [],
        moocs: description.moocs || [],
      });
      setSuccess("Course description updated.");
      await loadDescription();
    } catch (err) {
      const responseData = err?.response?.data || {};
      const nextError = responseData?.error || err?.message || "Failed to save description";
      const nextField =
        typeof responseData?.field === "string" ? responseData.field : "";
      const nextDetails = Array.isArray(responseData?.details)
        ? responseData.details
        : [];

      setError(nextError);
      setDescriptionFieldError(nextField);
      setDescriptionErrorDetails(nextDetails);

      const fieldToRef = {
        moduleOutcomes: moduleOutcomesSectionRef,
        syllabus: syllabusSectionRef,
        referenceBooks: referenceBooksSectionRef,
        journals: journalsSectionRef,
        onlineResources: onlineResourcesSectionRef,
        moocs: moocsSectionRef,
      };
      const targetRef = fieldToRef[nextField];
      if (targetRef?.current?.scrollIntoView) {
        targetRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    } finally {
      setSaving(false);
    }
  };

  const setMaterialDraftField = (type, field, value) => {
    setMaterialDrafts((prev) => ({
      ...prev,
      [type]: {
        ...(prev[type] || { title: "", file: null, url: "" }),
        [field]: value,
      },
    }));
  };

  const resetMaterialDraft = (type) => {
    setMaterialDrafts((prev) => ({
      ...prev,
      [type]: { title: "", file: null, url: "" },
    }));
  };

  const resolveMaterialUrl = (url) => {
    const normalized = (url || "").toString().trim();
    if (!normalized) return "";
    if (/^https?:\/\//i.test(normalized)) return normalized;
    if (normalized.startsWith("/") && apiOrigin) return `${apiOrigin}${normalized}`;
    return normalized;
  };

  const formatBytes = (value) => {
    const size = Number(value) || 0;
    if (size <= 0) return "Unknown size";
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatMaterialDate = (value) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "-";
    return parsed.toLocaleDateString();
  };

  const getActiveModuleNo = () =>
    Number(selectedMaterialModule?.moduleNo || selectedModuleNo || 1);

  const validateMaterialDraft = ({ type, title, url, file }) => {
    if (!(title || "").toString().trim()) {
      return "Material title is required.";
    }
    if (type === "pdf" || type === "presentation") {
      if (!file) return "Select a file before adding this material.";
      return "";
    }
    const normalizedUrl = (url || "").toString().trim();
    if (!normalizedUrl) return "URL is required.";
    if (!/^https?:\/\/\S+/i.test(normalizedUrl)) {
      return "URL must start with http(s).";
    }
    return "";
  };

  const handleAddMaterialItem = async (type) => {
    if (!canManageMaterials) return;
    const draft = materialDrafts?.[type] || { title: "", file: null, url: "" };
    const validationError = validateMaterialDraft({
      type,
      title: draft.title,
      url: draft.url,
      file: draft.file,
    });
    if (validationError) {
      setError(validationError);
      return;
    }

    setMaterialSaving(true);
    setError("");
    setSuccess("");
    try {
      await addCourseMaterialItem(courseId, getActiveModuleNo(), {
        type,
        title: draft.title,
        url: draft.url,
        file: draft.file,
      });
      resetMaterialDraft(type);
      setSuccess("Course material added.");
      await loadMaterials();
    } catch (err) {
      setError(
        err?.response?.data?.error || err?.message || "Failed to add course material"
      );
    } finally {
      setMaterialSaving(false);
    }
  };

  const startEditingMaterial = (item) => {
    setEditingMaterialId(item?._id || "");
    setEditingMaterialDraft({
      title: item?.title || "",
      url: item?.url || item?.fileUrl || "",
      file: null,
      type: item?.type || "",
    });
  };

  const cancelEditingMaterial = () => {
    setEditingMaterialId("");
    setEditingMaterialDraft({
      title: "",
      url: "",
      file: null,
      type: "",
    });
  };

  const handleUpdateMaterial = async (item) => {
    if (!canManageMaterials) return;
    const type = item?.type || editingMaterialDraft.type || "";
    const title = (editingMaterialDraft.title || "").toString().trim();
    const url = (editingMaterialDraft.url || "").toString().trim();
    if (!title) {
      setError("Material title is required.");
      return;
    }
    if ((type === "video" || type === "link") && !/^https?:\/\/\S+/i.test(url)) {
      setError("URL must start with http(s).");
      return;
    }

    setMaterialSaving(true);
    setError("");
    setSuccess("");
    try {
      await updateCourseMaterialItem(courseId, item._id, {
        type,
        title,
        url: type === "video" || type === "link" ? url : undefined,
        file: editingMaterialDraft.file || undefined,
      });
      setSuccess("Course material updated.");
      cancelEditingMaterial();
      await loadMaterials();
    } catch (err) {
      setError(
        err?.response?.data?.error || err?.message || "Failed to update course material"
      );
    } finally {
      setMaterialSaving(false);
    }
  };

  const handleDeleteMaterial = async (item) => {
    if (!canManageMaterials || !item?._id) return;
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        `Delete "${item.title || "this material"}"?`
      );
      if (!confirmed) return;
    }
    setMaterialSaving(true);
    setError("");
    setSuccess("");
    try {
      await deleteCourseMaterialItem(courseId, item._id);
      setSuccess("Course material deleted.");
      if (editingMaterialId === item._id) {
        cancelEditingMaterial();
      }
      await loadMaterials();
    } catch (err) {
      setError(
        err?.response?.data?.error || err?.message || "Failed to delete course material"
      );
    } finally {
      setMaterialSaving(false);
    }
  };

  const applyStudentFilters = async () => {
    await loadStudents(filters);
  };

  const clearStudentFilters = async () => {
    const next = {
      program: "",
      stream: "",
      batch: "",
      semester: "",
      stage: "",
      status: "",
      teacher: "",
    };
    setFilters(next);
    await loadStudents(next);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <p className="text-sm text-gray-500">Loading course details...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #course-description-preview-print,
          #course-description-preview-print * {
            visibility: visible !important;
          }
          #course-description-preview-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: #fff;
            padding: 24px;
          }
          .preview-print-hidden {
            display: none !important;
          }
        }
      `}</style>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-widest">
            Course Management
          </p>
          <h1 className="text-xl font-semibold text-gray-900">
            {description.nameOfCourse || "Course"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === "description" && (
            <button
              type="button"
              onClick={() => setShowPreviewModal(true)}
              className="px-3 py-2 rounded border border-blue-300 text-sm text-blue-700 hover:bg-blue-50"
            >
              Preview / Print
            </button>
          )}
          <Link
            to="/courses/list"
            className="px-3 py-2 rounded border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
          >
            Back to Course List
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <p>{error}</p>
          {descriptionErrorDetails.length > 0 && (
            <ul className="mt-1 list-disc list-inside text-xs">
              {descriptionErrorDetails.map((detail, index) => (
                <li key={`desc-error-detail-${index}`}>{detail}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {success && (
        <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </div>
      )}

      <div className="w-full max-w-4xl mx-auto">
        <div className="grid grid-cols-3 gap-4 p-3 rounded-lg border border-slate-200 bg-slate-50 shadow-sm">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`w-full px-4 py-3 text-base font-semibold rounded-md border transition-colors ${
                activeTab === tab.id
                  ? "bg-blue-700 text-white border-blue-800"
                  : "bg-blue-100 text-slate-700 border-blue-200 hover:bg-blue-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "description" && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="font-semibold text-gray-800">Name of the Course</span>
              <input
                value={description.nameOfCourse || ""}
                onChange={(e) => handleDescriptionField("nameOfCourse", e.target.value)}
                disabled={!canEditDescription}
                className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm">
              <span className="font-semibold text-gray-800">Course Code</span>
              <input
                value={description.courseCode || ""}
                readOnly
                className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm">
              <span className="font-semibold text-gray-800">NCrF Level</span>
              <select
                value={description.ncrfLevel ?? ""}
                onChange={(e) => handleDescriptionField("ncrfLevel", e.target.value)}
                disabled={!canEditDescription}
                className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"
              >
                <option value="">Select NCrF level</option>
                {TOP_LEVEL_NCRF_LEVEL_OPTIONS.map((option) => (
                  <option key={option.value} value={String(option.value)}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="font-semibold text-gray-800">Course Type</span>
              <select
                value={description.courseType || "theory"}
                onChange={(e) => handleDescriptionField("courseType", e.target.value)}
                disabled={!canEditDescription}
                className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"
              >
                <option value="theory">Theory</option>
                <option value="practical">Practical</option>
                <option value="project">Project</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="font-semibold text-gray-800">
                Category <span className="text-red-600 text-xs">(required)</span>
              </span>
              <select
                value={normalizeObjectIdValue(description.categoryId)}
                onChange={(e) => handleCategoryChange(e.target.value)}
                disabled={!canEditDescription}
                className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"
              >
                <option value="">Select Category</option>
                {(categoryOptions || []).map((option) => (
                  <option key={`course-category-${option?._id}`} value={option?._id}>
                    {option?.name || ""}
                  </option>
                ))}
              </select>
              {descriptionFieldError === "categoryId" && error && (
                <p className="mt-1 text-xs text-red-600">{error}</p>
              )}
            </label>
            <label className="text-sm">
              <span className="font-semibold text-gray-800">
                Subcategory <span className="text-red-600 text-xs">(required)</span>
              </span>
              <select
                multiple
                value={normalizeObjectIdList(description.subcategoryIds || [])}
                onChange={(e) =>
                  handleSubcategoryChange(
                    Array.from(e.target.selectedOptions).map((option) => option.value)
                  )
                }
                disabled={
                  !canEditDescription ||
                  !normalizeObjectIdValue(description.categoryId) ||
                  taxonomyLoading
                }
                className="mt-1 h-28 w-full border border-gray-300 rounded px-3 py-2 text-sm"
              >
                {(subcategoryOptions || []).map((option) => (
                  <option key={`course-subcategory-${option?._id}`} value={option?._id}>
                    {option?.name || ""}
                  </option>
                ))}
              </select>
              {canEditDescription && (
                <p className="mt-1 text-[11px] text-gray-500">Hold Ctrl/Cmd to select multiple.</p>
              )}
              {descriptionFieldError === "subcategoryIds" && error && (
                <p className="mt-1 text-xs text-red-600">{error}</p>
              )}
            </label>
            <label className="text-sm">
              <span className="font-semibold text-gray-800">Course Credits</span>
              <input
                type="number"
                min="1"
                value={safeCredits}
                onChange={(e) => {
                  const parsedCredits = Number.parseInt(e.target.value, 10);
                  handleDescriptionField(
                    "courseCredits",
                    Number.isFinite(parsedCredits) && parsedCredits >= 1
                      ? parsedCredits
                      : 1
                  );
                }}
                disabled={!canEditDescription}
                className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
              {descriptionFieldError === "courseCredits" && error && (
                <p className="mt-1 text-xs text-red-600">{error}</p>
              )}
            </label>
            <label className="text-sm">
              <span className="font-semibold text-gray-800">Offered by the School</span>
              <input
                value={description.offeredBySchool || ""}
                onChange={(e) => handleDescriptionField("offeredBySchool", e.target.value)}
                disabled={!canEditDescription}
                className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm">
              <span className="font-semibold text-gray-800">Medium of Instruction</span>
              <select
                value={description.mediumOfInstruction || "English"}
                onChange={(e) =>
                  handleDescriptionField("mediumOfInstruction", e.target.value)
                }
                disabled={!canEditDescription}
                className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"
              >
                <option value="English">English</option>
                <option value="Hindi">Hindi</option>
                <option value="Odia">Odia</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="font-semibold text-gray-800">Course Developed For</span>
              <input
                value={description.developedFor || ""}
                onChange={(e) => handleDescriptionField("developedFor", e.target.value)}
                disabled={!canEditDescription}
                className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm md:col-span-2">
              <span className="font-semibold text-gray-800">Course Coordinator</span>
              <input
                value={description.coordinator?.name || ""}
                readOnly
                className="mt-1 w-full border border-gray-200 bg-gray-50 rounded px-3 py-2 text-sm"
              />
            </label>
          </div>

          <label className="text-sm block">
            <span className="font-semibold text-gray-800">Introduction</span>
            <textarea
              value={description.introduction || ""}
              onChange={(e) => handleDescriptionField("introduction", e.target.value)}
              disabled={!canEditDescription}
              rows={3}
              className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </label>

          <div>
            <div className="flex items-center justify-between">
              <p className="font-semibold text-gray-800 text-sm">Prerequisite Course (if any)</p>
              {canEditDescription && (
                <button
                  type="button"
                  onClick={addPrerequisite}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  + Add
                </button>
              )}
            </div>
            <div className="space-y-2 mt-2">
              {(description.prerequisites || []).map((item, index) => (
                <div key={`pre-${index}`} className="flex items-center gap-2">
                  <input
                    value={item}
                    onChange={(e) => handlePrerequisiteChange(index, e.target.value)}
                    disabled={!canEditDescription}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                  {canEditDescription && (
                    <button
                      type="button"
                      onClick={() => removePrerequisite(index)}
                      className="text-xs text-red-600"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              {(!description.prerequisites || description.prerequisites.length === 0) && (
                <p className="text-xs text-gray-400">No prerequisites listed.</p>
              )}
            </div>
          </div>

          <div>
            <p className="font-semibold text-gray-800 text-sm mb-2">Course Outcome</p>
            <div className="overflow-x-auto border border-gray-200 rounded">
              <table className="min-w-full text-sm">
                <thead className="bg-blue-700 text-white">
                  <tr>
                    <th className="px-2 py-2 text-left">CO</th>
                    <th className="px-2 py-2 text-left">Course Outcome (Bloom)</th>
                    <th className="px-2 py-2 text-left">NCrF Level</th>
                    <th className="px-2 py-2 text-left">NCrF Level Weightage</th>
                  </tr>
                </thead>
                <tbody>
	                  {(description.courseOutcomes || defaultOutcomeRows).map((row, index) => {
	                    const normalizedRowNcrfLevel = normalizeNcrfLevel(row?.ncrfLevel);
	                    const normalizedRowWeightage = normalizeWeightageValue(row?.weightage);
	                    const rowErrors = Array.isArray(courseOutcomeErrors[index])
	                      ? courseOutcomeErrors[index]
	                      : [];
	                    return (
	                      <React.Fragment key={`co-row-${index}`}>
                        <tr className="border-t border-gray-100">
                          <td className="px-2 py-2 text-gray-700">
                            {row.code || `CO${index + 1}`}
                          </td>
	                          <td className="px-2 py-2">
	                            <input
	                              value={row.outcome || ""}
	                              onChange={(e) =>
	                                handleOutcomeChange(index, "outcome", e.target.value)
	                              }
	                              disabled={!canEditDescription}
	                              className="w-full min-w-[420px] border border-gray-300 rounded px-2 py-1 text-sm"
	                            />
	                          </td>
	                          <td className="px-2 py-2">
	                            <select
                              value={
                                normalizedRowNcrfLevel === ""
                                  ? ""
                                  : String(normalizedRowNcrfLevel)
                              }
                              onChange={(e) =>
                                handleOutcomeChange(
                                  index,
                                  "ncrfLevel",
                                  e.target.value === ""
                                    ? ""
                                    : normalizeNcrfLevel(e.target.value)
                                )
                              }
                              disabled={!canEditDescription}
                              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                            >
                              <option value="">Select NCrF</option>
	                              {NCRF_LEVEL_OPTIONS.map((level) => (
	                                <option key={`co-ncrf-${level}`} value={String(level)}>
	                                  {level}
	                                </option>
	                              ))}
	                            </select>
	                          </td>
	                          <td className="px-2 py-2">
	                            <select
	                              value={normalizedRowWeightage}
	                              onChange={(e) =>
	                                handleOutcomeChange(index, "weightage", e.target.value)
	                              }
	                              disabled={!canEditDescription}
	                              className="w-28 border border-gray-300 rounded px-2 py-1 text-sm"
	                            >
	                              <option value="">Select</option>
	                              {COURSE_OUTCOME_WEIGHTAGE_OPTIONS.map((value) => (
	                                <option key={`co-weight-${value}`} value={value}>
	                                  {value}
	                                </option>
	                              ))}
	                            </select>
	                          </td>
	                        </tr>
                        {rowErrors.length > 0 && (
                          <tr className="border-t border-red-100 bg-red-50/50">
                            <td colSpan={4} className="px-2 py-2 text-xs text-red-600">
                              {rowErrors.map((rowError, rowErrorIndex) => (
                                <p key={`co-row-${index}-error-${rowErrorIndex}`}>{rowError}</p>
                              ))}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {descriptionFieldError === "courseOutcomes" && error && (
              <p className="mt-2 text-xs text-red-600">{error}</p>
            )}
            <div className="mt-3 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-3">
              <p className="text-sm font-semibold text-indigo-900">Course NCrF Summary</p>
              <p className="mt-1 text-xs text-indigo-800">
                Formula: (Σ NCrF × Weightage) / Σ Weightage
              </p>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
	                <div className="rounded border border-indigo-200 bg-white px-2 py-2">
	                  <p className="text-indigo-700">Calculated Avg NCrF</p>
	                  <p className="text-base font-semibold text-indigo-900">
	                    {Number(ncrfSummary.averageValue || 0).toFixed(4)}
	                  </p>
	                </div>
	                <div className="rounded border border-indigo-200 bg-white px-2 py-2">
	                  <p className="text-indigo-700">Round off</p>
	                  <p className="text-base font-semibold text-indigo-900">
	                    {ncrfSummary.averageDisplay}
	                  </p>
	                </div>
	              </div>
	            </div>
          </div>

          <div ref={moduleOutcomesSectionRef}>
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold text-gray-800 text-sm">Module Outcomes</p>
              <p className="text-xs text-gray-500">MO1..MO6 with CO mapping</p>
            </div>
            <div className="overflow-x-auto border border-gray-200 rounded">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    <th className="px-2 py-2 text-left">MO Code</th>
                    <th className="px-2 py-2 text-left">Module Outcome Text</th>
                    <th className="px-2 py-2 text-left">CO Mapping</th>
                  </tr>
                </thead>
                <tbody>
                  {defaultMoCodes.map((code) => {
                    const row = getModuleOutcomeRow(code);
                    return (
                      <tr key={`mo-row-${code}`} className="border-t border-gray-100">
                        <td className="px-2 py-2 text-gray-700">{code}</td>
                        <td className="px-2 py-2">
                          <textarea
                            value={row.text}
                            onChange={(e) => handleModuleOutcomeTextChange(code, e.target.value)}
                            disabled={!canEditDescription}
                            rows={2}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex flex-wrap gap-2">
                            {coMappingOptions.map((coCode) => (
                              <label
                                key={`${code}-${coCode}`}
                                className="inline-flex items-center gap-1 text-xs text-gray-700"
                              >
                                <input
                                  type="checkbox"
                                  checked={(row.coMappings || []).includes(coCode)}
                                  onChange={(e) =>
                                    handleModuleOutcomeMappingToggle(
                                      code,
                                      coCode,
                                      e.target.checked
                                    )
                                  }
                                  disabled={!canEditDescription}
                                  className="h-3.5 w-3.5"
                                />
                                <span>{coCode}</span>
                              </label>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {descriptionFieldError === "moduleOutcomes" && error && (
              <p className="mt-2 text-xs text-red-600">{error}</p>
            )}
          </div>

	          <div ref={syllabusSectionRef}>
	            <div className="flex items-center justify-between mb-2">
	              <p className="font-semibold text-gray-800 text-sm">Syllabus</p>
	              {canEditDescription && (
                <button
                  type="button"
                  onClick={addSyllabusRow}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  + Add Row
                </button>
	              )}
	            </div>
	            <p className="text-xs text-gray-500 mb-2">
	              Module title, details, and time weightage (0.05 to 1.00).
	            </p>
	            <div className="overflow-x-auto border border-gray-200 rounded">
	              <table className="min-w-full text-sm">
	                <thead className="bg-gray-50 text-gray-700">
	                  <tr>
	                    <th className="px-2 py-2 text-left">Module No</th>
	                    <th className="px-2 py-2 text-left">Module Title</th>
	                    <th className="px-2 py-2 text-left">Module Details</th>
	                    <th className="px-2 py-2 text-left">Time Weightage</th>
	                    {canEditDescription && <th className="px-2 py-2 text-left">Action</th>}
	                  </tr>
	                </thead>
	                <tbody>
	                  {(description.syllabus || []).length === 0 ? (
	                    <tr>
	                      <td
	                        colSpan={canEditDescription ? 5 : 4}
	                        className="px-2 py-3 text-center text-xs text-gray-500"
	                      >
	                        No syllabus rows added.
	                      </td>
	                    </tr>
	                  ) : (
	                    (description.syllabus || []).map((row, index) => {
	                      const normalizedRowTimeWeightage = normalizeTimeWeightageValue(
	                        row?.timeWeightage
	                      );
	                      return (
	                        <tr
	                          key={`syllabus-row-${index}`}
	                          className="border-t border-gray-100"
	                        >
	                        <td className="px-2 py-2">
	                          <input
	                            type="number"
	                            min="1"
                            value={row?.moduleNo ?? index + 1}
                            onChange={(e) =>
                              handleSyllabusChange(index, "moduleNo", e.target.value)
                            }
                            disabled={!canEditDescription}
	                            className="w-24 border border-gray-300 rounded px-2 py-1 text-sm"
	                          />
	                        </td>
	                        <td className="px-2 py-2">
	                          <input
	                            value={row?.moduleTitle || ""}
	                            onChange={(e) =>
	                              handleSyllabusChange(index, "moduleTitle", e.target.value)
	                            }
	                            disabled={!canEditDescription}
	                            className="w-full min-w-[220px] border border-gray-300 rounded px-2 py-1 text-sm"
	                          />
	                        </td>
	                        <td className="px-2 py-2">
	                          <textarea
	                            value={row?.moduleDetails || ""}
	                            onChange={(e) =>
                              handleSyllabusChange(index, "moduleDetails", e.target.value)
                            }
                            disabled={!canEditDescription}
                            rows={2}
	                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
	                          />
	                        </td>
	                        <td className="px-2 py-2">
	                          <select
	                            value={normalizedRowTimeWeightage}
	                            onChange={(e) =>
	                              handleSyllabusChange(index, "timeWeightage", e.target.value)
	                            }
	                            disabled={!canEditDescription}
	                            className="w-28 border border-gray-300 rounded px-2 py-1 text-sm"
	                          >
	                            <option value="">Select</option>
	                            {COURSE_OUTCOME_WEIGHTAGE_OPTIONS.map((value) => (
	                              <option key={`syllabus-weight-${value}`} value={value}>
	                                {value}
	                              </option>
	                            ))}
	                          </select>
	                        </td>
	                        {canEditDescription && (
	                          <td className="px-2 py-2">
	                            <button
                              type="button"
                              onClick={() => removeSyllabusRow(index)}
                              className="text-xs text-red-600"
                            >
                              Remove
                            </button>
	                          </td>
	                        )}
	                      </tr>
	                      );
	                    })
	                  )}
	                </tbody>
	              </table>
	            </div>
            {descriptionFieldError === "syllabus" && error && (
              <p className="mt-2 text-xs text-red-600">{error}</p>
            )}
          </div>

          <div ref={referenceBooksSectionRef}>
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold text-gray-800 text-sm">Reference Books</p>
              {canEditDescription && (
                <button
                  type="button"
                  onClick={addReferenceBookRow}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  + Add Row
                </button>
              )}
            </div>
            <div className="overflow-x-auto border border-gray-200 rounded">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    <th className="px-2 py-2 text-left">
                      Title <span className="text-red-600 text-xs">(required)</span>
                    </th>
                    <th className="px-2 py-2 text-left">Author</th>
                    <th className="px-2 py-2 text-left">Publisher</th>
                    <th className="px-2 py-2 text-left">Year / Edition</th>
                    {canEditDescription && <th className="px-2 py-2 text-left">Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {(description.referenceBooks || []).length === 0 ? (
                    <tr>
                      <td
                        colSpan={canEditDescription ? 5 : 4}
                        className="px-2 py-3 text-center text-xs text-gray-500"
                      >
                        No reference books added.
                      </td>
                    </tr>
                  ) : (
                    (description.referenceBooks || []).map((row, index) => (
                      <tr key={`book-row-${index}`} className="border-t border-gray-100">
                        <td className="px-2 py-2">
                          <input
                            value={row?.title || ""}
                            onChange={(e) =>
                              handleReferenceBookChange(index, "title", e.target.value)
                            }
                            disabled={!canEditDescription}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            value={row?.author || ""}
                            onChange={(e) =>
                              handleReferenceBookChange(index, "author", e.target.value)
                            }
                            disabled={!canEditDescription}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            value={row?.publisher || ""}
                            onChange={(e) =>
                              handleReferenceBookChange(index, "publisher", e.target.value)
                            }
                            disabled={!canEditDescription}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            value={row?.yearEdition || ""}
                            onChange={(e) =>
                              handleReferenceBookChange(index, "yearEdition", e.target.value)
                            }
                            disabled={!canEditDescription}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                        </td>
                        {canEditDescription && (
                          <td className="px-2 py-2">
                            <button
                              type="button"
                              onClick={() => removeReferenceBookRow(index)}
                              className="text-xs text-red-600"
                            >
                              Remove
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {descriptionFieldError === "referenceBooks" && error && (
              <p className="mt-2 text-xs text-red-600">{error}</p>
            )}
          </div>

          <div ref={journalsSectionRef}>
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold text-gray-800 text-sm">Journals</p>
              {canEditDescription && (
                <button
                  type="button"
                  onClick={addJournalRow}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  + Add Row
                </button>
              )}
            </div>
            <div className="space-y-2">
              {(description.journals || []).length === 0 && (
                <p className="text-xs text-gray-500">No journals added.</p>
              )}
              {(description.journals || []).map((row, index) => (
                <div key={`journal-row-${index}`} className="flex items-center gap-2">
                  <input
                    value={row?.name || ""}
                    onChange={(e) => handleJournalChange(index, e.target.value)}
                    disabled={!canEditDescription}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                  {canEditDescription && (
                    <button
                      type="button"
                      onClick={() => removeJournalRow(index)}
                      className="text-xs text-red-600"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
            {descriptionFieldError === "journals" && error && (
              <p className="mt-2 text-xs text-red-600">{error}</p>
            )}
          </div>

          <div ref={onlineResourcesSectionRef}>
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold text-gray-800 text-sm">Online Resources</p>
              {canEditDescription && (
                <button
                  type="button"
                  onClick={() => addUrlListRow("onlineResources")}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  + Add Row
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 mb-2">Must start with http(s).</p>
            <div className="space-y-2">
              {(description.onlineResources || []).length === 0 && (
                <p className="text-xs text-gray-500">No online resources added.</p>
              )}
              {(description.onlineResources || []).map((row, index) => (
                <div key={`online-row-${index}`} className="flex items-center gap-2">
                  <input
                    value={row?.url || ""}
                    onChange={(e) =>
                      handleUrlListChange("onlineResources", index, e.target.value)
                    }
                    disabled={!canEditDescription}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                  {canEditDescription && (
                    <button
                      type="button"
                      onClick={() => removeUrlListRow("onlineResources", index)}
                      className="text-xs text-red-600"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
            {descriptionFieldError === "onlineResources" && error && (
              <p className="mt-2 text-xs text-red-600">{error}</p>
            )}
          </div>

          <div ref={moocsSectionRef}>
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold text-gray-800 text-sm">MOOCs</p>
              {canEditDescription && (
                <button
                  type="button"
                  onClick={() => addUrlListRow("moocs")}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  + Add Row
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 mb-2">Must start with http(s).</p>
            <div className="space-y-2">
              {(description.moocs || []).length === 0 && (
                <p className="text-xs text-gray-500">No MOOCs added.</p>
              )}
              {(description.moocs || []).map((row, index) => (
                <div key={`mooc-row-${index}`} className="flex items-center gap-2">
                  <input
                    value={row?.url || ""}
                    onChange={(e) => handleUrlListChange("moocs", index, e.target.value)}
                    disabled={!canEditDescription}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                  {canEditDescription && (
                    <button
                      type="button"
                      onClick={() => removeUrlListRow("moocs", index)}
                      className="text-xs text-red-600"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
            {descriptionFieldError === "moocs" && error && (
              <p className="mt-2 text-xs text-red-600">{error}</p>
            )}
          </div>

          {canEditDescription && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveDescription}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Description"}
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === "material" && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
          {!canViewMaterials ? (
            <p className="text-sm text-gray-500">
              You do not have access to Course Materials for this course.
            </p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <aside className="lg:col-span-3 border border-gray-200 rounded-lg p-3 bg-gray-50">
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Modules</p>
                {materialsLoading ? (
                  <p className="text-sm text-gray-500">Loading modules...</p>
                ) : materialModules.length === 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500">No module materials yet.</p>
                    {canManageMaterials && (
                      <button
                        type="button"
                        onClick={() => setSelectedModuleNo(1)}
                        className="w-full rounded border border-blue-300 px-2 py-1.5 text-xs text-blue-700 hover:bg-blue-50"
                      >
                        Start with Module 1
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {materialModules.map((module) => {
                      const totalCount =
                        Number(module?.counts?.pdf || 0) +
                        Number(module?.counts?.presentation || 0) +
                        Number(module?.counts?.video || 0) +
                        Number(module?.counts?.link || 0);
                      const isSelected =
                        Number(module?.moduleNo) === Number(selectedMaterialModule?.moduleNo);
                      return (
                        <button
                          key={`material-module-${module.moduleNo}`}
                          type="button"
                          onClick={() => setSelectedModuleNo(Number(module.moduleNo))}
                          className={`w-full text-left rounded border px-3 py-2 transition-colors ${
                            isSelected
                              ? "bg-blue-600 border-blue-700 text-white"
                              : "bg-white border-gray-200 text-gray-700 hover:border-blue-300"
                          }`}
                        >
                          <p className="text-sm font-semibold">
                            Module {module.moduleNo}
                          </p>
                          <p
                            className={`text-xs ${
                              isSelected ? "text-blue-100" : "text-gray-500"
                            }`}
                          >
                            {totalCount} item{totalCount === 1 ? "" : "s"}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </aside>

              <section className="lg:col-span-9 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      Course Material
                    </p>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {selectedMaterialModule
                        ? selectedMaterialModule.moduleTitle ||
                          `Module ${selectedMaterialModule.moduleNo}`
                        : `Module ${selectedModuleNo || 1}`}
                    </h3>
                  </div>
                  {!canManageMaterials && (
                    <p className="text-xs text-gray-500">
                      View-only access. Admin can add/edit/delete materials.
                    </p>
                  )}
                </div>

                {materialCategoryConfig.map((category) => {
                  const categoryItems = Array.isArray(
                    selectedMaterialModule?.items?.[category.type]
                  )
                    ? selectedMaterialModule.items[category.type]
                    : [];
                  const categoryCount =
                    Number(selectedMaterialModule?.counts?.[category.type]) ||
                    categoryItems.length;
                  const draft = materialDrafts?.[category.type] || {
                    title: "",
                    file: null,
                    url: "",
                  };

                  return (
                    <div
                      key={`material-category-${category.type}`}
                      className="rounded-lg border border-gray-200 p-3 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {category.label}
                          </p>
                          <p className="text-xs text-gray-500">{category.helper}</p>
                        </div>
                        <span className="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-xs font-semibold text-blue-700">
                          {categoryCount}
                        </span>
                      </div>

                      {canManageMaterials && (
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                          <input
                            value={draft.title || ""}
                            onChange={(e) =>
                              setMaterialDraftField(category.type, "title", e.target.value)
                            }
                            placeholder={`${category.label.slice(0, -1)} title`}
                            className="md:col-span-4 border border-gray-300 rounded px-2 py-2 text-sm"
                          />
                          {category.isFile ? (
                            <input
                              type="file"
                              accept={category.accept}
                              onChange={(e) =>
                                setMaterialDraftField(
                                  category.type,
                                  "file",
                                  e.target.files?.[0] || null
                                )
                              }
                              className="md:col-span-6 border border-gray-300 rounded px-2 py-2 text-sm"
                            />
                          ) : (
                            <input
                              value={draft.url || ""}
                              onChange={(e) =>
                                setMaterialDraftField(category.type, "url", e.target.value)
                              }
                              placeholder={
                                category.type === "video"
                                  ? "https://youtube.com/..."
                                  : "https://example.com/resource"
                              }
                              className="md:col-span-6 border border-gray-300 rounded px-2 py-2 text-sm"
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => handleAddMaterialItem(category.type)}
                            disabled={materialSaving}
                            className="md:col-span-2 rounded bg-blue-600 text-white text-sm px-3 py-2 hover:bg-blue-700 disabled:opacity-50"
                          >
                            {materialSaving ? "Saving..." : "Add"}
                          </button>
                        </div>
                      )}

                      {categoryItems.length === 0 ? (
                        <p className="text-sm text-gray-500">No {category.label.toLowerCase()} added.</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {categoryItems.map((item) => {
                            const isEditing = editingMaterialId === item._id;
                            const viewUrl = resolveMaterialUrl(item.url || item.fileUrl);
                            return (
                              <div
                                key={`material-item-${item._id}`}
                                className="rounded border border-gray-200 bg-gray-50 p-3 space-y-2"
                              >
                                {!isEditing ? (
                                  <>
                                    <p className="text-sm font-semibold text-gray-900">
                                      {item.title || "-"}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {category.isFile
                                        ? `${formatBytes(item.sizeBytes)} | ${formatMaterialDate(
                                            item.createdAt
                                          )}`
                                        : formatMaterialDate(item.createdAt)}
                                    </p>
                                    <div className="flex items-center gap-2">
                                      {viewUrl && (
                                        <a
                                          href={viewUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-100"
                                        >
                                          <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            className="h-3.5 w-3.5"
                                          >
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
                                            <circle cx="12" cy="12" r="3" />
                                          </svg>
                                          <span>View</span>
                                        </a>
                                      )}
                                      {canManageMaterials && (
                                        <button
                                          type="button"
                                          onClick={() => startEditingMaterial(item)}
                                          className="rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-700 hover:bg-amber-100"
                                        >
                                          Edit
                                        </button>
                                      )}
                                      {canManageMaterials && (
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteMaterial(item)}
                                          className="rounded border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100"
                                        >
                                          Delete
                                        </button>
                                      )}
                                    </div>
                                  </>
                                ) : (
                                  <div className="space-y-2">
                                    <input
                                      value={editingMaterialDraft.title || ""}
                                      onChange={(e) =>
                                        setEditingMaterialDraft((prev) => ({
                                          ...prev,
                                          title: e.target.value,
                                        }))
                                      }
                                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                                    />
                                    {(item.type === "video" || item.type === "link") && (
                                      <input
                                        value={editingMaterialDraft.url || ""}
                                        onChange={(e) =>
                                          setEditingMaterialDraft((prev) => ({
                                            ...prev,
                                            url: e.target.value,
                                          }))
                                        }
                                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                                      />
                                    )}
                                    {(item.type === "pdf" || item.type === "presentation") && (
                                      <input
                                        type="file"
                                        accept={
                                          item.type === "pdf"
                                            ? ".pdf,application/pdf"
                                            : ".ppt,.pptx,.pdf,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                                        }
                                        onChange={(e) =>
                                          setEditingMaterialDraft((prev) => ({
                                            ...prev,
                                            file: e.target.files?.[0] || null,
                                          }))
                                        }
                                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                                      />
                                    )}
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateMaterial(item)}
                                        disabled={materialSaving}
                                        className="rounded bg-blue-600 px-2.5 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
                                      >
                                        {materialSaving ? "Saving..." : "Save"}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={cancelEditingMaterial}
                                        className="rounded border border-gray-300 bg-white px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-100"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </section>
            </div>
          )}
        </div>
      )}

      {activeTab === "students" && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
          {canViewStudents ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
                <select
                  value={filters.program}
                  onChange={(e) => setFilters((prev) => ({ ...prev, program: e.target.value }))}
                  className="border border-gray-300 rounded px-2 py-2 text-xs"
                >
                  <option value="">Program</option>
                  {optionSets.programs.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <select
                  value={filters.stream}
                  onChange={(e) => setFilters((prev) => ({ ...prev, stream: e.target.value }))}
                  className="border border-gray-300 rounded px-2 py-2 text-xs"
                >
                  <option value="">Stream</option>
                  {optionSets.streams.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
                <select
                  value={filters.batch}
                  onChange={(e) => setFilters((prev) => ({ ...prev, batch: e.target.value }))}
                  className="border border-gray-300 rounded px-2 py-2 text-xs"
                >
                  <option value="">Batch</option>
                  {optionSets.batches.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <select
                  value={filters.semester}
                  onChange={(e) => setFilters((prev) => ({ ...prev, semester: e.target.value }))}
                  className="border border-gray-300 rounded px-2 py-2 text-xs"
                >
                  <option value="">Semester</option>
                  {optionSets.semesters.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <select
                  value={filters.stage}
                  onChange={(e) => setFilters((prev) => ({ ...prev, stage: e.target.value }))}
                  className="border border-gray-300 rounded px-2 py-2 text-xs"
                >
                  <option value="">Stage</option>
                  {optionSets.stages.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                  className="border border-gray-300 rounded px-2 py-2 text-xs"
                >
                  <option value="">Status</option>
                  {optionSets.statuses.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
                <select
                  value={filters.teacher}
                  onChange={(e) => setFilters((prev) => ({ ...prev, teacher: e.target.value }))}
                  className="border border-gray-300 rounded px-2 py-2 text-xs"
                >
                  <option value="">Teacher</option>
                  {optionSets.teachers.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={clearStudentFilters}
                  className="px-3 py-1.5 rounded border border-gray-300 text-xs text-gray-700 hover:bg-gray-50"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={applyStudentFilters}
                  className="px-3 py-1.5 rounded bg-blue-600 text-white text-xs hover:bg-blue-700"
                >
                  Apply Filters
                </button>
              </div>
              <div className="overflow-x-auto border border-gray-200 rounded">
                <table className="min-w-full text-sm">
                  <thead className="bg-blue-700 text-white">
                    <tr>
                      <th className="px-3 py-2 text-left">Sl. No.</th>
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-3 py-2 text-left">Program</th>
                      <th className="px-3 py-2 text-left">Stream</th>
                      <th className="px-3 py-2 text-left">Batch</th>
                      <th className="px-3 py-2 text-left">Semester</th>
                      <th className="px-3 py-2 text-left">Stage</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-left">Teacher</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentsLoading ? (
                      <tr>
                        <td colSpan={9} className="px-3 py-4 text-center text-gray-500">
                          Loading students...
                        </td>
                      </tr>
                    ) : students.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-3 py-4 text-center text-gray-500">
                          No course student rows found for selected filters.
                        </td>
                      </tr>
                    ) : (
                      students.map((row) => (
                        <tr key={`${row.studentId}-${row.slNo}`} className="border-t border-gray-100">
                          <td className="px-3 py-2">{row.slNo}</td>
                          <td className="px-3 py-2">{row.name || "-"}</td>
                          <td className="px-3 py-2">{row.program?.name || "-"}</td>
                          <td className="px-3 py-2">{row.stream || "-"}</td>
                          <td className="px-3 py-2">{row.batch?.name || "-"}</td>
                          <td className="px-3 py-2">{row.semester?.name || "-"}</td>
                          <td className="px-3 py-2">{row.stage || "-"}</td>
                          <td className="px-3 py-2 capitalize">{row.status || "-"}</td>
                          <td className="px-3 py-2">{row.teacherNames || "-"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500">
              You do not have access to Course Students for this course.
            </p>
          )}
        </div>
      )}

      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-black/50 p-4 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl rounded-lg border border-gray-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3 preview-print-hidden">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Course Description Preview</h2>
                <p className="text-xs text-gray-500">
                  Review the printable layout before exporting.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePreviewPrint}
                  className="rounded border border-blue-300 bg-blue-50 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-100"
                >
                  Print
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Close
                </button>
              </div>
            </div>

            <div id="course-description-preview-print" className="space-y-6 p-6 text-sm text-gray-800">
              <div className="border-b border-gray-200 pb-3">
                <h3 className="text-2xl font-semibold text-gray-900">
                  {description.nameOfCourse || "Course Description"}
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  Generated from Course Management / Description.
                </p>
              </div>

              <section className="space-y-2">
                <h4 className="text-base font-semibold text-gray-900">Course Meta</h4>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2">
                    <p className="text-xs text-gray-500">Name of Course</p>
                    <p className="font-medium">{description.nameOfCourse || "-"}</p>
                  </div>
                  <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2">
                    <p className="text-xs text-gray-500">NCrF Level</p>
                    <p className="font-medium">{description.ncrfLevel || "-"}</p>
                  </div>
                  <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2">
                    <p className="text-xs text-gray-500">Course Type</p>
                    <p className="font-medium">{description.courseType || "-"}</p>
                  </div>
                  <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2">
                    <p className="text-xs text-gray-500">Category</p>
                    <p className="font-medium">{selectedCategoryLabel || "-"}</p>
                  </div>
                  <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2">
                    <p className="text-xs text-gray-500">Subcategory</p>
                    <p className="font-medium">
                      {selectedSubcategoryLabels.length > 0
                        ? selectedSubcategoryLabels.join(", ")
                        : "-"}
                    </p>
                  </div>
                  <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2">
                    <p className="text-xs text-gray-500">Course Credits</p>
                    <p className="font-medium">{safeCredits}</p>
                  </div>
                  <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2">
                    <p className="text-xs text-gray-500">Course Code</p>
                    <p className="font-medium">{description.courseCode || "-"}</p>
                  </div>
                  <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2">
                    <p className="text-xs text-gray-500">Offered by School</p>
                    <p className="font-medium">{description.offeredBySchool || "-"}</p>
                  </div>
                  <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2">
                    <p className="text-xs text-gray-500">Medium of Instruction</p>
                    <p className="font-medium">{description.mediumOfInstruction || "-"}</p>
                  </div>
                  <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2">
                    <p className="text-xs text-gray-500">Developed For</p>
                    <p className="font-medium">{description.developedFor || "-"}</p>
                  </div>
                  <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2">
                    <p className="text-xs text-gray-500">Coordinator</p>
                    <p className="font-medium">{description?.coordinator?.name || "-"}</p>
                  </div>
                </div>
              </section>

              <section className="space-y-2">
                <h4 className="text-base font-semibold text-gray-900">Introduction</h4>
                <p className="whitespace-pre-wrap rounded border border-gray-200 bg-gray-50 px-3 py-2">
                  {description.introduction || "-"}
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="text-base font-semibold text-gray-900">Prerequisites</h4>
                {previewPrerequisites.length === 0 ? (
                  <p className="text-gray-500">No prerequisites listed.</p>
                ) : (
                  <ul className="list-disc pl-5 space-y-1">
                    {previewPrerequisites.map((item, index) => (
                      <li key={`preview-prereq-${index}`}>{item}</li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="space-y-2">
                <h4 className="text-base font-semibold text-gray-900">Course Outcomes</h4>
                <div className="overflow-x-auto rounded border border-gray-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-100 text-gray-700">
                      <tr>
                        <th className="px-2 py-2 text-left">CO</th>
                        <th className="px-2 py-2 text-left">Outcome</th>
                        <th className="px-2 py-2 text-left">Bloom Level</th>
                        <th className="px-2 py-2 text-left">NCrF Level</th>
                        <th className="px-2 py-2 text-left">Weightage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courseOutcomesForPreview.map((row, index) => (
                        <tr key={`preview-co-${index}`} className="border-t border-gray-200">
                          <td className="px-2 py-2">{row.code}</td>
                          <td className="px-2 py-2">{row.outcome || "-"}</td>
                          <td className="px-2 py-2">{row.bloomLevel || "-"}</td>
                          <td className="px-2 py-2">{row.ncrfLevel === "" ? "—" : row.ncrfLevel}</td>
                          <td className="px-2 py-2">{row.weightage === "" ? "—" : row.weightage}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="rounded-lg border border-indigo-200 bg-indigo-50 p-3">
                <h4 className="text-base font-semibold text-indigo-900">Course NCrF Summary</h4>
                <p className="mt-1 text-xs text-indigo-800">
                  Formula: (Σ NCrF × Weightage) / Σ Weightage
                </p>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
	                  <div className="rounded border border-indigo-200 bg-white px-3 py-2">
	                    <p className="text-xs text-indigo-700">Calculated Avg NCrF</p>
	                    <p className="text-lg font-semibold text-indigo-900">
	                      {Number(ncrfSummary.averageValue || 0).toFixed(4)}
	                    </p>
	                  </div>
	                  <div className="rounded border border-indigo-200 bg-white px-3 py-2">
	                    <p className="text-xs text-indigo-700">Round off</p>
	                    <p className="text-lg font-semibold text-indigo-900">
	                      {ncrfSummary.averageDisplay}
	                    </p>
	                  </div>
	                </div>
	              </section>

              <section className="space-y-2">
                <h4 className="text-base font-semibold text-gray-900">Module Outcomes</h4>
                <div className="overflow-x-auto rounded border border-gray-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-100 text-gray-700">
                      <tr>
                        <th className="px-2 py-2 text-left">MO Code</th>
                        <th className="px-2 py-2 text-left">Module Outcome</th>
                        <th className="px-2 py-2 text-left">CO Mapping</th>
                      </tr>
                    </thead>
                    <tbody>
                      {moduleOutcomesForPreview.map((row, index) => (
                        <tr key={`preview-mo-${index}`} className="border-t border-gray-200">
                          <td className="px-2 py-2">{row.code}</td>
                          <td className="px-2 py-2">{row.text || "-"}</td>
                          <td className="px-2 py-2">
                            {row.coMappings.length ? row.coMappings.join(", ") : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

	              <section className="space-y-2">
	                <h4 className="text-base font-semibold text-gray-900">Syllabus</h4>
	                <p className="text-xs text-gray-500">Time weightage: 0.05 to 1.00</p>
	                <div className="overflow-x-auto rounded border border-gray-200">
	                  <table className="min-w-full text-sm">
	                    <thead className="bg-gray-100 text-gray-700">
	                      <tr>
	                        <th className="px-2 py-2 text-left">Module No</th>
	                        <th className="px-2 py-2 text-left">Module Title</th>
	                        <th className="px-2 py-2 text-left">Module Details</th>
	                        <th className="px-2 py-2 text-left">Time Weightage</th>
	                      </tr>
	                    </thead>
	                    <tbody>
	                      {previewSyllabusRows.length === 0 ? (
	                        <tr>
	                          <td colSpan={4} className="px-2 py-3 text-center text-gray-500">
	                            No syllabus rows added.
	                          </td>
	                        </tr>
	                      ) : (
	                        previewSyllabusRows.map((row, index) => (
	                          <tr key={`preview-syllabus-${index}`} className="border-t border-gray-200">
	                            <td className="px-2 py-2">{row?.moduleNo || "-"}</td>
	                            <td className="px-2 py-2">{row?.moduleTitle || "-"}</td>
	                            <td className="px-2 py-2">{row?.moduleDetails || "-"}</td>
	                            <td className="px-2 py-2">
	                              {normalizeTimeWeightageValue(row?.timeWeightage) || "-"}
	                            </td>
	                          </tr>
	                        ))
	                      )}
	                    </tbody>
	                  </table>
	                </div>
	              </section>

              <section className="space-y-2">
                <h4 className="text-base font-semibold text-gray-900">Reference Books</h4>
                <div className="overflow-x-auto rounded border border-gray-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-100 text-gray-700">
                      <tr>
                        <th className="px-2 py-2 text-left">Title</th>
                        <th className="px-2 py-2 text-left">Author</th>
                        <th className="px-2 py-2 text-left">Publisher</th>
                        <th className="px-2 py-2 text-left">Year/Edition</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(description.referenceBooks || []).length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-2 py-3 text-center text-gray-500">
                            No reference books added.
                          </td>
                        </tr>
                      ) : (
                        (description.referenceBooks || []).map((row, index) => (
                          <tr key={`preview-book-${index}`} className="border-t border-gray-200">
                            <td className="px-2 py-2">{row?.title || "-"}</td>
                            <td className="px-2 py-2">{row?.author || "-"}</td>
                            <td className="px-2 py-2">{row?.publisher || "-"}</td>
                            <td className="px-2 py-2">{row?.yearEdition || "-"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="space-y-2">
                <h4 className="text-base font-semibold text-gray-900">Journals</h4>
                {(description.journals || []).length === 0 ? (
                  <p className="text-gray-500">No journals added.</p>
                ) : (
                  <ul className="list-disc pl-5 space-y-1">
                    {(description.journals || []).map((row, index) => (
                      <li key={`preview-journal-${index}`}>{row?.name || "-"}</li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="space-y-2">
                <h4 className="text-base font-semibold text-gray-900">Online Resources</h4>
                {(description.onlineResources || []).length === 0 ? (
                  <p className="text-gray-500">No online resources added.</p>
                ) : (
                  <ul className="list-disc pl-5 space-y-1">
                    {(description.onlineResources || []).map((row, index) => (
                      <li key={`preview-online-${index}`}>
                        {row?.url ? (
                          <a
                            href={row.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-700 underline"
                          >
                            {row.url}
                          </a>
                        ) : (
                          "-"
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="space-y-2">
                <h4 className="text-base font-semibold text-gray-900">MOOCs</h4>
                {(description.moocs || []).length === 0 ? (
                  <p className="text-gray-500">No MOOCs added.</p>
                ) : (
                  <ul className="list-disc pl-5 space-y-1">
                    {(description.moocs || []).map((row, index) => (
                      <li key={`preview-mooc-${index}`}>
                        {row?.url ? (
                          <a
                            href={row.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-700 underline"
                          >
                            {row.url}
                          </a>
                        ) : (
                          "-"
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseManagementDetails;
