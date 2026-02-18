import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Edit3, Save, X } from "lucide-react";
import {
  getEnrollmentStudentById,
  updateEnrollmentStudentById,
} from "../services/cohort.service";
import {
  getProgramStreams,
  getProgramsDropdown,
} from "../services/program.service";
import { getBatchesDropdown } from "../services/batch.service";
import { getModeOfDeliveryLabel } from "../constants/modeOfDelivery";

export const ENROLLMENT_STUDENT_FIELDS = Object.freeze([
  "name",
  "email",
  "registrationNumber",
  "rollNumber",
  "enrollmentNumber",
  "debId",
  "sex",
  "age",
  "programId",
  "stream",
  "batchId",
  "stage",
  "semester",
  "companyAssociated",
]);

const emptyForm = {
  name: "",
  email: "",
  registrationNumber: "",
  rollNumber: "",
  enrollmentNumber: "",
  debId: "",
  sex: "",
  age: "",
  programId: "",
  stream: "",
  batchId: "",
  stage: "",
  semester: "",
  companyAssociated: "",
};

const toForm = (student) => ({
  name: student?.name || "",
  email: student?.email || "",
  registrationNumber: student?.registrationNumber || "",
  rollNumber: student?.rollNumber || "",
  enrollmentNumber: student?.enrollmentNumber || "",
  debId: student?.debId || "",
  sex: student?.sex || "",
  age:
    student?.age === undefined || student?.age === null || student?.age === ""
      ? ""
      : String(student.age),
  programId: student?.program?._id || "",
  stream: student?.stream || "",
  batchId: student?.batch?._id || "",
  stage: student?.stage || "",
  semester:
    student?.semester === undefined || student?.semester === null || student?.semester === ""
      ? ""
      : String(student.semester),
  companyAssociated: student?.companyAssociated || "",
});

const displayValue = (value) => {
  if (value === undefined || value === null) return "-";
  const text = String(value).trim();
  return text ? text : "-";
};

const getSourceLabel = (sourceType) => {
  const normalized = String(sourceType || "").trim().toUpperCase();
  if (normalized === "CRM") return "CRM";
  if (normalized === "BULK_UPLOAD" || normalized === "BULK") return "Bulk Upload";
  return "Manual";
};

