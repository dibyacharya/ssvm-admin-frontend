import { useState, useEffect, useCallback } from "react";
import {
  Plus, Pencil, Trash2, X, Save, Loader2, Settings,
  AlertTriangle, Info, Truck, FileCheck, Eye, ChevronDown, ChevronUp,
} from "lucide-react";
import * as svc from "../services/certificateApplication.service";

const ROLE_OPTIONS = [
  { value: "executive_to_dean", label: "Executive to Dean" },
  { value: "dean", label: "Dean" },
  { value: "acoe", label: "ACOE" },
  { value: "admin", label: "Admin" },
  { value: "registrar", label: "Registrar" },
  { value: "hod", label: "HOD" },
  { value: "exam_controller", label: "Exam Controller" },
  { value: "accounts", label: "Accounts" },
];

const CONDITION_OPTIONS = [
  { value: "none", label: "No Condition" },
  { value: "admitted_only", label: "Admitted Students Only" },
  { value: "after_program_duration", label: "Only After Program Duration" },
  { value: "completed_semester", label: "Only for Completed Semester" },
  { value: "after_end_sem_result", label: "After End Sem Result Announced" },
];

const AUTO_REFLECT_OPTIONS = [
  { value: "none", label: "None" },
  { value: "specialization", label: "Specialization" },
  { value: "program", label: "Program" },
  { value: "elective", label: "Elective" },
];

const RESPONSE_TIME_UNITS = [
  { value: "working_day", label: "Working Days" },
  { value: "calendar_day", label: "Calendar Days" },
];

function getRoleLabel(value) {
  return ROLE_OPTIONS.find((r) => r.value === value)?.label || value || "-";
}

function getConditionLabel(value) {
  return CONDITION_OPTIONS.find((c) => c.value === value)?.label || value || "-";
}

function getEmptyForm() {
  return {
    certificateType: "",
    label: "",
    description: "",
    feeIndian: 0,
    feeForeign: 0,
    requiresPayment: true,
    responseTimeValue: 5,
    responseTimeUnit: "working_day",
    routing: {
      l1Role: "", l1Label: "",
      l2Role: "", l2Label: "",
      l3Role: "", l3Label: "",
    },
    conditionType: "none",
    conditionDescription: "",
    courierAvailable: true,
    courierCharges: 500,
    autoDraft: false,
    autoReflectField: "none",
    isActive: true,
  };
}

