import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Edit3,
  KeyRound,
  Loader2,
  RefreshCw,
  Save,
  Shield,
  Trash2,
  X,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import userService, { resetUserPassword } from "../services/user.service";
import { listRoles } from "../services/role.service";
import { getPeriodLabel } from "../utils/periodLabel";
import { getProgramsDropdown } from "../services/program.service";
import { getBatchesDropdown } from "../services/batch.service";

const ADMIN_ACCESS_ROLE_SET = new Set([
  "ADMIN",
  "DEAN",
  "ASSOCIATE_DEAN",
  "PROGRAM_COORDINATOR",
  "COURSE_COORDINATOR",
]);

const CANONICAL_PERSONAL_DETAILS_SECTIONS = [
  {
    title: "Core Identity",
    fields: [
      "Email id",
      "Alternate Email Id",
      "Mobile Number",
      "Applicant Full Name (As mentioned on AADHAR Card)",
      "Gender",
      "Date Of Birth",
      "Blood Group",
      "Nationality",
      "Mother Tongue",
      "Age as on 31 July 2024",
    ],
  },
  {
    title: "Address",
    fields: [
      "Address",
      "Address Line 1",
      "City",
      "District",
      "State",
      "Country / Countries",
      "PinCode / Pincode",
    ],
  },
  {
    title: "Parents",
    fields: [
      "Fathers Name",
      "Fathers Mobile",
      "Fathers Email",
      "Mothers Name",
      "Mothers Mobile",
      "Mothers Email",
    ],
  },
  {
    title: "Govt IDs",
    fields: [
      "Aadhar Number",
      "Aadhaar Card/Passport (URL)",
      "PAN Number",
      "Upload PAN Card Copy",
      "Upload Aadhar Card Copy",
    ],
  },
  {
    title: "Application/Admission",
    fields: [
      "Application Form Number",
      "Level",
      "Program - Specialization",
      "Category",
      "Status",
      "Sub-Status",
    ],
  },
  {
    title: "Professional Details",
    fields: [
      "Work Experience (Years)",
      "Current Organisation",
      "Designation",
      "Office Address",
      "Office PIN Code",
      "Office Phone Number with Area Code",
      "Whatsapp Number",
      "Employment Type",
    ],
  },
  {
    title: "Education",
    fields: [
      "10th Admit card (URL)",
      "10th Marksheet (URL)",
      "10th Certificate",
      "Board",
      "Year of Completion / Year of Passing",
      "Percentage",
      "Marking Scheme",
      "Grade",
      "CGPA out of 7",
      "What have you done after 10th?",
      "Diploma Institute Name",
      "Board/University Name",
      "University",
      "Diploma result stage/status",
      "Graduation pursuing/done",
    ],
  },
];

const CANONICAL_PERSONAL_DETAIL_FIELDS = CANONICAL_PERSONAL_DETAILS_SECTIONS.flatMap(
  (section) => section.fields
);

const TEACHER_PROFILE_PHOTO_FIELD = "Profile Photo";
const TEACHER_PERSONAL_DETAILS_SECTIONS = [
  {
    title: "Personal Details",
    fields: [
      "Employee ID",
      "Title",
      "First",
      "Middle",
      "Last",
      "Date of Birth",
      "Gender",
      "Nationality",
      "Language",
      "Religion",
      "Native District",
      "Native State",
      "Native Country",
      "About Faculty",
      "Personal Number",
      "Designation",
      "Administrative Responsibility",
    ],
  },
  {
    title: "Contact Details",
    fields: [
      "School Associated",
      "Official Email ID",
      "Personal Email ID",
      "Mobile Number",
      "WhatsApp Number",
    ],
  },
  {
    title: "Educational Details",
    fields: [
      "PhD Degree Name",
      "PhD University",
      "PhD Year",
      "PG Degree Name",
      "PG University",
      "PG Year",
      "UG Degree Name",
      "UG University",
      "UG Year",
      "Any other Degree Name",
      "Any other University",
      "Any other Year",
    ],
  },
  {
    title: "Research",
    fields: [
      "Google Scholar",
      "Scopus ID",
      "ORCID ID",
      "Research Area",
      "Course Expertise in Teaching",
      "About Research Work",
      "Professional Membership",
    ],
  },
  {
    title: "Social Media",
    fields: [
      "Your Webpage (if Any)",
      "Facebook ID",
      "Insta ID",
      "Youtube ID",
      "LinkedIN ID",
    ],
  },
];

const TEACHER_CANONICAL_DETAIL_FIELDS = [
  TEACHER_PROFILE_PHOTO_FIELD,
  ...TEACHER_PERSONAL_DETAILS_SECTIONS.flatMap((section) => section.fields),
];

const CANONICAL_ALIASES = {
  email: "Email id",
  emailid: "Email id",
  phone: "Mobile Number",
  mobileno: "Mobile Number",
  mobile: "Mobile Number",
  fullname: "Applicant Full Name (As mentioned on AADHAR Card)",
  fullName: "Applicant Full Name (As mentioned on AADHAR Card)",
  dob: "Date Of Birth",
  bloodgroup: "Blood Group",
  mothertongue: "Mother Tongue",
  permanentaddress: "Address",
  addresspermanent: "Address",
  state: "State",
  city: "City",
  district: "District",
  country: "Country / Countries",
  countries: "Country / Countries",
  pin: "PinCode / Pincode",
  pincode: "PinCode / Pincode",
  fathername: "Fathers Name",
  fatherphone: "Fathers Mobile",
  fathermobile: "Fathers Mobile",
  mothername: "Mothers Name",
  whatsappnumber: "Whatsapp Number",
  whatsapp: "Whatsapp Number",
  workexperience: "Work Experience (Years)",
  experience: "Work Experience (Years)",
  noofyears: "Work Experience (Years)",
  company: "Current Organisation",
  organization: "Current Organisation",
  organisation: "Current Organisation",
  role: "Designation",
  officeaddress: "Office Address",
  officepincode: "Office PIN Code",
  officephonewithareacode: "Office Phone Number with Area Code",
  aadhaarnumber: "Aadhar Number",
  pannumber: "PAN Number",
};

