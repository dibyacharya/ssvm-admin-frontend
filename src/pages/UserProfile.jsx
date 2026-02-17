import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Camera,
  Loader2,
  Pencil,
  Save,
  Search,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import {
  changeMyPassword,
  deleteUserProfilePhoto,
  getUserProfile,
  updateUserProfile,
  uploadUserProfilePhoto,
} from "../services/user.service";

const EMAIL_REGEX = /^[\w.-]+@([\w-]+\.)+[\w-]{2,}$/i;
const MODULE_PAGE_SIZES = [10, 20];

const toDisplay = (value) => {
  if (value === undefined || value === null) return "--";
  const normalized = String(value).trim();
  return normalized || "--";
};

const toDateTimeDisplay = (value) => {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "--";
  return parsed.toLocaleString();
};

const normalizePhoneDigits = (value) => String(value || "").replace(/\D/g, "");

const isValidPhone = (value) => {
  if (!value) return true;
  const digits = normalizePhoneDigits(value);
  return digits.length >= 10 && digits.length <= 15;
};

const toFormState = (payload = {}) => {
  const personal = payload.personalDetails || {};
  const academic = payload.academicSummary || {};

  return {
    fullName: personal.fullName || "",
    dob: personal.dob || "",
    gender: personal.gender || "",
    category: personal.category || "",
    email: personal.email || "",
    phone: personal.phone || "",
    whatsApp: personal.whatsApp || "",
    permanentAddress: personal.permanentAddress || "",
    correspondenceAddress: personal.correspondenceAddress || "",
    state: personal.state || "",
    city: personal.city || "",
    pin: personal.pin || "",
    fatherName: personal.fatherName || "",
    fatherPhone: personal.fatherPhone || "",
    motherName: personal.motherName || "",
    programId: academic.programId || "",
    stream: academic.stream || "",
    batchId: academic.batchId || "",
    cohort: academic.cohort || "",
    academicYear: academic.academicYear || "",
    session: academic.session || "",
    currentSemester:
      academic.currentSemester === undefined || academic.currentSemester === null
        ? ""
        : String(academic.currentSemester),
    currentStage: academic.currentStage || "",
    status: academic.status || "",
    rollNo: academic.rollNo || "",
    updateReason: "",
  };
};

const sortModules = (rows = [], sort) => {
  const key = sort?.key || "subjectCode";
  const direction = sort?.direction === "desc" ? -1 : 1;

  return [...rows].sort((a, b) => {
    const left = a?.[key] ?? "";
    const right = b?.[key] ?? "";

    const leftNum = Number(left);
    const rightNum = Number(right);

    if (Number.isFinite(leftNum) && Number.isFinite(rightNum)) {
      return (leftNum - rightNum) * direction;
    }

    return String(left).localeCompare(String(right)) * direction;
  });
};