const EnrollmentStudentDetail = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [student, setStudent] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const [programOptions, setProgramOptions] = useState([]);
  const [streamOptions, setStreamOptions] = useState([]);
  const [batchOptions, setBatchOptions] = useState([]);

  const selectedProgram = useMemo(
    () => programOptions.find((program) => program._id === form.programId) || null,
    [programOptions, form.programId]
  );

  const loadStudent = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getEnrollmentStudentById(studentId);
      const row = data?.student || null;
      setStudent(row);
      setForm(toForm(row));
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to load student details");
    } finally {
      setLoading(false);
    }
  };

  const loadPrograms = async () => {
    try {
      const data = await getProgramsDropdown();
      setProgramOptions(data?.programs || data || []);
    } catch (_err) {
      setProgramOptions([]);
    }
  };

  const loadStreams = async (programId) => {
    try {
      const data = await getProgramStreams(programId ? { programId } : {});
      setStreamOptions(Array.isArray(data?.streams) ? data.streams : []);
    } catch (_err) {
      setStreamOptions([]);
    }
  };

  const loadBatches = async (programId) => {
    try {
      const data = await getBatchesDropdown(programId || undefined);
      setBatchOptions(data?.batches || data || []);
    } catch (_err) {
      setBatchOptions([]);
    }
  };

  useEffect(() => {
    loadStudent();
    loadPrograms();
  }, [studentId]);

  useEffect(() => {
    loadStreams(form.programId);
    loadBatches(form.programId);
  }, [form.programId]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSuccess("");
  };

  const handleEdit = () => {
    setEditMode(true);
    setError("");
    setSuccess("");
  };

  const handleCancel = () => {
    setEditMode(false);
    setError("");
    setSuccess("");
    setForm(toForm(student));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        name: form.name,
        email: form.email,
        registrationNumber: form.registrationNumber,
        rollNumber: form.rollNumber,
        enrollmentNumber: form.enrollmentNumber,
        debId: form.debId,
        sex: form.sex,
        age: form.age,
        programId: form.programId || null,
        stream: form.stream,
        batchId: form.batchId || null,
        stage: form.stage,
        semester: form.semester,
        companyAssociated: form.companyAssociated,
      };

      const data = await updateEnrollmentStudentById(studentId, payload);
      const updated = data?.student || null;
      setStudent(updated);
      setForm(toForm(updated));
      setEditMode(false);
      setSuccess("Enrollment details updated successfully.");
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to update student details");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-gray-600">
        Loading student details...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={() => navigate("/cohorts")}
            className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Student Enrollment
          </button>
          <h1 className="mt-1 text-2xl font-semibold text-gray-900">Student Details</h1>
          <p className="text-sm text-gray-600">
            View and update enrollment-specific student fields.
          </p>
        </div>
        {!editMode ? (
          <button
            type="button"
            onClick={handleEdit}
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Edit3 className="mr-1.5 h-4 w-4" />
            Edit
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              className="inline-flex items-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <X className="mr-1.5 h-4 w-4" />
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              <Save className="mr-1.5 h-4 w-4" />
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {success}
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-gray-500">Name</label>
            {editMode ? (
              <input
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="mt-1 w-full rounded-md border-gray-300 text-sm"
              />
            ) : (
              <p className="mt-1 text-sm text-gray-900">{displayValue(student?.name)}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-gray-500">Email</label>
            {editMode ? (
              <input
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                className="mt-1 w-full rounded-md border-gray-300 text-sm"
              />
            ) : (
              <p className="mt-1 text-sm text-gray-900">{displayValue(student?.email)}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-gray-500">Registration Number</label>
            {editMode ? (
              <input
                value={form.registrationNumber}
                onChange={(e) => handleChange("registrationNumber", e.target.value)}
                className="mt-1 w-full rounded-md border-gray-300 text-sm"
              />
            ) : (
              <p className="mt-1 text-sm text-gray-900">{displayValue(student?.registrationNumber)}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-gray-500">Roll Number</label>
            {editMode ? (
              <input
                value={form.rollNumber}
                onChange={(e) => handleChange("rollNumber", e.target.value)}
                className="mt-1 w-full rounded-md border-gray-300 text-sm"
              />
            ) : (
              <p className="mt-1 text-sm text-gray-900">{displayValue(student?.rollNumber)}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-gray-500">Enrollment Number</label>
            {editMode ? (
              <input
                value={form.enrollmentNumber}
                onChange={(e) => handleChange("enrollmentNumber", e.target.value)}
                className="mt-1 w-full rounded-md border-gray-300 text-sm"
              />
            ) : (
              <p className="mt-1 text-sm text-gray-900">{displayValue(student?.enrollmentNumber)}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-gray-500">DEB ID</label>
            {editMode ? (
              <input
                value={form.debId}
                onChange={(e) => handleChange("debId", e.target.value)}
                className="mt-1 w-full rounded-md border-gray-300 text-sm"
              />
            ) : (
              <p className="mt-1 text-sm text-gray-900">{displayValue(student?.debId)}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-gray-500">Sex</label>
            {editMode ? (
              <input
                value={form.sex}
                onChange={(e) => handleChange("sex", e.target.value)}
                className="mt-1 w-full rounded-md border-gray-300 text-sm"
              />
            ) : (
              <p className="mt-1 text-sm text-gray-900">{displayValue(student?.sex)}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-gray-500">Age</label>
            {editMode ? (
              <input
                type="number"
                min="0"
                value={form.age}
                onChange={(e) => handleChange("age", e.target.value)}
                className="mt-1 w-full rounded-md border-gray-300 text-sm"
              />
            ) : (
              <p className="mt-1 text-sm text-gray-900">{displayValue(student?.age)}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-gray-500">Program</label>
            {editMode ? (
              <select
                value={form.programId}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    programId: e.target.value,
                    batchId: "",
                  }))
                }
                className="mt-1 w-full rounded-md border-gray-300 text-sm"
              >
                <option value="">Select Program</option>
                {programOptions.map((program) => (
                  <option key={program._id} value={program._id}>
                    {program.name} {program.code ? `(${program.code})` : ""}
                  </option>
                ))}
              </select>
            ) : (
              <p className="mt-1 text-sm text-gray-900">
                {student?.program?.name
                  ? `${student.program.name}${student.program.code ? ` (${student.program.code})` : ""}`
                  : "-"}
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-gray-500">Stream</label>
            {editMode ? (
              <select
                value={form.stream}
                onChange={(e) => handleChange("stream", e.target.value)}
                className="mt-1 w-full rounded-md border-gray-300 text-sm"
              >
                <option value="">Select Stream</option>
                {streamOptions.map((stream) => (
                  <option key={stream} value={stream}>
                    {stream}
                  </option>
                ))}
              </select>
            ) : (
              <p className="mt-1 text-sm text-gray-900">{displayValue(student?.stream)}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-gray-500">Batch</label>
            {editMode ? (
              <select
                value={form.batchId}
                onChange={(e) => handleChange("batchId", e.target.value)}
                className="mt-1 w-full rounded-md border-gray-300 text-sm"
              >
                <option value="">Select Batch</option>
                {batchOptions.map((batch) => (
                  <option key={batch._id} value={batch._id}>
                    {batch.name} {batch.year ? `(${batch.year})` : ""}
                  </option>
                ))}
              </select>
            ) : (
              <p className="mt-1 text-sm text-gray-900">
                {student?.batch?.name
                  ? `${student.batch.name}${student.batch.year ? ` (${student.batch.year})` : ""}`
                  : "-"}
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-gray-500">Stage</label>
            {editMode ? (
              <input
                value={form.stage}
                onChange={(e) => handleChange("stage", e.target.value)}
                className="mt-1 w-full rounded-md border-gray-300 text-sm"
              />
            ) : (
              <p className="mt-1 text-sm text-gray-900">{displayValue(student?.stage)}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-gray-500">Semester</label>
            {editMode ? (
              <input
                type="number"
                min="1"
                value={form.semester}
                onChange={(e) => handleChange("semester", e.target.value)}
                className="mt-1 w-full rounded-md border-gray-300 text-sm"
              />
            ) : (
              <p className="mt-1 text-sm text-gray-900">{displayValue(student?.semester)}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-gray-500">Mode of Delivery</label>
            <p className="mt-1 text-sm text-gray-900">
              {getModeOfDeliveryLabel(selectedProgram?.modeOfDelivery || student?.program?.modeOfDelivery)}
            </p>
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-gray-500">Source</label>
            <p className="mt-1 text-sm text-gray-900">
              {getSourceLabel(student?.sourceType || student?.sourceLabel)}
            </p>
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-gray-500">Company Associated</label>
            {editMode ? (
              <input
                value={form.companyAssociated}
                onChange={(e) => handleChange("companyAssociated", e.target.value)}
                className="mt-1 w-full rounded-md border-gray-300 text-sm"
              />
            ) : (
              <p className="mt-1 text-sm text-gray-900">{displayValue(student?.companyAssociated)}</p>
            )}
          </div>

          {String(student?.sourceType || "").toUpperCase() === "CRM" && (
            <>
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-gray-500">Provider</label>
                <p className="mt-1 text-sm text-gray-900">
                  {displayValue(student?.sourceProvider || "EXTRAAEDGE")}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-gray-500">External ID</label>
                <p className="mt-1 text-sm text-gray-900">
                  {displayValue(student?.externalId)}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnrollmentStudentDetail;
