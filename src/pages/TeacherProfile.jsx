import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Camera,
  ContactRound,
  FlaskConical,
  Globe2,
  GraduationCap,
  Loader2,
  Pencil,
  Save,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import {
  deleteTeacherProfilePhoto,
  getTeacherProfile,
  updateTeacherProfile,
  uploadTeacherProfilePhoto,
} from "../services/user.service";

const EMAIL_REGEX = /^[\w.-]+@([\w-]+\.)+[\w-]{2,}$/i;

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

const isValidPhone = (value) => {
  if (!value) return true;
  const digits = String(value).replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
};

const composeTeacherName = (form = {}, fallback = "") => {
  const parts = [form.title, form.firstName, form.middleName, form.lastName]
    .map((part) => String(part || "").trim())
    .filter(Boolean);
  return parts.length ? parts.join(" ") : String(fallback || "").trim();
};

const toFormState = (payload = {}) => {
  const personalDetail = payload.personalDetail || {};
  const contactDetail = payload.contactDetail || {};
  const educationalDetail = payload.educationalDetail || {};
  const research = payload.research || {};
  const socialMedia = payload.socialMedia || {};
  const summary = payload.summary || {};

  return {
    teacherId: summary.teacherId || "",
    employeeId: summary.employeeId || "",
    title: personalDetail.title || "",
    firstName: personalDetail.firstName || "",
    middleName: personalDetail.middleName || "",
    lastName: personalDetail.lastName || "",
    dateOfBirth: personalDetail.dateOfBirth || "",
    gender: personalDetail.gender || "",
    nationality: personalDetail.nationality || "",
    language: personalDetail.language || "",
    religion: personalDetail.religion || "",
    nativeDistrict: personalDetail.native?.district || "",
    nativeState: personalDetail.native?.state || "",
    nativeCountry: personalDetail.native?.country || "",
    aboutFaculty: personalDetail.aboutFaculty || "",
    personalNumber: personalDetail.personalNumber || "",
    designation: personalDetail.designation || "",
    administrativeResponsibility: personalDetail.administrativeResponsibility || "",
    schoolAssociated: contactDetail.schoolAssociated || "",
    kiitMailId: contactDetail.kiitMailId || "",
    personalEmailId: contactDetail.personalEmailId || "",
    mobileNumber: contactDetail.mobileNumber || "",
    whatsappNumber: contactDetail.whatsappNumber || "",
    phdDegreeName: educationalDetail.phd?.degreeName || "",
    phdUniversity: educationalDetail.phd?.university || "",
    phdYear: educationalDetail.phd?.year || "",
    pgDegreeName: educationalDetail.pg?.degreeName || "",
    pgUniversity: educationalDetail.pg?.university || "",
    pgYear: educationalDetail.pg?.year || "",
    ugDegreeName: educationalDetail.ug?.degreeName || "",
    ugUniversity: educationalDetail.ug?.university || "",
    ugYear: educationalDetail.ug?.year || "",
    otherDegreeName: educationalDetail.other?.degreeName || "",
    otherUniversity: educationalDetail.other?.university || "",
    otherYear: educationalDetail.other?.year || "",
    googleScholar: research.googleScholar || "",
    scopusId: research.scopusId || "",
    orcid: research.orcid || "",
    researchArea: research.researchArea || "",
    courseExpertiseInTeaching: research.courseExpertiseInTeaching || "",
    aboutResearchWork: research.aboutResearchWork || "",
    professionalMembership: research.professionalMembership || "",
    webpage: socialMedia.webpage || "",
    facebookId: socialMedia.facebookId || "",
    instaId: socialMedia.instaId || "",
    youtubeId: socialMedia.youtubeId || "",
    linkedInId: socialMedia.linkedInId || "",
    updateReason: "",
  };
};