const TEACHER_CANONICAL_ALIASES = {
  profilephoto: TEACHER_PROFILE_PHOTO_FIELD,
  profileimage: TEACHER_PROFILE_PHOTO_FIELD,
  photo: TEACHER_PROFILE_PHOTO_FIELD,
  employeeid: "Employee ID",
  title: "Title",
  first: "First",
  firstname: "First",
  middle: "Middle",
  middlename: "Middle",
  last: "Last",
  lastname: "Last",
  surname: "Last",
  dob: "Date of Birth",
  dateofbirth: "Date of Birth",
  gender: "Gender",
  nationality: "Nationality",
  language: "Language",
  religion: "Religion",
  nativedistrict: "Native District",
  nativestate: "Native State",
  nativecountry: "Native Country",
  aboutfaculty: "About Faculty",
  personalnumber: "Personal Number",
  designation: "Designation",
  administrativeresponsibility: "Administrative Responsibility",
  administrativeresponsibity: "Administrative Responsibility",
  schoolassociated: "School Associated",
  ssvmmailid: "Official Email ID",
  personalemailid: "Personal Email ID",
  mobile: "Mobile Number",
  mobilenumber: "Mobile Number",
  whatsapp: "WhatsApp Number",
  whatsappnumber: "WhatsApp Number",
  phddegreename: "PhD Degree Name",
  phduniversity: "PhD University",
  phdyear: "PhD Year",
  pgdegreename: "PG Degree Name",
  pguniversity: "PG University",
  pgyear: "PG Year",
  ugdegreename: "UG Degree Name",
  uguniversity: "UG University",
  ugyear: "UG Year",
  anyotherdegreename: "Any other Degree Name",
  anyotheruniversity: "Any other University",
  anyotheryear: "Any other Year",
  googlescholar: "Google Scholar",
  scopusid: "Scopus ID",
  scopus: "Scopus ID",
  orchid: "ORCID ID",
  orchidid: "ORCID ID",
  orcid: "ORCID ID",
  orcidid: "ORCID ID",
  researcharea: "Research Area",
  courseexpertiseinteaching: "Course Expertise in Teaching",
  aboutresearchwork: "About Research Work",
  professionalmembership: "Professional Membership",
  yourwebpageifany: "Your Webpage (if Any)",
  yourwebpage: "Your Webpage (if Any)",
  webpage: "Your Webpage (if Any)",
  facebookid: "Facebook ID",
  instaid: "Insta ID",
  youtubeid: "Youtube ID",
  linkedinid: "LinkedIN ID",
};

const EMAIL_REGEX = /^[\w.-]+@([\w-]+\.)+[\w-]{2,}$/i;

const isPlainObject = (value) =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const normalizeKey = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9]/g, "");

const toDisplay = (value) => {
  if (value === undefined || value === null) return "-";
  const normalized = String(value).trim();
  return normalized || "-";
};

const toDateDisplay = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return toDisplay(value);
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
};

const toGpaDisplay = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "-";
  return numeric.toFixed(2);
};

const toSemesterLabel = (value) => {
  const semesterNo = Number(value);
  if (!Number.isFinite(semesterNo) || semesterNo <= 0) return "-";

  const mod10 = semesterNo % 10;
  const mod100 = semesterNo % 100;
  let suffix = "th";
  if (mod10 === 1 && mod100 !== 11) suffix = "st";
  else if (mod10 === 2 && mod100 !== 12) suffix = "nd";
  else if (mod10 === 3 && mod100 !== 13) suffix = "rd";

  return `${semesterNo}${suffix}`;
};

const isHttpUrl = (value) => /^https?:\/\//i.test(String(value || "").trim());

const getErrorMessage = (error, fallbackMessage) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallbackMessage;

const unwrapProfilePayload = (payload) => {
  if (isPlainObject(payload?.data)) return payload.data;
  if (isPlainObject(payload?.profile)) return payload.profile;
  return isPlainObject(payload) ? payload : {};
};

const normalizeProgressPayload = (payload) => {
  const sources = [
    payload?.semesters,
    payload?.data?.semesters,
    payload?.data?.data?.semesters,
    payload?.progress?.semesters,
  ];
  const semesters = sources.find((entry) => Array.isArray(entry));
  if (!Array.isArray(semesters)) return [];

  return semesters
    .map((semester) => ({
      ...semester,
      semesterNo: Number(semester?.semesterNo),
      courses: Array.isArray(semester?.courses) ? semester.courses : [],
    }))
    .filter((semester) => Number.isFinite(semester.semesterNo) && semester.semesterNo > 0)
    .sort((a, b) => a.semesterNo - b.semesterNo);
};

const createEmptyTemplateFromFields = (fields) =>
  fields.reduce((acc, key) => {
    acc[key] = "";
    return acc;
  }, {});

const createEmptyPersonalTemplate = () =>
  createEmptyTemplateFromFields(CANONICAL_PERSONAL_DETAIL_FIELDS);

const normalizeTemplate = (input, canonicalFields, aliases = {}) => {
  const normalized = createEmptyTemplateFromFields(canonicalFields);
  const source = isPlainObject(input) ? input : {};

  Object.entries(source).forEach(([key, rawValue]) => {
    const directMatch = canonicalFields.find(
      (field) => normalizeKey(field) === normalizeKey(key)
    );
    const aliasMatch = aliases[key] || aliases[normalizeKey(key)] || "";
    const targetKey = directMatch || aliasMatch;
    if (!targetKey) return;

    const value = rawValue === undefined || rawValue === null ? "" : String(rawValue).trim();
    if (value || !normalized[targetKey]) {
      normalized[targetKey] = value;
    }
  });

  return normalized;
};

const normalizeRoleTag = (value) => String(value || "").trim().toUpperCase();

const normalizePersonalTemplate = (input) =>
  normalizeTemplate(input, CANONICAL_PERSONAL_DETAIL_FIELDS, CANONICAL_ALIASES);

const normalizeTeacherTemplate = (input) =>
  normalizeTemplate(input, TEACHER_CANONICAL_DETAIL_FIELDS, TEACHER_CANONICAL_ALIASES);

const isTeacherProfileData = (profileData) => {
  const userType = String(profileData?.user?.userType || "").trim().toLowerCase();
  const role = String(profileData?.user?.role || "").trim().toLowerCase();
  return userType === "teacher" || role === "teacher";
};

const buildTeacherDisplayName = (details = {}, fallbackName = "") => {
  const parts = [
    details["Title"],
    details["First"],
    details["Middle"],
    details["Last"],
  ]
    .map((entry) => String(entry || "").trim())
    .filter(Boolean);
  if (parts.length) return parts.join(" ");
  return String(fallbackName || "").trim();
};

