import { useState, useEffect, useCallback } from "react";
import {
  Settings, Save, RotateCcw, Plus, Trash2, Edit3, Check, X,
  GraduationCap, Clock, UserCheck, FileText, Award, BarChart3
} from "lucide-react";
import * as settingsService from "../services/examSettings.service";

const CATEGORY_META = {
  grading: { label: "Grading", icon: GraduationCap, color: "text-indigo-600 bg-indigo-50" },
  attendance: { label: "Attendance", icon: Clock, color: "text-amber-600 bg-amber-50" },
  registration: { label: "Registration", icon: UserCheck, color: "text-blue-600 bg-blue-50" },
  conduct: { label: "Exam Conduct", icon: FileText, color: "text-green-600 bg-green-50" },
  result: { label: "Results", icon: BarChart3, color: "text-purple-600 bg-purple-50" },
  certificate: { label: "Certificates", icon: Award, color: "text-rose-600 bg-rose-50" },
};

export default function ExamSettingsPage() {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("");
  const [editingKey, setEditingKey] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (activeCategory) params.category = activeCategory;
      const res = await settingsService.getAllSettings(params);
      setSettings(res.data || []);
    } catch {
      showToast("error", "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, [activeCategory]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const startEdit = (setting) => {
    setEditingKey(setting.key);
    setEditValue(
      setting.valueType === "gradeScale" || setting.valueType === "json"
        ? JSON.stringify(setting.value, null, 2)
        : String(setting.value)
    );
  };

  const cancelEdit = () => { setEditingKey(null); setEditValue(""); };

  const saveEdit = async (setting) => {
    try {
      let parsedValue;
      if (setting.valueType === "boolean") parsedValue = editValue === "true";
      else if (setting.valueType === "number") parsedValue = Number(editValue);
      else if (setting.valueType === "gradeScale" || setting.valueType === "json") parsedValue = JSON.parse(editValue);
      else parsedValue = editValue;

      await settingsService.updateSetting(setting.key, { value: parsedValue });
      showToast("success", "Setting updated");
      setEditingKey(null);
      fetchSettings();
    } catch (err) {
      showToast("error", err.response?.data?.message || "Failed to update");
    }
  };

  const handleToggle = async (setting) => {
    try {
      await settingsService.updateSetting(setting.key, { value: !setting.value });
      showToast("success", `${setting.label} ${!setting.value ? "enabled" : "disabled"}`);
      fetchSettings();
    } catch {
      showToast("error", "Failed to toggle setting");
    }
  };

  const handleReset = async () => {
    if (!confirm("Reset all exam settings to defaults? This cannot be undone.")) return;
    try {
      await settingsService.resetToDefaults();
      showToast("success", "Settings reset to defaults");
      fetchSettings();
    } catch {
      showToast("error", "Failed to reset settings");
    }
  };

  const handleDelete = async (key) => {
    if (!confirm("Delete this custom setting?")) return;
    try {
      await settingsService.deleteSetting(key);
      showToast("success", "Setting deleted");
      fetchSettings();
    } catch (err) {
      showToast("error", err.response?.data?.message || "Failed to delete");
    }
  };

  // Group settings by category
  const grouped = {};
  settings.forEach((s) => {
    if (!grouped[s.category]) grouped[s.category] = [];
    grouped[s.category].push(s);
  });

  const categories = Object.keys(CATEGORY_META);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Settings className="w-6 h-6" /> Exam Settings
          </h1>
          <p className="text-sm text-gray-500 mt-1">Configure grading, attendance, conduct, and integration settings</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
            <Plus className="w-4 h-4" /> Add Setting
          </button>
          <button onClick={handleReset}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50">
            <RotateCcw className="w-4 h-4" /> Reset Defaults
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 overflow-x-auto">
        <button onClick={() => setActiveCategory("")}
          className={`px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
            !activeCategory ? "bg-white dark:bg-gray-700 text-indigo-600 shadow-sm" : "text-gray-600 dark:text-gray-400"
          }`}>
          All
        </button>
        {categories.map((cat) => {
          const meta = CATEGORY_META[cat];
          return (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                activeCategory === cat ? "bg-white dark:bg-gray-700 text-indigo-600 shadow-sm" : "text-gray-600 dark:text-gray-400"
              }`}>
              <meta.icon className="w-3.5 h-3.5" /> {meta.label}
            </button>
          );
        })}
      </div>

      {/* Settings Cards */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, items]) => {
            const meta = CATEGORY_META[category] || { label: category, icon: Settings, color: "text-gray-600 bg-gray-50" };
            return (
              <div key={category}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`p-1.5 rounded-lg ${meta.color}`}>
                    <meta.icon className="w-4 h-4" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{meta.label}</h2>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
                  {items.map((setting) => (
                    <SettingRow
                      key={setting.key}
                      setting={setting}
                      isEditing={editingKey === setting.key}
                      editValue={editValue}
                      onEditValueChange={setEditValue}
                      onStartEdit={() => startEdit(setting)}
                      onSave={() => saveEdit(setting)}
                      onCancel={cancelEdit}
                      onToggle={() => handleToggle(setting)}
                      onDelete={() => handleDelete(setting.key)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Setting Modal */}
      {showAddModal && (
        <AddSettingModal
          onClose={() => setShowAddModal(false)}
          onCreated={() => { setShowAddModal(false); fetchSettings(); }}
          showToast={showToast}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 rounded-lg border px-4 py-3 text-sm shadow-lg ${
          toast.type === "success" ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

function SettingRow({ setting, isEditing, editValue, onEditValueChange, onStartEdit, onSave, onCancel, onToggle, onDelete }) {
  if (setting.valueType === "boolean" && !isEditing) {
    return (
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-white">{setting.label}</p>
          <p className="text-xs text-gray-500 mt-0.5">{setting.description}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              setting.value ? "bg-green-500" : "bg-gray-300"
            }`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              setting.value ? "translate-x-6" : "translate-x-1"
            }`} />
          </button>
          <span className="text-xs text-gray-500 w-8">{setting.value ? "On" : "Off"}</span>
        </div>
      </div>
    );
  }

  if (setting.valueType === "gradeScale" && !isEditing) {
    return (
      <div className="px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{setting.label}</p>
            <p className="text-xs text-gray-500">{setting.description}</p>
          </div>
          <button onClick={onStartEdit} className="p-1.5 text-gray-400 hover:text-indigo-600 rounded">
            <Edit3 className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {(setting.value || []).map((g) => (
            <div key={g.grade} className="text-center p-2 rounded-lg bg-gray-50 dark:bg-gray-700">
              <p className="text-lg font-bold text-gray-900 dark:text-white">{g.grade}</p>
              <p className="text-xs text-gray-500">GP: {g.gradePoint}</p>
              <p className="text-xs text-gray-400">{g.minPercentage}-{g.maxPercentage}%</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-5 py-4">
      <div className="flex-1 mr-4">
        <p className="text-sm font-medium text-gray-900 dark:text-white">{setting.label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{setting.description}</p>
      </div>
      <div className="flex items-center gap-2">
        {isEditing ? (
          <>
            {setting.valueType === "gradeScale" || setting.valueType === "json" ? (
              <textarea value={editValue} onChange={(e) => onEditValueChange(e.target.value)}
                rows={8} className="w-80 px-3 py-2 border rounded-lg text-sm font-mono dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            ) : (
              <input type={setting.valueType === "number" ? "number" : "text"} value={editValue}
                onChange={(e) => onEditValueChange(e.target.value)}
                className="w-32 px-3 py-1.5 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            )}
            <button onClick={onSave} className="p-1.5 text-green-600 hover:bg-green-50 rounded"><Check className="w-4 h-4" /></button>
            <button onClick={onCancel} className="p-1.5 text-gray-400 hover:bg-gray-50 rounded"><X className="w-4 h-4" /></button>
          </>
        ) : (
          <>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded">
              {String(setting.value)}
            </span>
            <button onClick={onStartEdit} className="p-1.5 text-gray-400 hover:text-indigo-600 rounded"><Edit3 className="w-4 h-4" /></button>
            <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
          </>
        )}
      </div>
    </div>
  );
}

function AddSettingModal({ onClose, onCreated, showToast }) {
  const [form, setForm] = useState({
    key: "", category: "conduct", label: "", description: "", valueType: "string", value: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.key || !form.label || !form.value) {
      showToast("error", "Key, label, and value are required");
      return;
    }
    try {
      setSubmitting(true);
      let parsedValue = form.value;
      if (form.valueType === "number") parsedValue = Number(form.value);
      else if (form.valueType === "boolean") parsedValue = form.value === "true";
      else if (form.valueType === "json") parsedValue = JSON.parse(form.value);

      await settingsService.createSetting({ ...form, value: parsedValue });
      showToast("success", "Setting created");
      onCreated();
    } catch (err) {
      showToast("error", err.response?.data?.message || "Failed to create setting");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md">
        <div className="p-6 border-b dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Add Custom Setting</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Key *</label>
            <input type="text" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="e.g. custom_exam_rule" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Label *</label>
            <input type="text" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                {Object.entries(CATEGORY_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
              <select value={form.valueType} onChange={(e) => setForm({ ...form, valueType: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                <option value="string">String</option>
                <option value="number">Number</option>
                <option value="boolean">Boolean</option>
                <option value="json">JSON</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Value *</label>
            <input type="text" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder={form.valueType === "boolean" ? "true or false" : "Value"} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-gray-700 dark:text-gray-300 dark:border-gray-600">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {submitting ? "Creating..." : "Create Setting"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
