import { useState, useEffect, useCallback } from "react";
import {
  FileText, Search, Eye, CheckCircle, XCircle, Settings,
  IndianRupee, DollarSign, Edit3, Save, X, Users, BarChart3
} from "lucide-react";
import * as appService from "../services/certificateApplication.service";

const STATUS_COLORS = {
  draft: "bg-gray-100 text-gray-700",
  payment_pending: "bg-yellow-100 text-yellow-800",
  submitted: "bg-blue-100 text-blue-800",
  under_review: "bg-purple-100 text-purple-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  issued: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-gray-100 text-gray-500",
};

const ROLE_LABELS = {
  admin: "Admin",
  exam_controller: "Exam Controller",
  registrar: "Registrar",
  dean: "Dean",
  hod: "HOD",
  accounts: "Accounts",
};

export default function CertificateApplications() {
  const [activeTab, setActiveTab] = useState("applications");
  const [applications, setApplications] = useState([]);
  const [feeConfigs, setFeeConfigs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedApp, setSelectedApp] = useState(null);
  const [editingFee, setEditingFee] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterType) params.certificateType = filterType;
      if (searchTerm) params.search = searchTerm;
      const res = await appService.getAllApplications(params);
      setApplications(res.data || []);
    } catch {
      showToast("error", "Failed to load applications");
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterType, searchTerm]);

  const fetchFeeConfigs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await appService.getAllFeeConfigs();
      setFeeConfigs(res.data || []);
    } catch {
      showToast("error", "Failed to load fee configs");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await appService.getApplicationStats();
      setStats(res.data);
    } catch {
      showToast("error", "Failed to load stats");
    }
  }, []);

  useEffect(() => {
    if (activeTab === "applications") fetchApplications();
    else if (activeTab === "fees") fetchFeeConfigs();
    else if (activeTab === "stats") fetchStats();
  }, [activeTab, fetchApplications, fetchFeeConfigs, fetchStats]);

  const handleReview = async (id, decision, remarks) => {
    try {
      await appService.reviewApplication(id, { decision, remarks });
      showToast("success", decision === "approved" ? "Application approved & certificate issued" : "Application rejected");
      fetchApplications();
      setSelectedApp(null);
    } catch (err) {
      showToast("error", err.response?.data?.message || "Failed to review");
    }
  };

  const handleSaveFee = async (type) => {
    try {
      await appService.updateFeeConfig(type, editForm);
      showToast("success", "Fee config updated");
      setEditingFee(null);
      fetchFeeConfigs();
    } catch (err) {
      showToast("error", err.response?.data?.message || "Failed to update");
    }
  };

  const startEditFee = (config) => {
    setEditingFee(config.certificateType);
    setEditForm({
      feeIndian: config.feeIndian,
      feeForeign: config.feeForeign,
      approvalRole: config.approvalRole,
      processingDays: config.processingDays,
      isActive: config.isActive,
      requiresPayment: config.requiresPayment,
    });
  };

  const tabs = [
    { id: "applications", label: "Applications", icon: FileText },
    { id: "fees", label: "Fee Configuration", icon: Settings },
    { id: "stats", label: "Dashboard", icon: BarChart3 },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Certificate Applications</h1>
        <p className="text-sm text-gray-500 mt-1">Manage fee configuration, review applications, and issue certificates</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id ? "bg-white text-blue-600 shadow-sm" : "text-gray-600"
            }`}>
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Applications Tab */}
      {activeTab === "applications" && (
        <div>
          <div className="flex gap-3 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, application no, roll..."
                className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm" />
            </div>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm">
              <option value="">All Statuses</option>
              <option value="payment_pending">Payment Pending</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="issued">Issued</option>
              <option value="rejected">Rejected</option>
            </select>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm">
              <option value="">All Types</option>
              {feeConfigs.length === 0 && <option disabled>Loading...</option>}
              {feeConfigs.map((c) => <option key={c.certificateType} value={c.certificateType}>{c.label}</option>)}
            </select>
          </div>

          {loading ? <div className="text-center py-12 text-gray-500">Loading...</div> : applications.length === 0 ? (
            <div className="text-center py-12 text-gray-500"><FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" /><p>No applications found</p></div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-gray-600">Application #</th>
                    <th className="px-4 py-3 text-left text-gray-600">Student</th>
                    <th className="px-4 py-3 text-left text-gray-600">Type</th>
                    <th className="px-4 py-3 text-left text-gray-600">Fee</th>
                    <th className="px-4 py-3 text-left text-gray-600">Payment</th>
                    <th className="px-4 py-3 text-left text-gray-600">Status</th>
                    <th className="px-4 py-3 text-left text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {applications.map((app) => (
                    <tr key={app._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs">{app.applicationNumber}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{app.studentName}</div>
                        <div className="text-xs text-gray-500">{app.rollNumber}</div>
                      </td>
                      <td className="px-4 py-3 text-xs">{app.certificateLabel || app.certificateType}</td>
                      <td className="px-4 py-3 text-sm">
                        {app.feeCurrency === "INR" ? "₹" : "$"}{app.feeAmount}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          app.paymentStatus === "paid" ? "bg-green-100 text-green-700"
                            : app.paymentStatus === "waived" ? "bg-blue-100 text-blue-700"
                              : "bg-yellow-100 text-yellow-700"
                        }`}>{app.paymentStatus}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[app.status]}`}>
                          {app.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setSelectedApp(app)} className="p-1.5 text-gray-500 hover:text-blue-600 rounded" title="View">
                            <Eye className="w-4 h-4" />
                          </button>
                          {["submitted", "under_review"].includes(app.status) && (
                            <>
                              <button onClick={() => handleReview(app._id, "approved", "")}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Approve & Issue">
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button onClick={() => {
                                const reason = prompt("Rejection reason:");
                                if (reason) handleReview(app._id, "rejected", reason);
                              }} className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Reject">
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Fee Config Tab */}
      {activeTab === "fees" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-600">Certificate Type</th>
                <th className="px-4 py-3 text-left text-gray-600">Fee (Indian) ₹</th>
                <th className="px-4 py-3 text-left text-gray-600">Fee (Foreign) $</th>
                <th className="px-4 py-3 text-left text-gray-600">Approval Role</th>
                <th className="px-4 py-3 text-left text-gray-600">Processing Days</th>
                <th className="px-4 py-3 text-left text-gray-600">Active</th>
                <th className="px-4 py-3 text-left text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {feeConfigs.map((config) => (
                <tr key={config.certificateType} className="hover:bg-gray-50">
                  {editingFee === config.certificateType ? (
                    <>
                      <td className="px-4 py-3 font-medium text-gray-900">{config.label}</td>
                      <td className="px-4 py-3">
                        <input type="number" value={editForm.feeIndian} onChange={(e) => setEditForm({ ...editForm, feeIndian: Number(e.target.value) })}
                          className="w-24 px-2 py-1 border rounded text-sm" />
                      </td>
                      <td className="px-4 py-3">
                        <input type="number" value={editForm.feeForeign} onChange={(e) => setEditForm({ ...editForm, feeForeign: Number(e.target.value) })}
                          className="w-24 px-2 py-1 border rounded text-sm" />
                      </td>
                      <td className="px-4 py-3">
                        <select value={editForm.approvalRole} onChange={(e) => setEditForm({ ...editForm, approvalRole: e.target.value })}
                          className="px-2 py-1 border rounded text-sm">
                          {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <input type="number" value={editForm.processingDays} onChange={(e) => setEditForm({ ...editForm, processingDays: Number(e.target.value) })}
                          className="w-16 px-2 py-1 border rounded text-sm" />
                      </td>
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={editForm.isActive} onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })} className="rounded" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => handleSaveFee(config.certificateType)} className="p-1.5 text-green-600 hover:bg-green-50 rounded"><Save className="w-4 h-4" /></button>
                          <button onClick={() => setEditingFee(null)} className="p-1.5 text-gray-400 hover:bg-gray-50 rounded"><X className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{config.label}</div>
                      </td>
                      <td className="px-4 py-3">₹{config.feeIndian}</td>
                      <td className="px-4 py-3">${config.feeForeign}</td>
                      <td className="px-4 py-3 text-xs">{ROLE_LABELS[config.approvalRole] || config.approvalRole}</td>
                      <td className="px-4 py-3">{config.processingDays} days</td>
                      <td className="px-4 py-3">
                        <span className={`w-2 h-2 inline-block rounded-full ${config.isActive ? "bg-green-500" : "bg-red-400"}`} />
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => startEditFee(config)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded">
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Stats Tab */}
      {activeTab === "stats" && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Pending Approvals" value={stats.pendingApprovals} color="text-amber-600" />
            <StatCard label="Total Revenue" value={`₹${(stats.totalRevenue || 0).toLocaleString()}`} color="text-green-600" />
            <StatCard label="Issued" value={stats.byStatus?.issued || 0} color="text-emerald-600" />
            <StatCard label="Rejected" value={stats.byStatus?.rejected || 0} color="text-red-600" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(stats.byType || {}).map(([type, count]) => (
              <div key={type} className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-sm text-gray-500 capitalize">{type.replace(/_/g, " ")}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{count}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedApp.certificateLabel}</h2>
                <p className="text-sm text-gray-500 font-mono mt-1">{selectedApp.applicationNumber}</p>
              </div>
              <button onClick={() => setSelectedApp(null)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-xs text-gray-500">Student</p><p className="font-medium">{selectedApp.studentName}</p></div>
                <div><p className="text-xs text-gray-500">Roll Number</p><p className="font-medium">{selectedApp.rollNumber}</p></div>
                <div><p className="text-xs text-gray-500">Program</p><p className="font-medium">{selectedApp.programName}</p></div>
                <div><p className="text-xs text-gray-500">Fee</p><p className="font-medium">{selectedApp.feeCurrency === "INR" ? "₹" : "$"}{selectedApp.feeAmount}</p></div>
                <div><p className="text-xs text-gray-500">Payment</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${selectedApp.paymentStatus === "paid" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                    {selectedApp.paymentStatus}
                  </span>
                </div>
                <div><p className="text-xs text-gray-500">Status</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[selectedApp.status]}`}>
                    {selectedApp.status.replace(/_/g, " ")}
                  </span>
                </div>
                <div><p className="text-xs text-gray-500">Applied On</p><p className="font-medium">{new Date(selectedApp.createdAt).toLocaleDateString("en-IN")}</p></div>
                <div><p className="text-xs text-gray-500">Est. Completion</p><p className="font-medium">{selectedApp.estimatedCompletionDate ? new Date(selectedApp.estimatedCompletionDate).toLocaleDateString("en-IN") : "-"}</p></div>
                {selectedApp.assignedRole && <div><p className="text-xs text-gray-500">Assigned Role</p><p className="font-medium">{ROLE_LABELS[selectedApp.assignedRole] || selectedApp.assignedRole}</p></div>}
                {selectedApp.additionalDetails && <div className="col-span-2"><p className="text-xs text-gray-500">Additional Details</p><p className="font-medium">{selectedApp.additionalDetails}</p></div>}
                {selectedApp.subjects?.length > 0 && <div className="col-span-2"><p className="text-xs text-gray-500">Subjects</p><p className="font-medium">{selectedApp.subjects.join(", ")}</p></div>}
                {selectedApp.reviewRemarks && <div className="col-span-2"><p className="text-xs text-gray-500">Review Remarks</p><p className="font-medium">{selectedApp.reviewRemarks}</p></div>}
                {selectedApp.rejectionReason && <div className="col-span-2 p-3 bg-red-50 rounded-lg"><p className="text-xs text-red-600 font-medium">Rejection Reason</p><p className="text-sm text-red-700">{selectedApp.rejectionReason}</p></div>}
              </div>
              {["submitted", "under_review"].includes(selectedApp.status) && (
                <div className="flex gap-3 pt-4 border-t">
                  <button onClick={() => handleReview(selectedApp._id, "approved", "")}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                    <CheckCircle className="w-4 h-4" /> Approve & Issue Certificate
                  </button>
                  <button onClick={() => { const r = prompt("Rejection reason:"); if (r) handleReview(selectedApp._id, "rejected", r); }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 rounded-lg border px-4 py-3 text-sm shadow-lg ${
          toast.type === "success" ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"
        }`}>{toast.message}</div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}