const UserProfile = () => {
  const navigate = useNavigate();
  const { userId = "" } = useParams();
  const { user, updateUser: syncAuthUser } = useAuth();

  const actorRole = String(user?.role || "").toLowerCase();
  const isAdminActor = actorRole === "admin" || actorRole === "super admin";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profileData, setProfileData] = useState(null);
  const [form, setForm] = useState(() => toFormState());
  const [baseline, setBaseline] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [activeSection, setActiveSection] = useState("academic");
  const [showPasswordEditor, setShowPasswordEditor] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSaveError, setPasswordSaveError] = useState("");

  const [moduleSearchInput, setModuleSearchInput] = useState("");
  const [moduleSearch, setModuleSearch] = useState("");
  const [moduleYearFilter, setModuleYearFilter] = useState("");
  const [moduleSessionFilter, setModuleSessionFilter] = useState("");
  const [moduleSort, setModuleSort] = useState({ key: "subjectCode", direction: "asc" });
  const [modulePage, setModulePage] = useState(1);
  const [modulePageSize, setModulePageSize] = useState(MODULE_PAGE_SIZES[0]);

  const photoInputRef = useRef(null);
  const academicSectionRef = useRef(null);
  const personalSectionRef = useRef(null);

  const permissions = profileData?.permissions || {};
  const canEditProfile = permissions.canEditProfile === true;
  const canEditAcademic = permissions.canEditAcademic === true;
  const canManagePhoto = permissions.canManagePhoto === true;
  const viewerId = String(user?._id || user?.id || "");
  const isViewingOwnProfile = Boolean(viewerId && userId && viewerId === String(userId));
  const targetUserRole = String(profileData?.user?.role || "").toLowerCase();
  const isOwnAdminProfile =
    isViewingOwnProfile &&
    (targetUserRole === "admin" || targetUserRole === "") &&
    isAdminActor;

  const hasUnsavedChanges = useMemo(() => {
    if (!editMode || !baseline) return false;
    return JSON.stringify(form) !== baseline;
  }, [baseline, editMode, form]);

  const loadProfile = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError("");
    setSaveError("");

    try {
      const response = await getUserProfile(userId);
      const nextForm = toFormState(response);

      setProfileData(response);
      setForm(nextForm);
      setBaseline(JSON.stringify(nextForm));
      setEditMode(false);
      setFormErrors({});
      setShowPasswordEditor(false);
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setPasswordErrors({});
      setPasswordSaveError("");
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!isAdminActor) {
      setLoading(false);
      return;
    }

    loadProfile();
  }, [isAdminActor, loadProfile]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setModuleSearch(moduleSearchInput.trim().toLowerCase());
    }, 250);
    return () => clearTimeout(timer);
  }, [moduleSearchInput]);

  const registrationHistory = profileData?.registrationHistory || [];
  const modules = profileData?.modules || [];
  const userIdSourceLabel =
    profileData?.academicSummary?.userIdentifierLabel ||
    profileData?.user?.userIdLabel ||
    "User ID";
  const headerStageValue = profileData?.academicSummary?.currentStage
    ? profileData.academicSummary.currentStage
    : profileData?.academicSummary?.currentSemester !== undefined &&
      profileData?.academicSummary?.currentSemester !== null &&
      String(profileData.academicSummary.currentSemester).trim()
    ? `Semester ${profileData.academicSummary.currentSemester}`
    : "";

  const moduleYearOptions = useMemo(() => {
    return [...new Set(modules.map((row) => String(row.academicYear || "").trim()).filter(Boolean))];
  }, [modules]);

  const moduleSessionOptions = useMemo(() => {
    return [...new Set(modules.map((row) => String(row.session || "").trim()).filter(Boolean))];
  }, [modules]);

  const filteredModules = useMemo(() => {
    return modules.filter((row) => {
      const subjectCode = String(row.subjectCode || "").toLowerCase();
      const subjectName = String(row.subjectName || "").toLowerCase();
      const year = String(row.academicYear || "").trim();
      const session = String(row.session || "").trim();

      const matchesSearch =
        !moduleSearch || subjectCode.includes(moduleSearch) || subjectName.includes(moduleSearch);
      const matchesYear = !moduleYearFilter || moduleYearFilter === year;
      const matchesSession = !moduleSessionFilter || moduleSessionFilter === session;

      return matchesSearch && matchesYear && matchesSession;
    });
  }, [moduleSearch, moduleSessionFilter, moduleYearFilter, modules]);

  const sortedModules = useMemo(() => sortModules(filteredModules, moduleSort), [filteredModules, moduleSort]);

  const moduleTotalPages = useMemo(() => {
    return Math.max(1, Math.ceil(sortedModules.length / modulePageSize));
  }, [modulePageSize, sortedModules.length]);

  useEffect(() => {
    setModulePage(1);
  }, [moduleSearch, moduleSort, moduleSessionFilter, moduleYearFilter, modulePageSize]);

  useEffect(() => {
    if (modulePage > moduleTotalPages) {
      setModulePage(moduleTotalPages);
    }
  }, [modulePage, moduleTotalPages]);

  const pagedModules = useMemo(() => {
    const start = (modulePage - 1) * modulePageSize;
    return sortedModules.slice(start, start + modulePageSize);
  }, [modulePage, modulePageSize, sortedModules]);

  const toggleModuleSort = (key) => {
    setModuleSort((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  const goToSection = (sectionId) => {
    setActiveSection(sectionId);
  };

  const updateFormField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormErrors((prev) => ({ ...prev, [key]: "" }));
    setSaveError("");
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!form.fullName.trim()) {
      nextErrors.fullName = "Full Name is required";
    }

    const email = form.email.trim().toLowerCase();
    if (!email || !EMAIL_REGEX.test(email)) {
      nextErrors.email = "Valid email is required";
    }

    if (!isValidPhone(form.phone)) {
      nextErrors.phone = "Phone must be 10-15 digits";
    }

    if (!isValidPhone(form.whatsApp)) {
      nextErrors.whatsApp = "WhatsApp must be 10-15 digits";
    }

    if (!isValidPhone(form.fatherPhone)) {
      nextErrors.fatherPhone = "Father phone must be 10-15 digits";
    }

    if (isOwnAdminProfile) {
      return nextErrors;
    }

    if (canEditAcademic) {
      if (!form.programId.trim()) {
        nextErrors.programId = "Program is required";
      }
      if (!form.batchId.trim()) {
        nextErrors.batchId = "Batch is required";
      }
      if (!form.status.trim()) {
        nextErrors.status = "Status is required";
      }
    }

    return nextErrors;
  };

  const handleSave = async () => {
    const nextErrors = validateForm();
    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    setSaveError("");

    try {
      if (isOwnAdminProfile) {
        const normalizedName = form.fullName.trim();
        const normalizedEmail = form.email.trim().toLowerCase();
        const normalizedMobile = form.phone.trim();

        const response = await updateUserProfile(userId, {
          personalDetails: {
            fullName: normalizedName,
            email: normalizedEmail,
            phone: normalizedMobile,
          },
          updateReason: form.updateReason.trim(),
        });

        if (typeof syncAuthUser === "function") {
          syncAuthUser({
            name: normalizedName,
            email: normalizedEmail,
            mobileNo: normalizedMobile || "",
          });
        }

        const nextForm = toFormState(response);
        setProfileData(response);
        setForm(nextForm);
        setBaseline(JSON.stringify(nextForm));
        setEditMode(false);
        setToast({ type: "success", message: "Profile updated successfully" });
        return;
      }

      const payload = {
        personalDetails: {
          fullName: form.fullName.trim(),
          dob: form.dob || null,
          gender: form.gender.trim(),
          category: form.category.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim(),
          whatsApp: form.whatsApp.trim(),
          permanentAddress: form.permanentAddress.trim(),
          correspondenceAddress: form.correspondenceAddress.trim(),
          state: form.state.trim(),
          city: form.city.trim(),
          pin: form.pin.trim(),
          fatherName: form.fatherName.trim(),
          fatherPhone: form.fatherPhone.trim(),
          motherName: form.motherName.trim(),
        },
        updateReason: form.updateReason.trim(),
      };

      if (canEditAcademic) {
        payload.academicSummary = {
          programId: form.programId.trim() || null,
          stream: form.stream.trim(),
          batchId: form.batchId.trim() || null,
          cohort: form.cohort.trim(),
          academicYear: form.academicYear.trim(),
          session: form.session.trim(),
          currentSemester: form.currentSemester ? Number(form.currentSemester) : null,
          currentStage: form.currentStage.trim(),
          status: form.status.trim(),
          rollNo: form.rollNo.trim(),
        };
      }

      const response = await updateUserProfile(userId, payload);
      const nextForm = toFormState(response);

      setProfileData(response);
      setForm(nextForm);
      setBaseline(JSON.stringify(nextForm));
      setEditMode(false);
      setToast({ type: "success", message: "Profile updated successfully" });
    } catch (err) {
      setSaveError(err.response?.data?.error || err.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (saving) return;

    if (baseline) {
      setForm(JSON.parse(baseline));
    }

    setFormErrors({});
    setSaveError("");
    setShowPasswordEditor(false);
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setPasswordErrors({});
    setPasswordSaveError("");
    setEditMode(false);
  };

  const updatePasswordField = (key, value) => {
    setPasswordForm((prev) => ({ ...prev, [key]: value }));
    setPasswordErrors((prev) => ({ ...prev, [key]: "" }));
    setPasswordSaveError("");
  };

  const validatePasswordForm = () => {
    const nextErrors = {};
    if (!passwordForm.currentPassword) {
      nextErrors.currentPassword = "Current password is required";
    }
    if (!passwordForm.newPassword) {
      nextErrors.newPassword = "New password is required";
    } else if (passwordForm.newPassword.length < 6) {
      nextErrors.newPassword = "New password must be at least 6 characters";
    }
    if (!passwordForm.confirmPassword) {
      nextErrors.confirmPassword = "Please confirm new password";
    } else if (passwordForm.confirmPassword !== passwordForm.newPassword) {
      nextErrors.confirmPassword = "New password and confirmation do not match";
    }
    return nextErrors;
  };

  const handleChangePassword = async () => {
    const nextErrors = validatePasswordForm();
    setPasswordErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setPasswordSaving(true);
    setPasswordSaveError("");
    try {
      await changeMyPassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setPasswordErrors({});
      setShowPasswordEditor(false);
      setToast({ type: "success", message: "Password updated successfully" });
    } catch (err) {
      setPasswordSaveError(
        err.response?.data?.error || err.response?.data?.message || err.message || "Failed to update password"
      );
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleUploadPhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        "You have unsaved profile changes. Uploading photo will refresh data. Continue?"
      );
      if (!confirmed) return;
    }

    setPhotoBusy(true);
    setSaveError("");

    try {
      await uploadUserProfilePhoto(userId, file);
      await loadProfile();
      setToast({ type: "success", message: "Photo updated successfully" });
    } catch (err) {
      setSaveError(err.response?.data?.error || err.message || "Failed to upload photo");
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        "You have unsaved profile changes. Removing photo will refresh data. Continue?"
      );
      if (!confirmed) return;
    }

    setPhotoBusy(true);
    setSaveError("");

    try {
      await deleteUserProfilePhoto(userId);
      await loadProfile();
      setToast({ type: "success", message: "Photo removed successfully" });
    } catch (err) {
      setSaveError(err.response?.data?.error || err.message || "Failed to remove photo");
    } finally {
      setPhotoBusy(false);
    }
  };

  const renderPersonalRow = (label, key, { type = "text", editable = true, value } = {}) => {
    const displayValue = value !== undefined ? value : form[key];

    return (
      <tr key={label} className="border-b border-[#b8c7d9] last:border-b-0">
        <th className="w-[34%] bg-[#c9d5e6] px-3 py-2 text-right text-[17px] font-semibold text-[#4776a0]">
          {label}
        </th>
        <td className="bg-[#dfe6ef] px-3 py-2 text-[20px] font-semibold text-[#102537]">
          {editMode && editable ? (
            <div>
              <input
                type={type}
                value={form[key]}
                onChange={(event) => updateFormField(key, event.target.value)}
                className={`w-full rounded border px-3 py-1.5 text-[16px] font-normal text-[#102537] focus:outline-none ${
                  formErrors[key]
                    ? "border-red-400 focus:border-red-500"
                    : "border-[#8da8c2] focus:border-[#4e78a4]"
                }`}
              />
              {formErrors[key] && <div className="mt-1 text-xs text-red-600">{formErrors[key]}</div>}
            </div>
          ) : (
            <span>{toDisplay(displayValue)}</span>
          )}
        </td>
      </tr>
    );
  };

  const registrationHeader = [
    { key: "stageDesc", label: "Stage (Desc.)" },
    { key: "academicYear", label: "Acad. Year" },
    { key: "status", label: "Class. (desc.)" },
    { key: "session", label: "Acad. Session (Desc)" },
    { key: "cgpa", label: "CGPA" },
  ];

  const moduleHeader = [
    { key: "subjectCode", label: "Object abbr." },
    { key: "subjectName", label: "Name" },
    { key: "academicYear", label: "Acad. Year" },
    { key: "session", label: "Acad. Session (Desc)" },
    { key: "totalMarksOrGrade", label: "Total Marks" },
    { key: "resultStatus", label: "Bkg Status(DS.)" },
  ];

  if (!isAdminActor) {
    return (
      <div className="rounded border border-red-300 bg-red-50 px-4 py-3 text-red-700">
        Access denied. Only admin users can access profile view.
      </div>
    );
  }

  if (isOwnAdminProfile) {
    return (
      <div className="min-h-[calc(100vh-120px)] space-y-3 rounded border border-[#8ea9c4] bg-[#cfd8e3] p-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate("/users")}
            className="inline-flex items-center rounded border border-[#8aa6c2] bg-[#edf3f8] px-3 py-1.5 text-sm font-semibold text-[#22496d] hover:bg-[#dce8f2]"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to Users
          </button>
          {canEditProfile && (
            <div className="flex items-center gap-2">
              {!editMode ? (
                <button
                  type="button"
                  onClick={() => setEditMode(true)}
                  className="inline-flex items-center rounded border border-[#4f7ca5] bg-[#2f6ea5] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#2b638f]"
                >
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  Edit
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={saving || passwordSaving}
                    className="inline-flex items-center rounded border border-[#8ca5bd] bg-white px-3 py-1.5 text-xs font-semibold text-[#214667] hover:bg-[#ebf2f8] disabled:opacity-60"
                  >
                    <X className="mr-1.5 h-3.5 w-3.5" />
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || passwordSaving}
                    className="inline-flex items-center rounded border border-[#3f7c56] bg-[#4f9a69] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#457f59] disabled:opacity-60"
                  >
                    {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
                    Save
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {toast && (
          <div
            className={`rounded border px-3 py-2 text-sm ${
              toast.type === "success"
                ? "border-green-300 bg-green-100 text-green-800"
                : "border-red-300 bg-red-100 text-red-800"
            }`}
          >
            {toast.message}
          </div>
        )}

        {loading ? (
          <div className="h-44 animate-pulse rounded bg-[#b8c9db]" />
        ) : error ? (
          <div className="rounded border border-red-300 bg-red-100 px-4 py-3 text-red-800">
            <div>{error}</div>
            <button
              type="button"
              onClick={loadProfile}
              className="mt-3 rounded border border-red-400 px-3 py-1.5 text-sm hover:bg-red-200"
            >
              Retry
            </button>
          </div>
        ) : (
          <section className="rounded border border-[#98afc5] bg-[#d9e5f1]">
            <div className="border-b border-[#afc3d7] bg-[#bfd2e7] px-3 py-2 text-xl font-bold text-[#10273d]">
              Admin Profile
            </div>

            {saveError && (
              <div className="mx-3 mt-3 rounded border border-red-300 bg-red-100 px-3 py-2 text-sm text-red-800">
                {saveError}
              </div>
            )}
            {passwordSaveError && (
              <div className="mx-3 mt-3 rounded border border-red-300 bg-red-100 px-3 py-2 text-sm text-red-800">
                {passwordSaveError}
              </div>
            )}

            <div className="p-3">
              <table className="w-full border-collapse text-sm">
                <tbody>
                  <tr className="border-b border-[#b8c7d9]">
                    <th className="w-[34%] bg-[#c9d5e6] px-3 py-2 text-right text-[17px] font-semibold text-[#4776a0]">
                      Name
                    </th>
                    <td className="bg-[#dfe6ef] px-3 py-2 text-[20px] font-semibold text-[#102537]">
                      {editMode ? (
                        <div>
                          <input
                            type="text"
                            value={form.fullName}
                            onChange={(event) => updateFormField("fullName", event.target.value)}
                            className={`w-full rounded border px-3 py-1.5 text-[16px] font-normal text-[#102537] focus:outline-none ${
                              formErrors.fullName
                                ? "border-red-400 focus:border-red-500"
                                : "border-[#8da8c2] focus:border-[#4e78a4]"
                            }`}
                          />
                          {formErrors.fullName && (
                            <div className="mt-1 text-xs text-red-600">{formErrors.fullName}</div>
                          )}
                        </div>
                      ) : (
                        <span>{toDisplay(form.fullName || profileData?.user?.name)}</span>
                      )}
                    </td>
                  </tr>

                  <tr className="border-b border-[#b8c7d9]">
                    <th className="w-[34%] bg-[#c9d5e6] px-3 py-2 text-right text-[17px] font-semibold text-[#4776a0]">
                      Mail ID
                    </th>
                    <td className="bg-[#dfe6ef] px-3 py-2 text-[20px] font-semibold text-[#102537]">
                      {editMode ? (
                        <div>
                          <input
                            type="email"
                            value={form.email}
                            onChange={(event) => updateFormField("email", event.target.value)}
                            className={`w-full rounded border px-3 py-1.5 text-[16px] font-normal text-[#102537] focus:outline-none ${
                              formErrors.email
                                ? "border-red-400 focus:border-red-500"
                                : "border-[#8da8c2] focus:border-[#4e78a4]"
                            }`}
                          />
                          {formErrors.email && (
                            <div className="mt-1 text-xs text-red-600">{formErrors.email}</div>
                          )}
                        </div>
                      ) : (
                        <span>{toDisplay(form.email || profileData?.user?.email)}</span>
                      )}
                    </td>
                  </tr>

                  <tr className="border-b border-[#b8c7d9]">
                    <th className="w-[34%] bg-[#c9d5e6] px-3 py-2 text-right text-[17px] font-semibold text-[#4776a0]">
                      Mobile Number
                    </th>
                    <td className="bg-[#dfe6ef] px-3 py-2 text-[20px] font-semibold text-[#102537]">
                      {editMode ? (
                        <div>
                          <input
                            type="text"
                            value={form.phone}
                            onChange={(event) => updateFormField("phone", event.target.value)}
                            className={`w-full rounded border px-3 py-1.5 text-[16px] font-normal text-[#102537] focus:outline-none ${
                              formErrors.phone
                                ? "border-red-400 focus:border-red-500"
                                : "border-[#8da8c2] focus:border-[#4e78a4]"
                            }`}
                          />
                          {formErrors.phone && (
                            <div className="mt-1 text-xs text-red-600">{formErrors.phone}</div>
                          )}
                        </div>
                      ) : (
                        <span>{toDisplay(form.phone || profileData?.user?.mobileNo)}</span>
                      )}
                    </td>
                  </tr>

                  <tr>
                    <th className="w-[34%] bg-[#c9d5e6] px-3 py-2 text-right text-[17px] font-semibold text-[#4776a0]">
                      Password
                    </th>
                    <td className="bg-[#dfe6ef] px-3 py-2 text-[20px] font-semibold text-[#102537]">
                      <div className="flex items-center justify-between gap-3">
                        <span>********</span>
                        {editMode && (
                          <button
                            type="button"
                            onClick={() => {
                              setShowPasswordEditor((prev) => !prev);
                              setPasswordErrors({});
                              setPasswordSaveError("");
                            }}
                            className="rounded border border-[#8ca5bd] bg-white px-2 py-1 text-xs font-semibold text-[#214667] hover:bg-[#ebf2f8]"
                          >
                            {showPasswordEditor ? "Hide Password Form" : "Change Password"}
                          </button>
                        )}
                      </div>

                      {editMode && showPasswordEditor && (
                        <div className="mt-3 space-y-2 rounded border border-[#9fb5ca] bg-[#d4deea] p-3">
                          <div>
                            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#375a79]">
                              Current Password
                            </div>
                            <input
                              type="password"
                              value={passwordForm.currentPassword}
                              onChange={(event) =>
                                updatePasswordField("currentPassword", event.target.value)
                              }
                              className={`w-full rounded border px-3 py-1.5 text-sm focus:outline-none ${
                                passwordErrors.currentPassword
                                  ? "border-red-400 focus:border-red-500"
                                  : "border-[#8da8c2] focus:border-[#4e78a4]"
                              }`}
                            />
                            {passwordErrors.currentPassword && (
                              <div className="mt-1 text-xs text-red-600">
                                {passwordErrors.currentPassword}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#375a79]">
                              New Password
                            </div>
                            <input
                              type="password"
                              value={passwordForm.newPassword}
                              onChange={(event) =>
                                updatePasswordField("newPassword", event.target.value)
                              }
                              className={`w-full rounded border px-3 py-1.5 text-sm focus:outline-none ${
                                passwordErrors.newPassword
                                  ? "border-red-400 focus:border-red-500"
                                  : "border-[#8da8c2] focus:border-[#4e78a4]"
                              }`}
                            />
                            {passwordErrors.newPassword && (
                              <div className="mt-1 text-xs text-red-600">
                                {passwordErrors.newPassword}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#375a79]">
                              Confirm New Password
                            </div>
                            <input
                              type="password"
                              value={passwordForm.confirmPassword}
                              onChange={(event) =>
                                updatePasswordField("confirmPassword", event.target.value)
                              }
                              className={`w-full rounded border px-3 py-1.5 text-sm focus:outline-none ${
                                passwordErrors.confirmPassword
                                  ? "border-red-400 focus:border-red-500"
                                  : "border-[#8da8c2] focus:border-[#4e78a4]"
                              }`}
                            />
                            {passwordErrors.confirmPassword && (
                              <div className="mt-1 text-xs text-red-600">
                                {passwordErrors.confirmPassword}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center justify-end">
                            <button
                              type="button"
                              onClick={handleChangePassword}
                              disabled={passwordSaving}
                              className="inline-flex items-center rounded border border-[#3f7c56] bg-[#4f9a69] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#457f59] disabled:opacity-60"
                            >
                              {passwordSaving ? (
                                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Save className="mr-1.5 h-3.5 w-3.5" />
                              )}
                              Update Password
                            </button>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-120px)] space-y-3 rounded border border-[#8ea9c4] bg-[#cfd8e3] p-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate("/users")}
          className="inline-flex items-center rounded border border-[#8aa6c2] bg-[#edf3f8] px-3 py-1.5 text-sm font-semibold text-[#22496d] hover:bg-[#dce8f2]"
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to Users
        </button>
        {canEditProfile && (
          <div className="flex items-center gap-2">
            {!editMode ? (
              <button
                type="button"
                onClick={() => {
                  setEditMode(true);
                  setActiveSection("personal");
                }}
                className="inline-flex items-center rounded border border-[#4f7ca5] bg-[#2f6ea5] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#2b638f]"
              >
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Edit
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={saving}
                  className="inline-flex items-center rounded border border-[#8ca5bd] bg-white px-3 py-1.5 text-xs font-semibold text-[#214667] hover:bg-[#ebf2f8] disabled:opacity-60"
                >
                  <X className="mr-1.5 h-3.5 w-3.5" />
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center rounded border border-[#3f7c56] bg-[#4f9a69] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#457f59] disabled:opacity-60"
                >
                  {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
                  Save
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {toast && (
        <div
          className={`rounded border px-3 py-2 text-sm ${
            toast.type === "success"
              ? "border-green-300 bg-green-100 text-green-800"
              : "border-red-300 bg-red-100 text-red-800"
          }`}
        >
          {toast.message}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          <div className="h-32 animate-pulse rounded bg-[#b8c9db]" />
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[220px_1fr]">
            <div className="h-40 animate-pulse rounded bg-[#b8c9db]" />
            <div className="h-80 animate-pulse rounded bg-[#b8c9db]" />
          </div>
        </div>
      ) : error ? (
        <div className="rounded border border-red-300 bg-red-100 px-4 py-3 text-red-800">
          <div>{error}</div>
          <button
            type="button"
            onClick={loadProfile}
            className="mt-3 rounded border border-red-400 px-3 py-1.5 text-sm hover:bg-red-200"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          <section className="rounded border border-[#95adca] bg-[#d8e3ee] p-3">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_220px]">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-[#496f93]">Full Name</div>
                  <div className="text-sm font-bold text-[#13283b]">
                    {toDisplay(profileData?.personalDetails?.fullName || profileData?.user?.name)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-[#496f93]">
                    User ID ({userIdSourceLabel})
                  </div>
                  <div className="text-sm font-bold text-[#13283b]">
                    {toDisplay(profileData?.academicSummary?.userIdentifier)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-[#496f93]">Roll number</div>
                  <div className="text-sm font-bold text-[#13283b]">{toDisplay(profileData?.academicSummary?.rollNo)}</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-[#496f93]">Program</div>
                  <div className="text-sm font-bold text-[#13283b]">{toDisplay(profileData?.academicSummary?.program)}</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-[#496f93]">Stream / Branch</div>
                  <div className="text-sm font-bold text-[#13283b]">{toDisplay(profileData?.academicSummary?.stream)}</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-[#496f93]">Batch / Cohort</div>
                  <div className="text-sm font-bold text-[#13283b]">
                    {toDisplay(profileData?.academicSummary?.batch)}
                    {profileData?.academicSummary?.cohort ? ` / ${profileData.academicSummary.cohort}` : ""}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-[#496f93]">Academic Year + Session</div>
                  <div className="text-sm font-bold text-[#13283b]">
                    {toDisplay(profileData?.academicSummary?.academicYear)} / {toDisplay(profileData?.academicSummary?.session)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-[#496f93]">Stage</div>
                  <div className="text-sm font-bold text-[#13283b]">{toDisplay(headerStageValue)}</div>
                </div>
              </div>

              <div className="rounded border border-[#9bb2c9] bg-[#e6edf4] p-2">
                <div className="mx-auto h-28 w-28 overflow-hidden border border-[#a4b8cc] bg-white">
                  {profileData?.user?.photoUrl ? (
                    <img src={profileData.user.photoUrl} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-[#5f7690]">No Photo</div>
                  )}
                </div>
                {canManagePhoto && (
                  <div className="mt-2 space-y-1.5">
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleUploadPhoto}
                    />
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={photoBusy}
                      className="inline-flex w-full items-center justify-center rounded border border-[#8aa5bf] bg-[#f3f7fb] px-2 py-1.5 text-xs font-semibold text-[#20486b] hover:bg-[#e0ebf5] disabled:opacity-60"
                    >
                      {photoBusy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Camera className="mr-1.5 h-3.5 w-3.5" />}
                      Upload / Change
                    </button>
                    <button
                      type="button"
                      onClick={handleDeletePhoto}
                      disabled={photoBusy}
                      className="inline-flex w-full items-center justify-center rounded border border-[#d59b9b] bg-[#fff1f1] px-2 py-1.5 text-xs font-semibold text-[#8b2f2f] hover:bg-[#ffe3e3] disabled:opacity-60"
                    >
                      {photoBusy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-1.5 h-3.5 w-3.5" />}
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[220px_1fr]">
            <aside className="hidden lg:block">
              <div className="overflow-hidden rounded border border-[#5f88ad] bg-[#245f91]">
                <button
                  type="button"
                  onClick={() => goToSection("academic")}
                  className={`flex w-full items-center px-3 py-3 text-left text-base font-semibold ${
                    activeSection === "academic"
                      ? "bg-gradient-to-r from-[#0f5f9d] to-[#123f69] text-white"
                      : "bg-[#d8e2ee] text-[#0f2940] hover:bg-[#c7d7e7]"
                  }`}
                >
                  <BookOpen className="mr-2 h-5 w-5" />
                  Academic Display
                </button>
                <button
                  type="button"
                  onClick={() => goToSection("personal")}
                  className={`flex w-full items-center border-t border-[#7ea2c5] px-3 py-3 text-left text-base font-semibold ${
                    activeSection === "personal"
                      ? "bg-gradient-to-r from-[#0f5f9d] to-[#123f69] text-white"
                      : "bg-[#d8e2ee] text-[#0f2940] hover:bg-[#c7d7e7]"
                  }`}
                >
                  <User className="mr-2 h-5 w-5" />
                  Personal Details
                </button>
              </div>
            </aside>

            <main className="space-y-3">
              <div className="flex gap-2 lg:hidden">
                <button
                  type="button"
                  onClick={() => goToSection("academic")}
                  className={`flex-1 rounded border px-3 py-2 text-sm font-semibold ${
                    activeSection === "academic"
                      ? "border-[#2c6698] bg-[#2f6ea5] text-white"
                      : "border-[#91abc4] bg-[#e2ebf4] text-[#1d4366]"
                  }`}
                >
                  Academic Display
                </button>
                <button
                  type="button"
                  onClick={() => goToSection("personal")}
                  className={`flex-1 rounded border px-3 py-2 text-sm font-semibold ${
                    activeSection === "personal"
                      ? "border-[#2c6698] bg-[#2f6ea5] text-white"
                      : "border-[#91abc4] bg-[#e2ebf4] text-[#1d4366]"
                  }`}
                >
                  Personal Details
                </button>
              </div>

              {activeSection === "academic" && (
              <section ref={academicSectionRef} className="rounded border border-[#98afc5] bg-[#d9e5f1]">
                <div className="border-b border-[#afc3d7] bg-[#bfd2e7] px-3 py-2 text-xl font-bold text-[#10273d]">
                  Registration Details
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-[#cddceb] text-[#213c57]">
                        {registrationHeader.map((column) => (
                          <th key={column.key} className="border border-[#b3c4d6] px-3 py-2 text-left text-sm font-semibold">
                            {column.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {registrationHistory.length ? (
                        registrationHistory.map((row, index) => {
                          const highlight = row.isCurrent || index === 0;
                          return (
                            <tr
                              key={`${row.stageDesc || "stage"}-${index}`}
                              className={highlight ? "bg-[#f3df98]" : "bg-[#e3eaf2]"}
                            >
                              <td className="border border-[#bccada] px-3 py-2 text-sm text-[#132a3f]">{toDisplay(row.stageDesc)}</td>
                              <td className="border border-[#bccada] px-3 py-2 text-sm text-[#132a3f]">{toDisplay(row.academicYear)}</td>
                              <td className="border border-[#bccada] px-3 py-2 text-sm text-[#132a3f]">{toDisplay(row.status)}</td>
                              <td className="border border-[#bccada] px-3 py-2 text-sm text-[#132a3f]">{toDisplay(row.session)}</td>
                              <td className="border border-[#bccada] px-3 py-2 text-sm text-[#132a3f]">{toDisplay(row.cgpa)}</td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr className="bg-[#e3eaf2]">
                          <td colSpan={registrationHeader.length} className="border border-[#bccada] px-3 py-4 text-center text-sm text-[#33506b]">
                            Registration history not available.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-3 border-t border-[#afc3d7] bg-[#bfd2e7] px-3 py-2 text-xl font-bold text-[#10273d]">
                  Modules
                </div>

                <div className="border-b border-[#afc3d7] bg-[#d5e1ee] px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative min-w-[180px] flex-1 sm:flex-none">
                      <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-[#527191]" />
                      <input
                        value={moduleSearchInput}
                        onChange={(event) => setModuleSearchInput(event.target.value)}
                        placeholder="Search code/name"
                        className="w-full rounded border border-[#8ea7bf] bg-white py-1.5 pl-8 pr-2 text-sm text-[#173047] focus:border-[#48759f] focus:outline-none"
                      />
                    </div>

                    <select
                      value={moduleYearFilter}
                      onChange={(event) => setModuleYearFilter(event.target.value)}
                      className="rounded border border-[#8ea7bf] bg-white px-2 py-1.5 text-sm text-[#173047]"
                    >
                      <option value="">All Years</option>
                      {moduleYearOptions.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>

                    <select
                      value={moduleSessionFilter}
                      onChange={(event) => setModuleSessionFilter(event.target.value)}
                      className="rounded border border-[#8ea7bf] bg-white px-2 py-1.5 text-sm text-[#173047]"
                    >
                      <option value="">All Sessions</option>
                      {moduleSessionOptions.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>

                    <select
                      value={modulePageSize}
                      onChange={(event) => setModulePageSize(Number(event.target.value) || MODULE_PAGE_SIZES[0])}
                      className="rounded border border-[#8ea7bf] bg-white px-2 py-1.5 text-sm text-[#173047]"
                    >
                      {MODULE_PAGE_SIZES.map((size) => (
                        <option key={size} value={size}>
                          {size}/page
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-[#cddceb] text-[#213c57]">
                        {moduleHeader.map((column) => (
                          <th key={column.key} className="border border-[#b3c4d6] px-3 py-2 text-left text-sm font-semibold">
                            <button
                              type="button"
                              onClick={() => toggleModuleSort(column.key)}
                              className="inline-flex items-center gap-1 text-left"
                            >
                              {column.label}
                              {moduleSort.key === column.key ? (moduleSort.direction === "asc" ? "^" : "v") : ""}
                            </button>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pagedModules.length ? (
                        pagedModules.map((row, index) => {
                          const highlight = index === 0;
                          return (
                            <tr key={`${row.subjectCode || "subject"}-${index}`} className={highlight ? "bg-[#f3df98]" : "bg-[#e3eaf2]"}>
                              <td className="border border-[#bccada] px-3 py-2 text-sm text-[#132a3f]">{toDisplay(row.subjectCode)}</td>
                              <td className="border border-[#bccada] px-3 py-2 text-sm text-[#132a3f]">{toDisplay(row.subjectName)}</td>
                              <td className="border border-[#bccada] px-3 py-2 text-sm text-[#132a3f]">{toDisplay(row.academicYear)}</td>
                              <td className="border border-[#bccada] px-3 py-2 text-sm text-[#132a3f]">{toDisplay(row.session)}</td>
                              <td className="border border-[#bccada] px-3 py-2 text-sm text-[#132a3f]">{toDisplay(row.totalMarksOrGrade)}</td>
                              <td className="border border-[#bccada] px-3 py-2 text-sm text-[#132a3f]">{toDisplay(row.resultStatus)}</td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr className="bg-[#e3eaf2]">
                          <td colSpan={moduleHeader.length} className="border border-[#bccada] px-3 py-4 text-center text-sm text-[#33506b]">
                            No modules available.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between border-t border-[#afc3d7] bg-[#d5e1ee] px-3 py-2 text-sm text-[#1f3f5c]">
                  <div>
                    Page {modulePage} of {moduleTotalPages} ({sortedModules.length} rows)
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setModulePage((prev) => Math.max(1, prev - 1))}
                      disabled={modulePage <= 1}
                      className="rounded border border-[#8ea7bf] bg-white px-2 py-1 disabled:opacity-50"
                    >
                      Prev
                    </button>
                    <button
                      type="button"
                      onClick={() => setModulePage((prev) => Math.min(moduleTotalPages, prev + 1))}
                      disabled={modulePage >= moduleTotalPages}
                      className="rounded border border-[#8ea7bf] bg-white px-2 py-1 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </section>
              )}

              {activeSection === "personal" && (
              <section ref={personalSectionRef} className="rounded border border-[#98afc5] bg-[#d9e5f1]">
                <div className="border-b border-[#afc3d7] bg-[#bfd2e7] px-3 py-2">
                  <div className="text-xl font-bold text-[#10273d]">Personal Details</div>
                </div>

                {saveError && (
                  <div className="mx-3 mt-3 rounded border border-red-300 bg-red-100 px-3 py-2 text-sm text-red-800">
                    {saveError}
                  </div>
                )}

                <div className="p-3">
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-[#122a3f]">{toDisplay(form.fullName)}</div>
                    <div className="text-lg font-bold text-[#e44d20]">
                      Course: {toDisplay(profileData?.academicSummary?.program)}
                    </div>
                    <div className="text-lg font-bold text-[#e44d20]">
                      Batch: {toDisplay(profileData?.academicSummary?.batch)}
                      {profileData?.academicSummary?.cohort ? ` (${profileData.academicSummary.cohort})` : ""}
                    </div>
                    <div className="text-lg font-bold text-[#e44d20]">
                      {userIdSourceLabel} : {toDisplay(profileData?.academicSummary?.userIdentifier)}
                    </div>
                    <div className="text-lg font-bold text-[#e44d20]">Roll number : {toDisplay(form.rollNo)}</div>
                  </div>
                </div>

                <div className="px-3 pb-3">
                  <table className="w-full border-collapse text-sm">
                    <tbody>
                      {renderPersonalRow("Admission Date", "admissionDate", {
                        editable: false,
                        value: toDisplay(profileData?.personalDetails?.admissionDate),
                      })}
                      {renderPersonalRow("Date of Birth", "dob", { type: "date" })}
                      {renderPersonalRow("Blood group", "bloodGroup", {
                        editable: false,
                        value: toDisplay(profileData?.personalDetails?.bloodGroup),
                      })}
                      {renderPersonalRow("Gender", "gender")}
                      {renderPersonalRow("Nationality", "nationality", {
                        editable: false,
                        value: toDisplay(profileData?.personalDetails?.nationality),
                      })}
                      {renderPersonalRow("Category", "category")}
                      {renderPersonalRow("Email", "email", { type: "email" })}
                      {renderPersonalRow("Phone", "phone")}
                      {renderPersonalRow("WhatsApp", "whatsApp")}
                      {renderPersonalRow("Father Name", "fatherName")}
                      {renderPersonalRow("Father Phone", "fatherPhone")}
                      {renderPersonalRow("Mother Name", "motherName")}
                      {renderPersonalRow("Permanent Address", "permanentAddress")}
                      {renderPersonalRow("Correspondence Address", "correspondenceAddress")}
                      {renderPersonalRow("State", "state")}
                      {renderPersonalRow("City", "city")}
                      {renderPersonalRow("PIN", "pin")}
                    </tbody>
                  </table>

                  <div className="mt-3 rounded border border-[#9fb5ca] bg-[#d4deea] p-3">
                    <div className="mb-2 text-sm font-semibold text-[#17334c]">
                      Academic Mapping {canEditAcademic ? "(Editable)" : "(Locked)"}
                    </div>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                      {[
                        ["programId", "Program ID"],
                        ["batchId", "Batch ID"],
                        ["rollNo", "Roll No"],
                        ["stream", "Stream / Branch"],
                        ["cohort", "Batch / Cohort"],
                        ["academicYear", "Academic Year"],
                        ["session", "Session"],
                        ["currentSemester", "Current Semester"],
                        ["currentStage", "Current Stage"],
                        ["status", "Status"],
                      ].map(([key, label]) => (
                        <div key={key}>
                          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#375a79]">{label}</div>
                          {editMode && canEditAcademic ? (
                            <div>
                              <input
                                value={form[key]}
                                onChange={(event) => updateFormField(key, event.target.value)}
                                className={`w-full rounded border px-2 py-1.5 text-sm text-[#163047] focus:outline-none ${
                                  formErrors[key]
                                    ? "border-red-400 focus:border-red-500"
                                    : "border-[#8da8c2] focus:border-[#4e78a4]"
                                }`}
                              />
                              {formErrors[key] && (
                                <div className="mt-1 text-xs text-red-600">{formErrors[key]}</div>
                              )}
                            </div>
                          ) : (
                            <div className="rounded border border-[#abc0d4] bg-[#e7edf4] px-2 py-1.5 text-sm text-[#1b3750]">
                              {toDisplay(form[key])}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {editMode && (
                    <div className="mt-3">
                      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#375a79]">
                        Update Reason (optional)
                      </div>
                      <input
                        value={form.updateReason}
                        onChange={(event) => updateFormField("updateReason", event.target.value)}
                        className="w-full rounded border border-[#8da8c2] px-3 py-1.5 text-sm text-[#163047] focus:border-[#4e78a4] focus:outline-none"
                        placeholder="Reason for audit trail"
                      />
                    </div>
                  )}

                  <div className="mt-3 rounded border border-[#9fb5ca] bg-[#d4deea] px-3 py-2 text-xs text-[#2e4b66]">
                    Updated By: {toDisplay(profileData?.audit?.updatedBy?.name || profileData?.audit?.updatedBy?.email)} |
                    Updated At: {toDateTimeDisplay(profileData?.audit?.updatedAt)}
                  </div>
                </div>
              </section>
              )}
            </main>
          </div>
        </>
      )}
    </div>
  );
};

export default UserProfile;