export default function RequestTypeConfig({ embedded = false }) {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [form, setForm] = useState(getEmptyForm());
  const [expandedRow, setExpandedRow] = useState(null);

  const showToast = useCallback((type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await svc.getAllFeeConfigs();
      setConfigs(res.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditingType(null);
    setForm(getEmptyForm());
    setShowModal(true);
  };

  const openEdit = (config) => {
    setEditingType(config.certificateType);
    setForm({
      certificateType: config.certificateType || "",
      label: config.label || "",
      description: config.description || "",
      feeIndian: config.feeIndian ?? 0,
      feeForeign: config.feeForeign ?? 0,
      requiresPayment: config.requiresPayment !== false,
      responseTimeValue: config.responseTimeValue ?? config.processingDays ?? 5,
      responseTimeUnit: config.responseTimeUnit || "working_day",
      routing: {
        l1Role: config.routing?.l1Role || "",
        l1Label: config.routing?.l1Label || "",
        l2Role: config.routing?.l2Role || "",
        l2Label: config.routing?.l2Label || "",
        l3Role: config.routing?.l3Role || "",
        l3Label: config.routing?.l3Label || "",
      },
      conditionType: config.conditionType || "none",
      conditionDescription: config.conditionDescription || "",
      courierAvailable: config.courierAvailable !== false,
      courierCharges: config.courierCharges ?? 500,
      autoDraft: config.autoDraft || false,
      autoReflectField: config.autoReflectField || "none",
      isActive: config.isActive !== false,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingType(null);
  };

  const handleSave = async () => {
    if (!form.label.trim()) {
      showToast("error", "Request type name is required");
      return;
    }
    try {
      setSaving(true);
      const payload = {
        ...form,
        processingDays: form.responseTimeValue,
      };
      if (editingType) {
        await svc.updateFeeConfig(editingType, payload);
        showToast("success", "Request type updated successfully");
      } else {
        if (!form.certificateType.trim()) {
          showToast("error", "Certificate type key is required");
          setSaving(false);
          return;
        }
        await svc.createFeeConfig(payload);
        showToast("success", "Request type created successfully");
      }
      closeModal();
      await load();
    } catch (err) {
      showToast("error", err?.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (config) => {
    if (!window.confirm(`Delete "${config.label}"? This cannot be undone.`)) return;
    try {
      await svc.deleteFeeConfig(config.certificateType);
      showToast("success", "Request type deleted");
      await load();
    } catch (err) {
      showToast("error", err?.response?.data?.message || "Failed to delete");
    }
  };

  const handleToggleActive = async (config) => {
    try {
      await svc.updateFeeConfig(config.certificateType, { isActive: !config.isActive });
      showToast("success", config.isActive ? "Request type disabled" : "Request type enabled");
      await load();
    } catch (err) {
      showToast("error", "Failed to toggle status");
    }
  };

  const updateForm = (field, value) => setForm((f) => ({ ...f, [field]: value }));
  const updateRouting = (field, value) =>
    setForm((f) => ({ ...f, routing: { ...f.routing, [field]: value } }));

  // Auto-set label when role changes in routing
  const handleRoutingRoleChange = (level, value) => {
    updateRouting(`${level}Role`, value);
    updateRouting(`${level}Label`, getRoleLabel(value));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <span className="text-red-800">{error}</span>
          <button onClick={load} className="ml-auto px-3 py-1 bg-red-600 text-white rounded text-sm">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className={embedded ? "" : "p-6 max-w-7xl mx-auto"}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        {!embedded && (
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Settings className="w-6 h-6" /> Service Request Configuration
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Configure service request types, charges, approval routing (L1/L2/L3), and eligibility conditions
            </p>
          </div>
        )}
        <button onClick={openCreate}
          className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium ${embedded ? "ml-auto" : ""}`}>
          <Plus className="w-4 h-4" /> Add Request Type
        </button>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-3 font-semibold text-gray-700 w-10">#</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Request Type</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Charges (INR)</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Response Time</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">L1</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">L2</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">L3</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Condition</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Status</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {configs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-gray-500">
                    No request types configured. Click "Add Request Type" to create one.
                  </td>
                </tr>
              ) : (
                configs.map((config, idx) => (
                  <tr key={config._id || config.certificateType}
                    className={`hover:bg-gray-50 ${!config.isActive ? "opacity-50" : ""}`}>
                    <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{config.label}</div>
                      <div className="text-xs text-gray-400 font-mono">{config.certificateType}</div>
                      {config.autoDraft && (
                        <span className="mt-1 inline-block px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                          Auto Draft
                        </span>
                      )}
                      {config.autoReflectField && config.autoReflectField !== "none" && (
                        <span className="mt-1 ml-1 inline-block px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full">
                          Auto: {config.autoReflectField}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {config.feeIndian === 0 ? (
                        <span className="text-green-600 font-medium">Free</span>
                      ) : (
                        <span className="font-medium">{config.feeIndian.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium">{config.responseTimeValue || config.processingDays}</span>
                      <span className="text-xs text-gray-500 ml-1">
                        {config.responseTimeUnit === "calendar_day" ? "cal. days" : "working days"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs">
                        <div className="font-medium text-blue-700">{config.routing?.l1Label || getRoleLabel(config.routing?.l1Role) || "-"}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs">
                        <div className="font-medium text-orange-700">{config.routing?.l2Label || getRoleLabel(config.routing?.l2Role) || "-"}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs">
                        <div className="font-medium text-red-700">{config.routing?.l3Label || getRoleLabel(config.routing?.l3Role) || "-"}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-[180px]">
                      <div className="text-xs text-gray-600 truncate" title={config.conditionDescription}>
                        {getConditionLabel(config.conditionType)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleToggleActive(config)}
                        className={`px-2 py-1 text-xs rounded-full font-medium ${
                          config.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                        }`}>
                        {config.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setExpandedRow(expandedRow === config.certificateType ? null : config.certificateType)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded" title="Details">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => openEdit(config)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(config)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expanded Detail Row */}
      {expandedRow && (() => {
        const config = configs.find((c) => c.certificateType === expandedRow);
        if (!config) return null;
        return (
          <div className="mt-2 bg-white rounded-xl border border-blue-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-800">{config.label} - Full Details</h3>
              <button onClick={() => setExpandedRow(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><p className="text-xs text-gray-500">Fee (Indian)</p><p className="font-medium">{config.feeIndian === 0 ? "Free" : `INR ${config.feeIndian}`}</p></div>
              <div><p className="text-xs text-gray-500">Fee (Foreign)</p><p className="font-medium">{config.feeForeign === 0 ? "Free" : `USD ${config.feeForeign}`}</p></div>
              <div><p className="text-xs text-gray-500">Requires Payment</p><p className="font-medium">{config.requiresPayment !== false ? "Yes" : "No"}</p></div>
              <div><p className="text-xs text-gray-500">Response Time</p><p className="font-medium">{config.responseTimeValue || config.processingDays} {config.responseTimeUnit === "calendar_day" ? "Calendar Days" : "Working Days"}</p></div>
              <div><p className="text-xs text-gray-500">Courier Available</p><p className="font-medium">{config.courierAvailable !== false ? `Yes (INR ${config.courierCharges || 500})` : "No"}</p></div>
              <div><p className="text-xs text-gray-500">Auto Draft</p><p className="font-medium">{config.autoDraft ? "Yes" : "No"}</p></div>
              <div><p className="text-xs text-gray-500">Auto Reflect Field</p><p className="font-medium capitalize">{config.autoReflectField || "None"}</p></div>
              <div><p className="text-xs text-gray-500">Condition</p><p className="font-medium">{getConditionLabel(config.conditionType)}</p></div>
              {config.conditionDescription && (
                <div className="col-span-2 md:col-span-4">
                  <p className="text-xs text-gray-500">Condition Description</p>
                  <p className="font-medium text-gray-700">{config.conditionDescription}</p>
                </div>
              )}
            </div>
            <div className="mt-3 border-t pt-3">
              <p className="text-xs font-semibold text-gray-600 mb-2">Approval Routing (Escalation)</p>
              <div className="flex gap-4">
                <div className="flex-1 bg-blue-50 rounded-lg p-3">
                  <div className="text-xs font-bold text-blue-700 uppercase mb-1">L1 (Frontline)</div>
                  <div className="text-sm font-medium">{config.routing?.l1Label || getRoleLabel(config.routing?.l1Role) || "-"}</div>
                </div>
                <div className="flex items-center text-gray-300">&#8594;</div>
                <div className="flex-1 bg-orange-50 rounded-lg p-3">
                  <div className="text-xs font-bold text-orange-700 uppercase mb-1">L2 (Escalation)</div>
                  <div className="text-sm font-medium">{config.routing?.l2Label || getRoleLabel(config.routing?.l2Role) || "-"}</div>
                </div>
                <div className="flex items-center text-gray-300">&#8594;</div>
                <div className="flex-1 bg-red-50 rounded-lg p-3">
                  <div className="text-xs font-bold text-red-700 uppercase mb-1">L3 (Final)</div>
                  <div className="text-sm font-medium">{config.routing?.l3Label || getRoleLabel(config.routing?.l3Role) || "-"}</div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Notes Section */}
      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-5">
        <h3 className="text-sm font-bold text-amber-800 flex items-center gap-2 mb-3">
          <Info className="w-4 h-4" /> Important Notes
        </h3>
        <div className="space-y-2 text-sm text-amber-900">
          <div className="flex gap-2">
            <span className="font-bold text-amber-700 shrink-0">1.</span>
            <span>Rise the request ticket with request number after paying the required amount, through our payment gateway.</span>
          </div>
          <div className="flex gap-2">
            <span className="font-bold text-amber-700 shrink-0">2.</span>
            <span>Courier Charges are <strong>500 INR</strong> on each request, if candidate asks for home delivery.</span>
          </div>
          <div className="flex gap-2">
            <span className="font-bold text-amber-700 shrink-0">3.</span>
            <span>Request goes to <strong>L1</strong>, after the required response time the request will move to <strong>L2</strong>, further after the required response time the request will move to <strong>L3</strong>.</span>
          </div>
        </div>
      </div>

      {/* ───── Create / Edit Modal ───── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold">
                {editingType ? "Edit Request Type" : "Add New Request Type"}
              </h2>
              <button onClick={closeModal} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-5">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Request Type Name *</label>
                  <input type="text" value={form.label}
                    onChange={(e) => updateForm("label", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g. Bonafide Letter" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type Key * {editingType && <span className="text-gray-400 text-xs">(readonly)</span>}
                  </label>
                  <input type="text" value={form.certificateType}
                    onChange={(e) => updateForm("certificateType", e.target.value.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""))}
                    disabled={!!editingType}
                    className="w-full border rounded-lg px-3 py-2 text-sm font-mono disabled:bg-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g. bonafide_letter" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={form.description}
                  onChange={(e) => updateForm("description", e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={2} placeholder="Brief description of this request type" />
              </div>

              {/* Charges */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Charges & Payment</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Fee - Indian (INR)</label>
                    <input type="number" min={0} value={form.feeIndian}
                      onChange={(e) => updateForm("feeIndian", Number(e.target.value))}
                      className="w-full border rounded px-3 py-2 text-sm" />
                    <p className="text-xs text-gray-400 mt-1">Set 0 for free/nil</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Fee - Foreign (USD)</label>
                    <input type="number" min={0} value={form.feeForeign}
                      onChange={(e) => updateForm("feeForeign", Number(e.target.value))}
                      className="w-full border rounded px-3 py-2 text-sm" />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.requiresPayment}
                        onChange={(e) => updateForm("requiresPayment", e.target.checked)}
                        className="rounded text-blue-600" />
                      <span className="text-sm text-gray-700">Requires Payment</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Response Time */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Response Time</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Time Value</label>
                    <input type="number" min={1} value={form.responseTimeValue}
                      onChange={(e) => updateForm("responseTimeValue", Number(e.target.value))}
                      className="w-full border rounded px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Time Unit</label>
                    <select value={form.responseTimeUnit}
                      onChange={(e) => updateForm("responseTimeUnit", e.target.value)}
                      className="w-full border rounded px-3 py-2 text-sm">
                      {RESPONSE_TIME_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Routing — L1, L2, L3 */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Approval Routing (L1 / L2 / L3 Escalation)</h3>
                <p className="text-xs text-gray-500 mb-3">Request goes to L1 first. After response time expires, it escalates to L2, then L3.</p>
                <div className="grid grid-cols-3 gap-4">
                  {/* L1 */}
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-blue-700 uppercase">L1 (Frontline)</div>
                    <select value={form.routing.l1Role}
                      onChange={(e) => handleRoutingRoleChange("l1", e.target.value)}
                      className="w-full border rounded px-2 py-1.5 text-xs">
                      <option value="">Select Role</option>
                      {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                    <input type="text" value={form.routing.l1Label}
                      onChange={(e) => updateRouting("l1Label", e.target.value)}
                      className="w-full border rounded px-2 py-1.5 text-xs" placeholder="Display label" />
                  </div>
                  {/* L2 */}
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-orange-700 uppercase">L2 (Escalation)</div>
                    <select value={form.routing.l2Role}
                      onChange={(e) => handleRoutingRoleChange("l2", e.target.value)}
                      className="w-full border rounded px-2 py-1.5 text-xs">
                      <option value="">Select Role</option>
                      {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                    <input type="text" value={form.routing.l2Label}
                      onChange={(e) => updateRouting("l2Label", e.target.value)}
                      className="w-full border rounded px-2 py-1.5 text-xs" placeholder="Display label" />
                  </div>
                  {/* L3 */}
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-red-700 uppercase">L3 (Final)</div>
                    <select value={form.routing.l3Role}
                      onChange={(e) => handleRoutingRoleChange("l3", e.target.value)}
                      className="w-full border rounded px-2 py-1.5 text-xs">
                      <option value="">Select Role</option>
                      {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                    <input type="text" value={form.routing.l3Label}
                      onChange={(e) => updateRouting("l3Label", e.target.value)}
                      className="w-full border rounded px-2 py-1.5 text-xs" placeholder="Display label" />
                  </div>
                </div>
              </div>

              {/* Conditions */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Eligibility Conditions</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Condition Type</label>
                    <select value={form.conditionType}
                      onChange={(e) => updateForm("conditionType", e.target.value)}
                      className="w-full border rounded px-3 py-2 text-sm">
                      {CONDITION_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Auto-Reflect Field</label>
                    <select value={form.autoReflectField}
                      onChange={(e) => updateForm("autoReflectField", e.target.value)}
                      className="w-full border rounded px-3 py-2 text-sm">
                      {AUTO_REFLECT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Condition Description</label>
                  <textarea value={form.conditionDescription}
                    onChange={(e) => updateForm("conditionDescription", e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm" rows={2}
                    placeholder="Describe the condition in detail (shown to students)" />
                </div>
              </div>

              {/* Additional Settings */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Additional Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.courierAvailable}
                        onChange={(e) => updateForm("courierAvailable", e.target.checked)}
                        className="rounded text-blue-600" />
                      <span className="text-sm text-gray-700">Courier / Home Delivery Available</span>
                    </label>
                    {form.courierAvailable && (
                      <div className="mt-2 ml-6">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Courier Charges (INR)</label>
                        <input type="number" min={0} value={form.courierCharges}
                          onChange={(e) => updateForm("courierCharges", Number(e.target.value))}
                          className="w-32 border rounded px-3 py-1.5 text-sm" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.autoDraft}
                        onChange={(e) => updateForm("autoDraft", e.target.checked)}
                        className="rounded text-blue-600" />
                      <span className="text-sm text-gray-700">Auto-Draft Certificate</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.isActive}
                        onChange={(e) => updateForm("isActive", e.target.checked)}
                        className="rounded text-blue-600" />
                      <span className="text-sm text-gray-700">Active (visible to students)</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50 sticky bottom-0">
              <button onClick={closeModal}
                className="px-4 py-2 text-sm text-gray-700 border rounded-lg hover:bg-gray-100">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editingType ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
            toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
          }`}>
            {toast.message}
            <button onClick={() => setToast(null)}><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