const readProfilePhotoUrl = (profileData) => {
  let raw =
    profileData?.profilePhotoUrl ||
    profileData?.photoUrl ||
    profileData?.user?.photoUrl ||
    profileData?.personalDetails?.[TEACHER_PROFILE_PHOTO_FIELD] ||
    "";
  if (!raw) return "";
  // If already a full URL (Azure or external), use as-is
  if (/^https?:\/\//i.test(raw)) return raw;
  // Strip any broken host prefix (e.g. "0.0.0.0:5000/uploads/..." → "/uploads/...")
  const uploadsIdx = raw.indexOf("/uploads/");
  if (uploadsIdx > 0) {
    raw = raw.substring(uploadsIdx);
  }
  // Prepend backend base URL for relative paths
  const backendUrl =
    (typeof window !== "undefined" && window.RUNTIME_CONFIG?.BACKEND_URL) || "";
  return backendUrl ? `${backendUrl}${raw}` : raw;
};

const validatePersonalDetailsDraft = (draft, { isTeacher = false } = {}) => {
  const validateDateValue = (value, label) => {
    if (!value) return "";
    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
    if (isDateOnly) return "";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return `${label} is invalid.`;
    return "";
  };

  if (isTeacher) {
    const ssvmEmail = String(draft["Official Email ID"] || "").trim();
    const personalEmail = String(draft["Personal Email ID"] || "").trim();
    const mobile = String(draft["Mobile Number"] || "").replace(/\D/g, "");
    const whatsapp = String(draft["WhatsApp Number"] || "").replace(/\D/g, "");
    const personalNumber = String(draft["Personal Number"] || "").replace(/\D/g, "");
    const dob = String(draft["Date of Birth"] || "").trim();

    if (ssvmEmail && !EMAIL_REGEX.test(ssvmEmail)) {
      return "Official email ID is invalid.";
    }
    if (personalEmail && !EMAIL_REGEX.test(personalEmail)) {
      return "Personal Email ID is invalid.";
    }
    if (mobile && (mobile.length < 10 || mobile.length > 15)) {
      return "Mobile Number must be 10 to 15 digits.";
    }
    if (whatsapp && (whatsapp.length < 10 || whatsapp.length > 15)) {
      return "WhatsApp Number must be 10 to 15 digits.";
    }
    if (personalNumber && (personalNumber.length < 10 || personalNumber.length > 15)) {
      return "Personal Number must be 10 to 15 digits.";
    }
    for (const yearField of ["PhD Year", "PG Year", "UG Year", "Any other Year"]) {
      const year = String(draft[yearField] || "").trim();
      if (year && !/^\d{4}$/.test(year)) {
        return `${yearField} must be a 4-digit year.`;
      }
    }
    return validateDateValue(dob, "Date of Birth");
  }

  const email = String(draft["Email id"] || "").trim();
  const mobile = String(draft["Mobile Number"] || "").replace(/\D/g, "");
  const whatsapp = String(draft["Whatsapp Number"] || "").replace(/\D/g, "");
  const workExperience = String(draft["Work Experience (Years)"] || "").trim();
  const dob = String(draft["Date Of Birth"] || "").trim();

  if (email && !EMAIL_REGEX.test(email)) {
    return "Email id is invalid.";
  }
  if (mobile && (mobile.length < 10 || mobile.length > 15)) {
    return "Mobile Number must be 10 to 15 digits.";
  }
  if (whatsapp && (whatsapp.length < 10 || whatsapp.length > 15)) {
    return "Whatsapp Number must be 10 to 15 digits.";
  }
  if (workExperience && !/^\d+(\.\d+)?$/.test(workExperience)) {
    return "Work Experience (Years) must be a valid number.";
  }
  return validateDateValue(dob, "Date Of Birth");
};

export default function UserProfile() {
  const navigate = useNavigate();
  const { userId = "" } = useParams();
  const { user } = useAuth();

  const role = String(user?.role || "").trim().toLowerCase();
  const accessRoles = Array.isArray(user?.accessRoles)
    ? user.accessRoles.map((entry) => String(entry || "").trim().toUpperCase())
    : [];
  const isAdmin = role.includes("admin") || accessRoles.some((entry) => ADMIN_ACCESS_ROLE_SET.has(entry));

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profileData, setProfileData] = useState({});
  const [programProgress, setProgramProgress] = useState([]);
  const [programProgressError, setProgramProgressError] = useState("");

  const [editMode, setEditMode] = useState(false);
  const [editDraft, setEditDraft] = useState(createEmptyPersonalTemplate());
  const [updateReason, setUpdateReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [academicDraft, setAcademicDraft] = useState({});

  const [programsList, setProgramsList] = useState([]);
  const [batchesList, setBatchesList] = useState([]);

  const [expandedSemesters, setExpandedSemesters] = useState([]);
  const [notice, setNotice] = useState(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [roleTagOptions, setRoleTagOptions] = useState([]);
  const [roleTagDraft, setRoleTagDraft] = useState([]);
  const [roleTagLoading, setRoleTagLoading] = useState(false);
  const [roleTagSaving, setRoleTagSaving] = useState(false);
  const [roleTagError, setRoleTagError] = useState("");

  const [passwordInput, setPasswordInput] = useState("");
  const [resetModal, setResetModal] = useState({ open: false, mode: "manual" });
  const [resetLoading, setResetLoading] = useState(false);
  const [resetResult, setResetResult] = useState(null);
  const [resetError, setResetError] = useState("");
  const [passwordCopied, setPasswordCopied] = useState(false);

  const photoInputRef = useRef(null);
  const requestIdRef = useRef(0);

  const normalizeProfileForUI = useCallback((profile = {}) => {
    const teacherProfile = isTeacherProfileData(profile);
    const normalizedPersonal = teacherProfile
      ? normalizeTeacherTemplate(profile?.personalDetails || {})
      : normalizePersonalTemplate(profile?.personalDetails || {});

    // Inject employeeId from teacher profile into personalDetails (it lives outside personalDetails)
    if (teacherProfile && !normalizedPersonal["Employee ID"]) {
      const eid =
        profile?.teacherProfile?.employeeId ||
        profile?.employeeId ||
        profile?.user?.userId ||
        "";
      if (eid) normalizedPersonal["Employee ID"] = eid;
    }

    return {
      teacherProfile,
      normalizedProfile: {
        ...profile,
        personalDetails: normalizedPersonal,
      },
    };
  }, []);

  const loadPage = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      setError("Missing user ID in route.");
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setLoading(true);
    setError("");
    setProgramProgressError("");
    try {
      const profileResult = await userService.getUserProfile(userId);
      if (requestId !== requestIdRef.current) return;

      const profile = unwrapProfilePayload(profileResult);
      const { normalizedProfile, teacherProfile } = normalizeProfileForUI(profile);
      setProfileData(normalizedProfile);
      setEditDraft(normalizedProfile.personalDetails);
      const normalizedAccessRoles = Array.isArray(normalizedProfile?.user?.accessRoles)
        ? Array.from(
            new Set(
              normalizedProfile.user.accessRoles
                .map((entry) => normalizeRoleTag(entry))
                .filter(Boolean)
            )
          )
        : [];
      setRoleTagDraft(normalizedAccessRoles);
      setUpdateReason("");
      setSaveError("");
      setEditMode(false);

      if (teacherProfile) {
        setProgramProgress([]);
        setExpandedSemesters([]);
        setProgramProgressError("");
      } else {
        try {
          const progressResult = await userService.getUserProgress(userId);
          if (requestId !== requestIdRef.current) return;
          const semesters = normalizeProgressPayload(progressResult);
          setProgramProgress(semesters);
          setExpandedSemesters((prev) =>
            prev.filter((semesterNo) =>
              semesters.some((semester) => semester.semesterNo === semesterNo)
            )
          );
          setProgramProgressError("");
        } catch (progressError) {
          if (requestId !== requestIdRef.current) return;
          setProgramProgress([]);
          setExpandedSemesters([]);
          setProgramProgressError(
            getErrorMessage(progressError, "Failed to load program progress.")
          );
        }
      }
    } catch (profileError) {
      if (requestId !== requestIdRef.current) return;
      setProfileData({});
      setProgramProgress([]);
      setExpandedSemesters([]);
      setError(getErrorMessage(profileError, "Failed to load profile."));
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [normalizeProfileForUI, userId]);

  const loadRoleTagOptions = useCallback(async () => {
    if (!userId) return;
    setRoleTagLoading(true);
    setRoleTagError("");
    try {
      const [rolesPayload, accessPayload] = await Promise.all([
        listRoles(),
        userService.getUserAccessRoles(userId),
      ]);

      const activeRoles = Array.isArray(rolesPayload?.roles)
        ? rolesPayload.roles.filter((role) => role?.isActive !== false)
        : [];
      const allowedTags = Array.isArray(accessPayload?.allowedRoles)
        ? Array.from(
            new Set(
              accessPayload.allowedRoles
                .map((entry) => normalizeRoleTag(entry))
                .filter(Boolean)
            )
          )
        : [];

      const roleLabelByKey = new Map(
        activeRoles
          .map((role) => {
            const key = normalizeRoleTag(role?.key);
            if (!key) return null;
            return [key, role?.label || key];
          })
          .filter(Boolean)
      );

      const options = allowedTags
        .filter((tag) => roleLabelByKey.has(tag))
        .map((tag) => ({
          value: tag,
          label: roleLabelByKey.get(tag) || tag,
        }))
        .sort((left, right) => left.label.localeCompare(right.label));

      setRoleTagOptions(options);
    } catch (optionsError) {
      setRoleTagOptions([]);
      setRoleTagError(
        getErrorMessage(optionsError, "Failed to load role tag options.")
      );
    } finally {
      setRoleTagLoading(false);
    }
  }, [userId]);

  const reloadProfileOnly = useCallback(async () => {
    if (!userId) return;
    const response = await userService.getUserProfile(userId);
    const profile = unwrapProfilePayload(response);
    const { normalizedProfile } = normalizeProfileForUI(profile);
    setProfileData(normalizedProfile);
    setEditDraft(normalizedProfile.personalDetails);
  }, [normalizeProfileForUI, userId]);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    loadPage();
  }, [isAdmin, loadPage]);

  useEffect(() => {
    if (!isAdmin || !userId) return;
    loadRoleTagOptions();
  }, [isAdmin, userId, loadRoleTagOptions]);

  // Fetch programs & batches lists for academic dropdowns
  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    (async () => {
      try {
        const programs = await getProgramsDropdown();
        if (!cancelled) setProgramsList(Array.isArray(programs) ? programs : []);
      } catch { if (!cancelled) setProgramsList([]); }
    })();
    return () => { cancelled = true; };
  }, [isAdmin]);

  // Re-fetch batches when academic draft programId changes
  useEffect(() => {
    const pid = academicDraft.programId;
    if (!pid) { setBatchesList([]); return; }
    let cancelled = false;
    (async () => {
      try {
        const batches = await getBatchesDropdown(pid);
        if (!cancelled) setBatchesList(Array.isArray(batches) ? batches : []);
      } catch { if (!cancelled) setBatchesList([]); }
    })();
    return () => { cancelled = true; };
  }, [academicDraft.programId]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(null), 2500);
    return () => clearTimeout(timer);
  }, [notice]);

  const isTeacherProfile = useMemo(
    () => isTeacherProfileData(profileData),
    [profileData]
  );
  const isExecutiveProfile = useMemo(() => {
    const profileUserType = String(profileData?.user?.userType || "")
      .trim()
      .toLowerCase();
    return profileUserType === "executive_staff";
  }, [profileData]);
  const canManageRoleTags = isTeacherProfile || isExecutiveProfile;

  const headerFields = useMemo(() => {
    const details = isPlainObject(profileData?.personalDetails)
      ? profileData.personalDetails
      : {};
    if (isTeacherProfile) {
      const teacherName = buildTeacherDisplayName(
        details,
        profileData?.user?.name || ""
      );

      // Build associated schools from backend (fetched from Program.school via courses)
      const backendSchools = Array.isArray(profileData?.associatedSchools)
        ? profileData.associatedSchools
        : [];
      const schoolValue =
        backendSchools.length > 0
          ? backendSchools.join(", ")
          : details["School Associated"] || "";

      // Build access role tags (DEAN, PROGRAM_COORDINATOR, etc.)
      const accessRoles = Array.isArray(profileData?.user?.accessRoles)
        ? profileData.user.accessRoles
        : [];
      const roleTags = accessRoles
        .filter((r) => r && r !== "TEACHER")
        .map((r) =>
          r
            .split("_")
            .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
            .join(" ")
        );

      const fields = [
        { label: "Name", value: teacherName },
        {
          label: "Designation",
          value: details["Designation"] || profileData?.user?.designation || "Teacher",
        },
        { label: "School Associated", value: schoolValue },
      ];

      if (roleTags.length > 0) {
        fields.push({
          label: "Tags",
          value: roleTags.join(", "),
        });
      }

      return fields;
    }

    const academic = isPlainObject(profileData?.academicSummary)
      ? profileData.academicSummary
      : {};

    const semester =
      academic.currentSemester !== undefined && academic.currentSemester !== null
        ? String(academic.currentSemester).trim()
        : "";

    return [
      {
        label: "Name",
        value:
          profileData?.user?.name ||
          profileData?.personalDetails?.["Applicant Full Name (As mentioned on AADHAR Card)"],
      },
      { label: "Roll No", value: academic.rollNo || academic.rollNumber || "" },
      {
        label: "Enrolment No",
        value: academic.enrolmentNo || academic.enrollmentNo || "",
      },
      {
        label: "Registration No",
        value: academic.registrationNo || academic.registrationNumber || "",
      },
      { label: "Program", value: academic.program || "" },
      { label: "Stream", value: academic.stream || "" },
      { label: "Batch", value: academic.batch || "" },
      {
        label: "Academic Year + Session",
        value: [academic.academicYear, academic.session]
          .filter((entry) => String(entry || "").trim())
          .join(" / "),
      },
      {
        label: "Stage",
        value: academic.currentStage || (semester ? `${getPeriodLabel(academic.periodType)} ${semester}` : ""),
      },
    ];
  }, [isTeacherProfile, profileData]);

  const profilePhotoUrl = readProfilePhotoUrl(profileData);
  const detailSections = isTeacherProfile
    ? TEACHER_PERSONAL_DETAILS_SECTIONS
    : CANONICAL_PERSONAL_DETAILS_SECTIONS;

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/users");
  };

  const handleEditToggle = () => {
    const normalize = isTeacherProfile ? normalizeTeacherTemplate : normalizePersonalTemplate;
    setEditDraft(normalize(profileData?.personalDetails || {}));
    // Seed academic draft from current profile data
    const academic = isPlainObject(profileData?.academicSummary) ? profileData.academicSummary : {};
    setAcademicDraft({
      programId: academic.programId || "",
      batchId: academic.batchId || "",
      stream: academic.stream || "",
      rollNo: academic.rollNo || academic.rollNumber || "",
      academicYear: academic.academicYear || "",
      session: academic.session || "",
    });
    setUpdateReason("");
    setSaveError("");
    setEditMode(true);
  };

  const handleCancelEdit = () => {
    const normalize = isTeacherProfile ? normalizeTeacherTemplate : normalizePersonalTemplate;
    setEditDraft(normalize(profileData?.personalDetails || {}));
    setAcademicDraft({});
    setUpdateReason("");
    setSaveError("");
    setEditMode(false);
  };

  const handleSaveEdit = async () => {
    const validationMessage = validatePersonalDetailsDraft(editDraft, {
      isTeacher: isTeacherProfile,
    });
    if (validationMessage) {
      setSaveError(validationMessage);
      return;
    }

    setSaving(true);
    setSaveError("");
    try {
      // Build academic summary patch (only include non-empty changed fields)
      const academicPatch = {};
      if (!isTeacherProfile && Object.keys(academicDraft).length > 0) {
        const currentAcademic = isPlainObject(profileData?.academicSummary)
          ? profileData.academicSummary
          : {};
        if (academicDraft.programId && academicDraft.programId !== (currentAcademic.programId || "")) {
          academicPatch.programId = academicDraft.programId;
        }
        if (academicDraft.batchId && academicDraft.batchId !== (currentAcademic.batchId || "")) {
          academicPatch.batchId = academicDraft.batchId;
        }
        if (academicDraft.stream !== undefined && academicDraft.stream !== (currentAcademic.stream || "")) {
          academicPatch.stream = academicDraft.stream;
        }
        if (academicDraft.rollNo !== undefined && academicDraft.rollNo !== (currentAcademic.rollNo || currentAcademic.rollNumber || "")) {
          academicPatch.rollNo = academicDraft.rollNo;
        }
        if (academicDraft.academicYear !== undefined && academicDraft.academicYear !== (currentAcademic.academicYear || "")) {
          academicPatch.academicYear = academicDraft.academicYear;
        }
        if (academicDraft.session !== undefined && academicDraft.session !== (currentAcademic.session || "")) {
          academicPatch.session = academicDraft.session;
        }
      }
      const hasAcademicChanges = Object.keys(academicPatch).length > 0;

      await userService.updateUserProfile(userId, {
        personalDetails: editDraft,
        ...(hasAcademicChanges ? { academicSummary: academicPatch } : {}),
        ...(updateReason.trim() ? { updateReason: updateReason.trim() } : {}),
      });

      await loadPage();
      setNotice({ type: "success", message: "Profile updated successfully." });
      setAcademicDraft({});
      setEditMode(false);
    } catch (saveErr) {
      setSaveError(getErrorMessage(saveErr, "Failed to update profile."));
    } finally {
      setSaving(false);
    }
  };

  const setDraftValue = (fieldKey, value) => {
    setEditDraft((prev) => ({
      ...prev,
      [fieldKey]: value,
    }));
  };

  const handlePhotoUpload = async (event) => {
    const file = event?.target?.files?.[0];
    event.target.value = "";
    if (!file || !userId) return;

    setPhotoBusy(true);
    try {
      const response = await userService.uploadUserProfilePhoto(
        userId,
        file,
        "Profile photo updated from User Profile"
      );
      await reloadProfileOnly();
      setNotice({
        type: "success",
        message: response?.message || "Profile photo updated successfully.",
      });
    } catch (uploadError) {
      setNotice({
        type: "error",
        message: getErrorMessage(uploadError, "Failed to upload profile photo."),
      });
    } finally {
      setPhotoBusy(false);
    }
  };

  const handlePhotoDelete = async () => {
    if (!userId) return;

    setPhotoBusy(true);
    try {
      const response = await userService.deleteUserProfilePhoto(
        userId,
        "Profile photo removed from User Profile"
      );
      await reloadProfileOnly();
      setNotice({
        type: "success",
        message: response?.message || "Profile photo removed successfully.",
      });
    } catch (deleteError) {
      setNotice({
        type: "error",
        message: getErrorMessage(deleteError, "Failed to remove profile photo."),
      });
    } finally {
      setPhotoBusy(false);
    }
  };

  // ── Password Reset Handlers ──
  const openResetConfirm = (mode) => {
    if (mode === "manual" && !passwordInput.trim()) {
      setResetError("Enter a password before resetting.");
      return;
    }
    setResetError("");
    setResetModal({ open: true, mode });
  };

  const closeResetConfirm = () => {
    if (resetLoading) return;
    setResetModal({ open: false, mode: "manual" });
  };

  const handleConfirmResetPassword = async () => {
    if (!userId) return;
    setResetLoading(true);
    setResetError("");
    setResetResult(null);
    try {
      const payload =
        resetModal.mode === "generate"
          ? { generateTemp: true }
          : { newPassword: passwordInput.trim() };
      const response = await resetUserPassword(userId, payload);
      setResetResult(response);
      setPasswordInput("");
      setPasswordCopied(false);
      setResetModal({ open: false, mode: "manual" });
    } catch (err) {
      setResetError(
        err.response?.data?.error || err.message || "Failed to reset password."
      );
      setResetModal({ open: false, mode: "manual" });
    } finally {
      setResetLoading(false);
    }
  };

  const handleCopyGeneratedPassword = async () => {
    if (!resetResult?.tempPassword) return;
    try {
      await navigator.clipboard.writeText(resetResult.tempPassword);
      setPasswordCopied(true);
      setTimeout(() => setPasswordCopied(false), 2000);
    } catch {
      /* clipboard not available */
    }
  };

  const toggleSemester = (semesterNo) => {
    setExpandedSemesters((prev) =>
      prev.includes(semesterNo)
        ? prev.filter((entry) => entry !== semesterNo)
        : [...prev, semesterNo]
    );
  };

  const toggleRoleTag = (roleTag) => {
    const normalized = normalizeRoleTag(roleTag);
    if (!normalized) return;
    setRoleTagDraft((prev) =>
      prev.includes(normalized)
        ? prev.filter((entry) => entry !== normalized)
        : [...prev, normalized]
    );
    setRoleTagError("");
  };

  const handleSaveRoleTags = async () => {
    if (!userId) return;
    setRoleTagSaving(true);
    setRoleTagError("");
    try {
      const normalized = Array.from(
        new Set(roleTagDraft.map((entry) => normalizeRoleTag(entry)).filter(Boolean))
      );
      await userService.updateUserAccessRoles(userId, {
        accessRoles: normalized,
        updateReason: "Access role tags updated from user profile",
      });
      await loadPage();
      setNotice({ type: "success", message: "Role tags updated successfully." });
    } catch (saveRoleError) {
      setRoleTagError(
        getErrorMessage(saveRoleError, "Failed to update role tags.")
      );
    } finally {
      setRoleTagSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-white p-4 md:p-6">
        <div className="rounded-xl border border-[rgba(239,68,68,0.2)] bg-white p-5 text-sm text-[#EF4444]">
          Access denied. Admin only.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-4 md:p-6">
        <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-6">
          <div className="flex items-center gap-2 text-sm text-[#94A3B8]">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading profile...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white p-4 md:p-6">
        <div className="rounded-xl border border-[rgba(239,68,68,0.2)] bg-white p-6">
          <div className="mb-3 flex items-center gap-2 text-base font-semibold text-[#EF4444]">
            <AlertTriangle className="h-5 w-5" />
            Failed to load profile
          </div>
          <p className="text-sm text-[#EF4444]">{error}</p>
          <button
            type="button"
            onClick={loadPage}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[rgba(239,68,68,0.3)] bg-white px-3 py-2 text-sm font-semibold text-[#EF4444]"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-4 md:p-6">
      <div className="mx-auto w-full max-w-[1600px] space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-2 rounded-lg border border-[rgba(0,0,0,0.08)] bg-white px-3 py-2 text-sm font-semibold text-[#94A3B8] hover:bg-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          {!editMode ? (
            <button
              type="button"
              onClick={handleEditToggle}
              className="inline-flex items-center gap-2 rounded-lg border border-[rgba(249,115,22,0.2)] bg-white px-3 py-2 text-sm font-semibold text-[#F97316] hover:bg-[rgba(249,115,22,0.1)]"
            >
              <Edit3 className="h-4 w-4" />
              Edit
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg border border-[rgba(0,0,0,0.08)] bg-white px-3 py-2 text-sm font-semibold text-[#94A3B8] disabled:opacity-60"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg border border-[rgba(16,185,129,0.2)] bg-white px-3 py-2 text-sm font-semibold text-[#10B981] disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save
              </button>
            </div>
          )}
        </div>

        {notice ? (
          <div
            className={`rounded-lg border px-3 py-2 text-sm ${
              notice.type === "error"
                ? "border-[rgba(239,68,68,0.2)] bg-white text-[#EF4444]"
                : "border-[rgba(16,185,129,0.2)] bg-white text-[#10B981]"
            }`}
          >
            {notice.message}
          </div>
        ) : null}

        <section className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white">
          <div className="border-b border-[rgba(0,0,0,0.08)] px-5 py-4">
            <h1 className="text-xl font-semibold text-[#1E293B]">
              {isTeacherProfile ? "Teacher Profile" : "Student Profile"}
            </h1>
          </div>

          <div className="grid gap-5 p-5 lg:grid-cols-[1.6fr_0.9fr]">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {headerFields.map((field) => {
                // Academic fields editable in edit mode (students only)
                const academicEditableMap = !isTeacherProfile
                  ? {
                      "Roll No": { key: "rollNo", type: "text" },
                      "Program": { key: "programId", type: "select", options: programsList, labelKey: "name", valueKey: "_id" },
                      "Stream": { key: "stream", type: "text" },
                      "Batch": { key: "batchId", type: "select", options: batchesList, labelKey: "name", valueKey: "_id" },
                      "Academic Year + Session": { key: "_academicYearSession", type: "split" },
                    }
                  : {};
                const editConfig = academicEditableMap[field.label];
                const isEditableField = editMode && editConfig;

                return (
                  <div key={field.label} className="rounded-lg border border-[rgba(0,0,0,0.08)] bg-white p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                      {field.label}
                    </div>
                    {isEditableField ? (
                      editConfig.type === "select" ? (
                        <select
                          value={academicDraft[editConfig.key] || ""}
                          onChange={(e) =>
                            setAcademicDraft((prev) => ({
                              ...prev,
                              [editConfig.key]: e.target.value,
                              // Reset batch when program changes
                              ...(editConfig.key === "programId" ? { batchId: "" } : {}),
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-[rgba(0,0,0,0.08)] bg-white px-3 py-2 text-sm text-[#1E293B] focus:border-[rgba(249,115,22,0.4)] focus:outline-none"
                        >
                          <option value="">Select {field.label}</option>
                          {(editConfig.options || []).map((opt) => (
                            <option key={opt[editConfig.valueKey]} value={opt[editConfig.valueKey]}>
                              {opt[editConfig.labelKey]}
                            </option>
                          ))}
                        </select>
                      ) : editConfig.type === "split" ? (
                        <div className="mt-1 flex gap-2">
                          <input
                            value={academicDraft.academicYear || ""}
                            onChange={(e) =>
                              setAcademicDraft((prev) => ({ ...prev, academicYear: e.target.value }))
                            }
                            placeholder="Year"
                            className="w-1/2 rounded-lg border border-[rgba(0,0,0,0.08)] bg-white px-3 py-2 text-sm text-[#1E293B] focus:border-[rgba(249,115,22,0.4)] focus:outline-none"
                          />
                          <input
                            value={academicDraft.session || ""}
                            onChange={(e) =>
                              setAcademicDraft((prev) => ({ ...prev, session: e.target.value }))
                            }
                            placeholder="Session"
                            className="w-1/2 rounded-lg border border-[rgba(0,0,0,0.08)] bg-white px-3 py-2 text-sm text-[#1E293B] focus:border-[rgba(249,115,22,0.4)] focus:outline-none"
                          />
                        </div>
                      ) : (
                        <input
                          value={academicDraft[editConfig.key] || ""}
                          onChange={(e) =>
                            setAcademicDraft((prev) => ({ ...prev, [editConfig.key]: e.target.value }))
                          }
                          placeholder={`Enter ${field.label}`}
                          className="mt-1 w-full rounded-lg border border-[rgba(0,0,0,0.08)] bg-white px-3 py-2 text-sm text-[#1E293B] focus:border-[rgba(249,115,22,0.4)] focus:outline-none"
                        />
                      )
                    ) : field.label === "Tags" && field.value ? (
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {String(field.value).split(", ").map((tag) => (
                          <span
                            key={tag}
                            className="inline-block rounded-full bg-[rgba(5,150,105,0.1)] px-2.5 py-0.5 text-xs font-semibold text-[#10B981]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-1 text-sm font-medium text-[#1E293B]">{toDisplay(field.value)}</div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="rounded-lg border border-[rgba(0,0,0,0.08)] bg-white p-4">
              <div className="mb-3 text-sm font-semibold text-[#94A3B8]">Profile Photo</div>
              <div className="mb-4 flex justify-center">
                {profilePhotoUrl ? (
                  <img
                    src={profilePhotoUrl}
                    alt="Profile"
                    className="h-36 w-36 rounded-full border border-[rgba(0,0,0,0.08)] object-cover"
                  />
                ) : (
                  <div className="flex h-36 w-36 items-center justify-center rounded-full border border-dashed border-[rgba(0,0,0,0.08)] bg-white text-sm text-[#94A3B8]">
                    No Photo
                  </div>
                )}
              </div>

              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={photoBusy}
                  className="inline-flex items-center gap-2 rounded-lg border border-[rgba(0,0,0,0.08)] bg-white px-3 py-2 text-sm font-medium text-[#94A3B8] disabled:opacity-60"
                >
                  {photoBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  Upload
                </button>
                <button
                  type="button"
                  onClick={handlePhotoDelete}
                  disabled={photoBusy || !profilePhotoUrl}
                  className="inline-flex items-center gap-2 rounded-lg border border-[rgba(239,68,68,0.2)] bg-white px-3 py-2 text-sm font-medium text-[#EF4444] disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── Reset Password Section ── */}
        <section className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white">
          <div className="border-b border-[rgba(0,0,0,0.08)] px-5 py-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-[#94A3B8]" />
              <h2 className="text-xl font-semibold text-[#1E293B]">Reset Password</h2>
            </div>
          </div>
          <div className="space-y-3 p-5">
            {resetError && (
              <div className="rounded-lg border border-[rgba(239,68,68,0.2)] bg-[rgba(220,38,38,0.08)] px-3 py-2 text-sm text-[#EF4444]">
                {resetError}
              </div>
            )}

            {resetResult?.tempPassword && (
              <div className="rounded-lg border border-amber-200 bg-[rgba(245,158,11,0.1)] px-3 py-3">
                <p className="text-sm font-medium text-[#F59E0B]">Temporary password generated</p>
                <p className="mt-1 break-all font-mono text-sm text-[#F59E0B]">
                  {resetResult.tempPassword}
                </p>
                <button
                  type="button"
                  onClick={handleCopyGeneratedPassword}
                  className="mt-2 inline-flex items-center rounded border border-[rgba(245,158,11,0.3)] px-2 py-1 text-xs text-[#F59E0B] hover:bg-[rgba(217,119,6,0.1)]"
                >
                  {passwordCopied ? (
                    <><Check className="mr-1 h-3.5 w-3.5" /> Copied</>
                  ) : (
                    <><Copy className="mr-1 h-3.5 w-3.5" /> Copy password</>
                  )}
                </button>
              </div>
            )}

            {!resetResult?.tempPassword && resetResult?.success && (
              <div className="rounded-lg border border-[rgba(16,185,129,0.2)] bg-[rgba(16,185,129,0.1)] px-3 py-2 text-sm text-[#10B981]">
                Password reset completed.
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input
                type="text"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Enter new password"
                className="w-full rounded-lg border border-[rgba(0,0,0,0.08)] bg-white px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => openResetConfirm("manual")}
                  disabled={resetLoading}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#F97316] px-3 py-2 text-sm font-medium text-white hover:bg-[#EA580C] disabled:opacity-60"
                >
                  <KeyRound className="h-4 w-4" />
                  Set Password
                </button>
                <button
                  type="button"
                  onClick={() => openResetConfirm("generate")}
                  disabled={resetLoading}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-[rgba(0,0,0,0.08)] bg-white px-3 py-2 text-sm font-medium text-[#94A3B8] hover:bg-white disabled:opacity-60"
                >
                  Generate Temp
                </button>
              </div>
            </div>

            <p className="text-xs text-[#94A3B8]">
              User will be required to change their password on next login.
            </p>
          </div>
        </section>

        {canManageRoleTags ? (
          <section className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white">
            <div className="border-b border-[rgba(0,0,0,0.08)] px-5 py-4">
              <h2 className="text-xl font-semibold text-[#1E293B]">Role Tags</h2>
            </div>
            <div className="space-y-4 p-5">
              {roleTagError ? (
                <div className="rounded-lg border border-[rgba(239,68,68,0.2)] bg-white px-3 py-2 text-sm text-[#EF4444]">
                  {roleTagError}
                </div>
              ) : null}

              {roleTagLoading ? (
                <div className="flex items-center gap-2 text-sm text-[#94A3B8]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading role tags...
                </div>
              ) : roleTagOptions.length ? (
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {roleTagOptions.map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-2 rounded-lg border border-[rgba(0,0,0,0.08)] px-3 py-2 text-sm text-[#1E293B]"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-[rgba(0,0,0,0.08)]"
                        checked={roleTagDraft.includes(option.value)}
                        onChange={() => toggleRoleTag(option.value)}
                        disabled={roleTagSaving}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#94A3B8]">No active role tags available.</p>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveRoleTags}
                  disabled={roleTagSaving || roleTagLoading || roleTagOptions.length === 0}
                  className="inline-flex items-center gap-2 rounded-lg border border-[rgba(249,115,22,0.2)] bg-white px-3 py-2 text-sm font-semibold text-[#F97316] disabled:opacity-60"
                >
                  {roleTagSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Role Tags
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {!isTeacherProfile ? (
          <section className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white">
            <div className="border-b border-[rgba(0,0,0,0.08)] px-5 py-4">
              <h2 className="text-xl font-semibold text-[#1E293B]">Program Progress</h2>
            </div>

            {programProgressError ? (
              <div className="mx-5 mt-4 rounded-lg border border-[rgba(239,68,68,0.2)] bg-white px-3 py-2 text-sm text-[#EF4444]">
                {programProgressError}
              </div>
            ) : null}

            <div className="overflow-x-auto p-5">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-white text-[#94A3B8]">
                    <th className="w-10 border border-[rgba(0,0,0,0.08)] px-3 py-2" />
                    <th className="border border-[rgba(0,0,0,0.08)] px-3 py-2 text-left font-semibold">{getPeriodLabel(profileData?.academicSummary?.periodType)}</th>
                    <th className="border border-[rgba(0,0,0,0.08)] px-3 py-2 text-left font-semibold">Academic Year</th>
                    <th className="border border-[rgba(0,0,0,0.08)] px-3 py-2 text-left font-semibold">Academic Season</th>
                    <th className="border border-[rgba(0,0,0,0.08)] px-3 py-2 text-left font-semibold">Status</th>
                    <th className="border border-[rgba(0,0,0,0.08)] px-3 py-2 text-left font-semibold">Credit</th>
                    <th className="border border-[rgba(0,0,0,0.08)] px-3 py-2 text-left font-semibold">SGPA</th>
                    <th className="border border-[rgba(0,0,0,0.08)] px-3 py-2 text-left font-semibold">CGPA</th>
                  </tr>
                </thead>
                <tbody>
                  {programProgress.length ? (
                    programProgress.map((semester) => {
                      const expanded = expandedSemesters.includes(semester.semesterNo);
                      return (
                        <React.Fragment key={`semester-${semester.semesterNo}`}>
                          <tr
                            className={`cursor-pointer ${
                              semester.hasBacklog ? "bg-[rgba(220,38,38,0.08)]" : "bg-white"
                            } hover:bg-white`}
                            onClick={() => toggleSemester(semester.semesterNo)}
                          >
                            <td className="border border-[rgba(0,0,0,0.08)] px-3 py-2 text-[#94A3B8]">
                              {expanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </td>
                            <td className="border border-[rgba(0,0,0,0.08)] px-3 py-2 text-[#1E293B]">
                              {toSemesterLabel(semester.semesterNo)}
                            </td>
                            <td className="border border-[rgba(0,0,0,0.08)] px-3 py-2 text-[#1E293B]">
                              {toDisplay(semester.academicYear)}
                            </td>
                            <td className="border border-[rgba(0,0,0,0.08)] px-3 py-2 text-[#1E293B]">
                              {toDisplay(semester.season)}
                            </td>
                            <td className="border border-[rgba(0,0,0,0.08)] px-3 py-2 text-[#1E293B]">
                              {toDisplay(semester.status)}
                            </td>
                            <td className="border border-[rgba(0,0,0,0.08)] px-3 py-2 text-[#1E293B]">
                              {toDisplay(semester.totalCredits)}
                            </td>
                            <td className="border border-[rgba(0,0,0,0.08)] px-3 py-2 text-[#1E293B]">
                              {toGpaDisplay(semester.sgpa)}
                            </td>
                            <td className="border border-[rgba(0,0,0,0.08)] px-3 py-2 text-[#1E293B]">
                              {toGpaDisplay(semester.cgpa)}
                            </td>
                          </tr>

                          {expanded ? (
                            <tr className="bg-white">
                              <td colSpan={8} className="border border-[rgba(0,0,0,0.08)] px-3 py-3">
                                <div className="mb-2 text-sm font-semibold text-[#94A3B8]">
                                  Semester Course Progress
                                </div>
                                <div className="overflow-x-auto">
                                  <table className="min-w-full border-collapse text-sm">
                                    <thead>
                                      <tr className="bg-white text-[#94A3B8]">
                                        <th className="border border-[rgba(0,0,0,0.08)] px-3 py-2 text-left">Course Code</th>
                                        <th className="border border-[rgba(0,0,0,0.08)] px-3 py-2 text-left">Course Name</th>
                                        <th className="border border-[rgba(0,0,0,0.08)] px-3 py-2 text-left">Credit</th>
                                        <th className="border border-[rgba(0,0,0,0.08)] px-3 py-2 text-left">Grade</th>
                                        <th className="border border-[rgba(0,0,0,0.08)] px-3 py-2 text-left">Backlog Status</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {semester.courses.length ? (
                                        semester.courses.map((course, idx) => {
                                          const backlog =
                                            course.isBacklog === true ||
                                            String(course.grade || "").trim().toUpperCase() === "F";
                                          return (
                                            <tr key={`${semester.semesterNo}-course-${idx}`} className="bg-white">
                                              <td className="border border-[rgba(0,0,0,0.08)] px-3 py-2 text-[#1E293B]">
                                                {toDisplay(course.courseCode)}
                                              </td>
                                              <td className="border border-[rgba(0,0,0,0.08)] px-3 py-2 text-[#1E293B]">
                                                {toDisplay(course.courseName)}
                                              </td>
                                              <td className="border border-[rgba(0,0,0,0.08)] px-3 py-2 text-[#1E293B]">
                                                {toDisplay(course.credit)}
                                              </td>
                                              <td className="border border-[rgba(0,0,0,0.08)] px-3 py-2 text-[#1E293B]">
                                                {toDisplay(course.grade)}
                                              </td>
                                              <td className="border border-[rgba(0,0,0,0.08)] px-3 py-2 text-[#1E293B]">
                                                {backlog ? "Yes" : "No"}
                                              </td>
                                            </tr>
                                          );
                                        })
                                      ) : (
                                        <tr className="bg-white">
                                          <td
                                            colSpan={5}
                                            className="border border-[rgba(0,0,0,0.08)] px-3 py-3 text-center text-[#94A3B8]"
                                          >
                                            No course progress found for this semester.
                                          </td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          ) : null}
                        </React.Fragment>
                      );
                    })
                  ) : (
                    <tr className="bg-white">
                      <td colSpan={8} className="border border-[rgba(0,0,0,0.08)] px-3 py-4 text-center text-[#94A3B8]">
                        No academic progress data available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        <section className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white">
          <div className="border-b border-[rgba(0,0,0,0.08)] px-5 py-4">
                <h2 className="text-xl font-semibold text-[#1E293B]">
                  {isTeacherProfile ? "Teacher Details" : "Personal Details"}
                </h2>
          </div>

          {saveError ? (
            <div className="mx-5 mt-4 rounded-lg border border-[rgba(239,68,68,0.2)] bg-white px-3 py-2 text-sm text-[#EF4444]">
              {saveError}
            </div>
          ) : null}

          {editMode ? (
            <div className="px-5 pt-4">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                Update Reason (optional)
              </label>
              <input
                value={updateReason}
                onChange={(event) => setUpdateReason(event.target.value)}
                className="w-full rounded-lg border border-[rgba(0,0,0,0.08)] bg-white px-3 py-2 text-sm text-[#1E293B] focus:border-[rgba(249,115,22,0.4)] focus:outline-none"
                placeholder="Reason for profile update"
              />
            </div>
          ) : null}

          <div className="space-y-5 p-5">
            {detailSections.map((section) => (
              <div key={section.title} className="rounded-lg border border-[rgba(0,0,0,0.08)] bg-white p-4">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#94A3B8]">
                  {section.title}
                </h3>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {section.fields.map((field) => {
                    const value = String(editDraft[field] || "").trim();
                    const showViewLink = !editMode && isHttpUrl(value);

                    return (
                      <div key={field} className="rounded-lg border border-[rgba(0,0,0,0.08)] bg-white p-3">
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                          {field}
                        </label>

                        {!editMode ? (
                          <div className="text-sm text-[#1E293B]">
                            {showViewLink ? (
                              <a
                                href={value}
                                target="_blank"
                                rel="noreferrer"
                                className="font-semibold text-[#F97316] underline"
                              >
                                View
                              </a>
                            ) : (
                              toDisplay(value)
                            )}
                          </div>
                        ) : (
                          <input
                            value={value}
                            onChange={(event) => setDraftValue(field, event.target.value)}
                            className="w-full rounded-lg border border-[rgba(0,0,0,0.08)] bg-white px-3 py-2 text-sm text-[#1E293B] focus:border-[rgba(249,115,22,0.4)] focus:outline-none"
                            placeholder={`Enter ${field}`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white px-4 py-2 text-xs text-[#94A3B8]">
          Last updated: {toDateDisplay(profileData?.audit?.updatedAt)}
        </div>
      </div>

      {/* ── Reset Password Confirmation Modal ── */}
      {resetModal.open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-lg border border-[rgba(0,0,0,0.08)]">
            <div className="px-5 py-4 border-b border-[rgba(0,0,0,0.08)]">
              <h3 className="text-lg font-semibold text-[#1E293B]">Confirm Password Reset</h3>
            </div>
            <div className="px-5 py-4 text-sm text-[#94A3B8]">
              {resetModal.mode === "generate"
                ? "Generate a temporary password for this user and reveal it once?"
                : "Reset this user\u2019s password to the value entered above?"}
            </div>
            <div className="px-5 py-4 border-t border-[rgba(0,0,0,0.08)] flex justify-end gap-2">
              <button
                type="button"
                onClick={closeResetConfirm}
                className="rounded-lg border border-[rgba(0,0,0,0.08)] px-4 py-2 text-sm text-[#94A3B8] hover:bg-white"
                disabled={resetLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmResetPassword}
                className="rounded-lg bg-[#F97316] px-4 py-2 text-sm text-white hover:bg-[#EA580C] disabled:opacity-60"
                disabled={resetLoading}
              >
                {resetLoading ? "Processing..." : "Confirm Reset"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