const TeacherProfile = () => {
  const navigate = useNavigate();
  const { id = "" } = useParams();
  const { user } = useAuth();

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
  const [activeSection, setActiveSection] = useState("personal");

  const photoInputRef = useRef(null);

  const permissions = profileData?.permissions || {};
  const canEditProfile = permissions.canEditProfile === true;
  const canManagePhoto = permissions.canManagePhoto === true;

  const hasUnsavedChanges = useMemo(() => {
    if (!editMode || !baseline) return false;
    return JSON.stringify(form) !== baseline;
  }, [baseline, editMode, form]);

  const loadProfile = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError("");
    setSaveError("");

    try {
      const response = await getTeacherProfile(id);
      const nextForm = toFormState(response);
      setProfileData(response);
      setForm(nextForm);
      setBaseline(JSON.stringify(nextForm));
      setEditMode(false);
      setFormErrors({});
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to load teacher profile");
    } finally {
      setLoading(false);
    }
  }, [id]);

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

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormErrors((prev) => ({ ...prev, [key]: "" }));
    setSaveError("");
  };

  const validateForm = () => {
    const nextErrors = {};

    if (form.kiitMailId && !EMAIL_REGEX.test(form.kiitMailId.trim().toLowerCase())) {
      nextErrors.kiitMailId = "Invalid KIIT mail ID";
    }
    if (form.personalEmailId && !EMAIL_REGEX.test(form.personalEmailId.trim().toLowerCase())) {
      nextErrors.personalEmailId = "Invalid personal email ID";
    }
    if (!isValidPhone(form.personalNumber)) {
      nextErrors.personalNumber = "Personal number must be 10-15 digits";
    }
    if (!isValidPhone(form.mobileNumber)) {
      nextErrors.mobileNumber = "Mobile number must be 10-15 digits";
    }
    if (!isValidPhone(form.whatsappNumber)) {
      nextErrors.whatsappNumber = "WhatsApp number must be 10-15 digits";
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
      const payload = {
        summary: {
          teacherId: form.teacherId.trim(),
          employeeId: form.employeeId.trim(),
        },
        personalDetail: {
          title: form.title.trim(),
          firstName: form.firstName.trim(),
          middleName: form.middleName.trim(),
          lastName: form.lastName.trim(),
          dateOfBirth: form.dateOfBirth || null,
          gender: form.gender.trim(),
          nationality: form.nationality.trim(),
          language: form.language.trim(),
          religion: form.religion.trim(),
          native: {
            district: form.nativeDistrict.trim(),
            state: form.nativeState.trim(),
            country: form.nativeCountry.trim(),
          },
          aboutFaculty: form.aboutFaculty.trim(),
          personalNumber: form.personalNumber.trim(),
          designation: form.designation.trim(),
          administrativeResponsibility: form.administrativeResponsibility.trim(),
        },
        contactDetail: {
          schoolAssociated: form.schoolAssociated.trim(),
          kiitMailId: form.kiitMailId.trim().toLowerCase(),
          personalEmailId: form.personalEmailId.trim().toLowerCase(),
          mobileNumber: form.mobileNumber.trim(),
          whatsappNumber: form.whatsappNumber.trim(),
        },
        educationalDetail: {
          phd: {
            degreeName: form.phdDegreeName.trim(),
            university: form.phdUniversity.trim(),
            year: form.phdYear.trim(),
          },
          pg: {
            degreeName: form.pgDegreeName.trim(),
            university: form.pgUniversity.trim(),
            year: form.pgYear.trim(),
          },
          ug: {
            degreeName: form.ugDegreeName.trim(),
            university: form.ugUniversity.trim(),
            year: form.ugYear.trim(),
          },
          other: {
            degreeName: form.otherDegreeName.trim(),
            university: form.otherUniversity.trim(),
            year: form.otherYear.trim(),
          },
        },
        research: {
          googleScholar: form.googleScholar.trim(),
          scopusId: form.scopusId.trim(),
          orcid: form.orcid.trim(),
          researchArea: form.researchArea.trim(),
          courseExpertiseInTeaching: form.courseExpertiseInTeaching.trim(),
          aboutResearchWork: form.aboutResearchWork.trim(),
          professionalMembership: form.professionalMembership.trim(),
        },
        socialMedia: {
          webpage: form.webpage.trim(),
          facebookId: form.facebookId.trim(),
          instaId: form.instaId.trim(),
          youtubeId: form.youtubeId.trim(),
          linkedInId: form.linkedInId.trim(),
        },
        updateReason: form.updateReason.trim(),
      };

      const response = await updateTeacherProfile(id, payload);
      const nextForm = toFormState(response);
      setProfileData(response);
      setForm(nextForm);
      setBaseline(JSON.stringify(nextForm));
      setEditMode(false);
      setToast({ type: "success", message: "Teacher profile updated successfully" });
    } catch (err) {
      setSaveError(err.response?.data?.error || err.message || "Failed to save teacher profile");
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
    setEditMode(false);
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
      await uploadTeacherProfilePhoto(id, file);
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
      await deleteTeacherProfilePhoto(id);
      await loadProfile();
      setToast({ type: "success", message: "Photo removed successfully" });
    } catch (err) {
      setSaveError(err.response?.data?.error || err.message || "Failed to remove photo");
    } finally {
      setPhotoBusy(false);
    }
  };

  const renderRow = (label, key, { type = "text", textarea = false } = {}) => {
    const inputClass = `w-full rounded border px-3 py-1.5 text-sm text-[#163047] focus:outline-none ${
      formErrors[key]
        ? "border-red-400 focus:border-red-500"
        : "border-[#8da8c2] focus:border-[#4e78a4]"
    }`;

    return (
      <tr key={key} className="border-b border-[#b8c7d9] last:border-b-0">
        <th className="w-[34%] bg-[#c9d5e6] px-3 py-2 text-right text-sm font-semibold text-[#4776a0]">
          {label}
        </th>
        <td className="bg-[#dfe6ef] px-3 py-2 text-base font-semibold text-[#102537]">
          {editMode ? (
            <div>
              {textarea ? (
                <textarea
                  rows={3}
                  value={form[key]}
                  onChange={(event) => updateField(key, event.target.value)}
                  className={inputClass}
                />
              ) : (
                <input
                  type={type}
                  value={form[key]}
                  onChange={(event) => updateField(key, event.target.value)}
                  className={inputClass}
                />
              )}
              {formErrors[key] && <div className="mt-1 text-xs text-red-600">{formErrors[key]}</div>}
            </div>
          ) : (
            <span>{toDisplay(form[key])}</span>
          )}
        </td>
      </tr>
    );
  };

  const renderEducationBlock = (prefix, title) => (
    <div className="rounded border border-[#a8bbce] bg-[#d4deea] p-3">
      <div className="mb-2 text-sm font-bold text-[#17334c]">{title}</div>
      <table className="w-full border-collapse text-sm">
        <tbody>
          {renderRow("Degree Name", `${prefix}DegreeName`)}
          {renderRow("University", `${prefix}University`)}
          {renderRow("Year", `${prefix}Year`)}
        </tbody>
      </table>
    </div>
  );

  if (!isAdminActor) {
    return (
      <div className="rounded border border-red-300 bg-red-50 px-4 py-3 text-red-700">
        Access denied. Only admin users can access teacher profile view.
      </div>
    );
  }

  const headerName = composeTeacherName(form, profileData?.user?.name || "");
  const headerPhoto = profileData?.user?.photoUrl || profileData?.personalDetail?.profilePhotoUrl || "";

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
                  {saving ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="mr-1.5 h-3.5 w-3.5" />
                  )}
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
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-[#496f93]">
                    Full Name
                  </div>
                  <div className="text-sm font-bold text-[#13283b]">{toDisplay(headerName)}</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-[#496f93]">
                    User ID
                  </div>
                  <div className="text-sm font-bold text-[#13283b]">{toDisplay(form.employeeId)}</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-[#496f93]">
                    Teacher ID
                  </div>
                  <div className="text-sm font-bold text-[#13283b]">{toDisplay(form.teacherId)}</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-[#496f93]">
                    Designation
                  </div>
                  <div className="text-sm font-bold text-[#13283b]">{toDisplay(form.designation)}</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-[#496f93]">
                    School Associated
                  </div>
                  <div className="text-sm font-bold text-[#13283b]">{toDisplay(form.schoolAssociated)}</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-[#496f93]">
                    KIIT Mail ID
                  </div>
                  <div className="text-sm font-bold text-[#13283b]">{toDisplay(form.kiitMailId)}</div>
                </div>
              </div>

              <div className="rounded border border-[#9bb2c9] bg-[#e6edf4] p-2">
                <div className="mx-auto h-28 w-28 overflow-hidden border border-[#a4b8cc] bg-white">
                  {headerPhoto ? (
                    <img src={headerPhoto} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-[#5f7690]">
                      No Photo
                    </div>
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
                      {photoBusy ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Camera className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      Upload / Change
                    </button>
                    <button
                      type="button"
                      onClick={handleDeletePhoto}
                      disabled={photoBusy}
                      className="inline-flex w-full items-center justify-center rounded border border-[#d59b9b] bg-[#fff1f1] px-2 py-1.5 text-xs font-semibold text-[#8b2f2f] hover:bg-[#ffe3e3] disabled:opacity-60"
                    >
                      {photoBusy ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      )}
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
                {[
                  { key: "personal", label: "Personal Detail", icon: User },
                  { key: "contact", label: "Contact Detail", icon: ContactRound },
                  { key: "education", label: "Educational Detail", icon: GraduationCap },
                  { key: "research", label: "Research", icon: FlaskConical },
                  { key: "social", label: "Social Media", icon: Globe2 },
                ].map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setActiveSection(item.key)}
                      className={`flex w-full items-center px-3 py-3 text-left text-sm font-semibold ${
                        index > 0 ? "border-t border-[#7ea2c5]" : ""
                      } ${
                        activeSection === item.key
                          ? "bg-gradient-to-r from-[#0f5f9d] to-[#123f69] text-white"
                          : "bg-[#d8e2ee] text-[#0f2940] hover:bg-[#c7d7e7]"
                      }`}
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </aside>

            <main className="space-y-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:hidden">
                {[
                  { key: "personal", label: "Personal" },
                  { key: "contact", label: "Contact" },
                  { key: "education", label: "Education" },
                  { key: "research", label: "Research" },
                  { key: "social", label: "Social" },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setActiveSection(item.key)}
                    className={`rounded border px-2 py-1.5 text-xs font-semibold ${
                      activeSection === item.key
                        ? "border-[#2c6698] bg-[#2f6ea5] text-white"
                        : "border-[#91abc4] bg-[#e2ebf4] text-[#1d4366]"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {saveError && (
                <div className="rounded border border-red-300 bg-red-100 px-3 py-2 text-sm text-red-800">
                  {saveError}
                </div>
              )}

              {activeSection === "personal" && (
                <section className="rounded border border-[#98afc5] bg-[#d9e5f1] p-3">
                  <div className="mb-2 text-lg font-bold text-[#10273d]">Personal Detail</div>
                  <table className="w-full border-collapse text-sm">
                    <tbody>
                      {renderRow("Teacher ID", "teacherId")}
                      {renderRow("Employee ID", "employeeId")}
                      {renderRow("Title", "title")}
                      {renderRow("First Name", "firstName")}
                      {renderRow("Middle Name", "middleName")}
                      {renderRow("Last Name", "lastName")}
                      {renderRow("Date of Birth", "dateOfBirth", { type: "date" })}
                      {renderRow("Gender", "gender")}
                      {renderRow("Nationality", "nationality")}
                      {renderRow("Language", "language")}
                      {renderRow("Religion", "religion")}
                      {renderRow("Native District", "nativeDistrict")}
                      {renderRow("Native State", "nativeState")}
                      {renderRow("Native Country", "nativeCountry")}
                      {renderRow("About Faculty", "aboutFaculty", { textarea: true })}
                      {renderRow("Personal Number", "personalNumber")}
                      {renderRow("Designation", "designation")}
                      {renderRow(
                        "Administrative Responsibility",
                        "administrativeResponsibility",
                        { textarea: true }
                      )}
                    </tbody>
                  </table>
                </section>
              )}

              {activeSection === "contact" && (
                <section className="rounded border border-[#98afc5] bg-[#d9e5f1] p-3">
                  <div className="mb-2 text-lg font-bold text-[#10273d]">Contact Detail</div>
                  <table className="w-full border-collapse text-sm">
                    <tbody>
                      {renderRow("School Associated", "schoolAssociated")}
                      {renderRow("KIIT mail ID", "kiitMailId", { type: "email" })}
                      {renderRow("Personal Email ID", "personalEmailId", { type: "email" })}
                      {renderRow("Mobile Number", "mobileNumber")}
                      {renderRow("WhatsApp Number", "whatsappNumber")}
                    </tbody>
                  </table>
                </section>
              )}

              {activeSection === "education" && (
                <section className="rounded border border-[#98afc5] bg-[#d9e5f1] p-3">
                  <div className="mb-2 text-lg font-bold text-[#10273d]">Educational Detail</div>
                  <div className="space-y-3">
                    {renderEducationBlock("phd", "PhD")}
                    {renderEducationBlock("pg", "PG")}
                    {renderEducationBlock("ug", "UG")}
                    {renderEducationBlock("other", "Any other")}
                  </div>
                </section>
              )}

              {activeSection === "research" && (
                <section className="rounded border border-[#98afc5] bg-[#d9e5f1] p-3">
                  <div className="mb-2 text-lg font-bold text-[#10273d]">Research</div>
                  <table className="w-full border-collapse text-sm">
                    <tbody>
                      {renderRow("Google Scholar", "googleScholar")}
                      {renderRow("Scopus ID", "scopusId")}
                      {renderRow("ORCID", "orcid")}
                      {renderRow("Research Area", "researchArea", { textarea: true })}
                      {renderRow("Course Expertise in Teaching", "courseExpertiseInTeaching", {
                        textarea: true,
                      })}
                      {renderRow("About Research Work", "aboutResearchWork", { textarea: true })}
                      {renderRow("Professional Membership", "professionalMembership", {
                        textarea: true,
                      })}
                    </tbody>
                  </table>
                </section>
              )}

              {activeSection === "social" && (
                <section className="rounded border border-[#98afc5] bg-[#d9e5f1] p-3">
                  <div className="mb-2 text-lg font-bold text-[#10273d]">Social Media</div>
                  <table className="w-full border-collapse text-sm">
                    <tbody>
                      {renderRow("Your Webpage (if Any)", "webpage")}
                      {renderRow("Facebook ID", "facebookId")}
                      {renderRow("Insta ID", "instaId")}
                      {renderRow("Youtube ID", "youtubeId")}
                      {renderRow("LinkedIN ID", "linkedInId")}
                    </tbody>
                  </table>
                </section>
              )}

              {editMode && (
                <div className="rounded border border-[#9fb5ca] bg-[#d4deea] p-3">
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#375a79]">
                    Update Reason (optional)
                  </div>
                  <input
                    value={form.updateReason}
                    onChange={(event) => updateField("updateReason", event.target.value)}
                    className="w-full rounded border border-[#8da8c2] px-3 py-1.5 text-sm text-[#163047] focus:border-[#4e78a4] focus:outline-none"
                    placeholder="Reason for audit trail"
                  />
                </div>
              )}

              <div className="rounded border border-[#9fb5ca] bg-[#d4deea] px-3 py-2 text-xs text-[#2e4b66]">
                Updated By:{" "}
                {toDisplay(profileData?.audit?.updatedBy?.name || profileData?.audit?.updatedBy?.email)}{" "}
                | Updated At: {toDateTimeDisplay(profileData?.audit?.updatedAt)}
              </div>
            </main>
          </div>
        </>
      )}
    </div>
  );
};

export default TeacherProfile;
