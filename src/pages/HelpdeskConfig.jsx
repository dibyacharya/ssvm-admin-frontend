import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  ChevronDown,
  ChevronUp,
  Loader2,
  Settings,
  AlertTriangle,
} from "lucide-react";
import * as svc from "../services/helpdeskConfig.service";

/* ──────────────── HelpdeskConfig Page ──────────────── */

export default function HelpdeskConfig() {
  const [categories, setCategories] = useState([]);
  const [roles, setRoles] = useState([]);
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [form, setForm] = useState(getEmptyForm());

  // Sub-category input
  const [newSubCat, setNewSubCat] = useState("");

  const showToast = useCallback((type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  function getEmptyForm() {
    return {
      name: "",
      subCategories: [],
      routing: { l1Level: "", l1Role: "", l2Level: "", l2Role: "", l3Level: "", l3Role: "" },
      special: "",
      isActive: true,
    };
  }

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [catRes, roleRes, levelRes] = await Promise.all([
        svc.getAllCategories(),
        svc.getAvailableRoles(),
        svc.getEscalationLevels(),
      ]);
      setCategories(catRes.categories || []);
      setRoles(roleRes.roles || []);
      setLevels(levelRes.levels || []);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /* ──── Modal handlers ──── */

  const openCreate = () => {
    setEditingCat(null);
    setForm(getEmptyForm());
    setNewSubCat("");
    setShowModal(true);
  };

  const openEdit = (cat) => {
    setEditingCat(cat);
    setForm({
      name: cat.name || "",
      subCategories: [...(cat.subCategories || [])],
      routing: {
        l1Level: cat.routing?.l1Level || "",
        l1Role: cat.routing?.l1Role || "",
        l2Level: cat.routing?.l2Level || "",
        l2Role: cat.routing?.l2Role || "",
        l3Level: cat.routing?.l3Level || "",
        l3Role: cat.routing?.l3Role || "",
      },
      special: cat.special || "",
      isActive: cat.isActive !== false,
    });
    setNewSubCat("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCat(null);
  };

  const addSubCategory = () => {
    const val = newSubCat.trim();
    if (!val) return;
    if (form.subCategories.includes(val)) return;
    setForm((f) => ({ ...f, subCategories: [...f.subCategories, val] }));
    setNewSubCat("");
  };

  const removeSubCategory = (idx) => {
    setForm((f) => ({
      ...f,
      subCategories: f.subCategories.filter((_, i) => i !== idx),
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast("error", "Query name is required");
      return;
    }
    try {
      setSaving(true);
      if (editingCat) {
        await svc.updateCategory(editingCat._id, form);
        showToast("success", "Query updated successfully");
      } else {
        await svc.createCategory(form);
        showToast("success", "Query created successfully");
      }
      closeModal();
      await load();
    } catch (err) {
      showToast("error", err?.response?.data?.error || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat) => {
    if (!window.confirm(`Delete query "${cat.name}"? This cannot be undone.`)) return;
    try {
      await svc.deleteCategory(cat._id);
      showToast("success", "Query deleted");
      await load();
    } catch (err) {
      showToast("error", err?.response?.data?.error || "Failed to delete");
    }
  };

  const handleToggleActive = async (cat) => {
    try {
      await svc.updateCategory(cat._id, { isActive: !cat.isActive });
      showToast("success", cat.isActive ? "Query disabled" : "Query enabled");
      await load();
    } catch (err) {
      showToast("error", "Failed to toggle status");
    }
  };

  /* ──── Render ──── */

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
          <button onClick={load} className="ml-auto px-3 py-1 bg-red-600 text-white rounded text-sm">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-6 h-6" /> Helpdesk Configuration
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage query categories, sub-queries, and role-based routing (L1 / L2 / L3)
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Add Query
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-3 font-semibold text-gray-700 w-12">#</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Query</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Sub-Queries</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">L1</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">L2</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">L3</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Status</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-500">
                    No query categories configured. Click "Add Query" to create one.
                  </td>
                </tr>
              ) : (
                categories.map((cat, idx) => (
                  <tr
                    key={cat._id}
                    className={`hover:bg-gray-50 ${!cat.isActive ? "opacity-50" : ""}`}
                  >
                    <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {cat.name}
                      {cat.special && (
                        <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                          {cat.special}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs">
                      <div className="flex flex-wrap gap-1">
                        {(cat.subCategories || []).slice(0, 3).map((sc, i) => (
                          <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                            {sc}
                          </span>
                        ))}
                        {(cat.subCategories || []).length > 3 && (
                          <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded">
                            +{cat.subCategories.length - 3} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs">
                        <div className="font-medium text-blue-700">{cat.routing?.l1Role || "—"}</div>
                        <div className="text-gray-400">{cat.routing?.l1Level || ""}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs">
                        <div className="font-medium text-orange-700">{cat.routing?.l2Role || "—"}</div>
                        <div className="text-gray-400">{cat.routing?.l2Level || ""}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs">
                        <div className="font-medium text-red-700">{cat.routing?.l3Role || "—"}</div>
                        <div className="text-gray-400">{cat.routing?.l3Level || ""}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleActive(cat)}
                        className={`px-2 py-1 text-xs rounded-full font-medium ${
                          cat.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {cat.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(cat)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(cat)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                        >
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

      {/* ───── Create / Edit Modal ───── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">
                {editingCat ? "Edit Query" : "Add New Query"}
              </h2>
              <button onClick={closeModal} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-5">
              {/* Query Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Query Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. Examination Related"
                />
              </div>

              {/* Special type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Special Type
                </label>
                <select
                  value={form.special}
                  onChange={(e) => setForm((f) => ({ ...f, special: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">None (Regular Query)</option>
                  <option value="follow_up">Follow-up on Existing Ticket</option>
                  <option value="closed_without_resolution">Closed Without Resolution</option>
                </select>
              </div>

              {/* Sub-Categories */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sub-Queries
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newSubCat}
                    onChange={(e) => setNewSubCat(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSubCategory())}
                    className="flex-1 border rounded-lg px-3 py-2 text-sm"
                    placeholder="Type sub-query and press Enter"
                  />
                  <button
                    type="button"
                    onClick={addSubCategory}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.subCategories.map((sc, idx) => (
                    <span
                      key={idx}
                      className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200"
                    >
                      {sc}
                      <button
                        type="button"
                        onClick={() => removeSubCategory(idx)}
                        className="hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Routing — L1, L2, L3 */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Role-Based Routing
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  {/* L1 */}
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-blue-700 uppercase">L1 (Frontline)</div>
                    <select
                      value={form.routing.l1Role}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          routing: { ...f.routing, l1Role: e.target.value },
                        }))
                      }
                      className="w-full border rounded px-2 py-1.5 text-xs"
                    >
                      <option value="">Select Role</option>
                      {roles.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    <select
                      value={form.routing.l1Level}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          routing: { ...f.routing, l1Level: e.target.value },
                        }))
                      }
                      className="w-full border rounded px-2 py-1.5 text-xs"
                    >
                      <option value="">Level</option>
                      {levels.map((l) => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  </div>

                  {/* L2 */}
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-orange-700 uppercase">L2 (Escalation)</div>
                    <select
                      value={form.routing.l2Role}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          routing: { ...f.routing, l2Role: e.target.value },
                        }))
                      }
                      className="w-full border rounded px-2 py-1.5 text-xs"
                    >
                      <option value="">Select Role</option>
                      {roles.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    <select
                      value={form.routing.l2Level}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          routing: { ...f.routing, l2Level: e.target.value },
                        }))
                      }
                      className="w-full border rounded px-2 py-1.5 text-xs"
                    >
                      <option value="">Level</option>
                      {levels.map((l) => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  </div>

                  {/* L3 */}
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-red-700 uppercase">L3 (Final)</div>
                    <select
                      value={form.routing.l3Role}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          routing: { ...f.routing, l3Role: e.target.value },
                        }))
                      }
                      className="w-full border rounded px-2 py-1.5 text-xs"
                    >
                      <option value="">Select Role</option>
                      {roles.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    <select
                      value={form.routing.l3Level}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          routing: { ...f.routing, l3Level: e.target.value },
                        }))
                      }
                      className="w-full border rounded px-2 py-1.5 text-xs"
                    >
                      <option value="">Level</option>
                      {levels.map((l) => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Active toggle */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700">Active</label>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    form.isActive ? "bg-green-500" : "bg-gray-300"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      form.isActive ? "translate-x-5" : ""
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm text-gray-700 border rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {editingCat ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50">
          <div
            className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
              toast.type === "success"
                ? "bg-green-600 text-white"
                : "bg-red-600 text-white"
            }`}
          >
            {toast.message}
            <button onClick={() => setToast(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
