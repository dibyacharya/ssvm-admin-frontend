import { useState, useEffect, useCallback } from "react";
import {
  Plus, Award, FileText, CheckCircle, XCircle, Search,
  ChevronDown, Eye, Shield, Send, Trash2, BarChart3
} from "lucide-react";
import * as certService from "../services/certificate.service";

const STATUS_COLORS = {
  draft: "bg-gray-100 text-gray-700",
  generated: "bg-blue-100 text-blue-800",
  verified: "bg-yellow-100 text-yellow-800",
  issued: "bg-green-100 text-green-800",
  revoked: "bg-red-100 text-red-800",
};

const TYPE_LABELS = {
  degree: "Degree Certificate",
  provisional: "Provisional Certificate",
  migration: "Migration Certificate",
  character: "Character Certificate",
  transcript: "Transcript",
  rank: "Rank Certificate",
};

const DIVISION_LABELS = {
  first_with_distinction: "First with Distinction",
  first: "First Division",
  second: "Second Division",
  third: "Third Division",
  pass: "Pass",
};

export default function CertificateManagement() {
  const [activeTab, setActiveTab] = useState("certificates");
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCert, setSelectedCert] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [stats, setStats] = useState(null);
  const [toast, setToast] = useState(null);

  // Generate form
  const [genForm, setGenForm] = useState({
    type: "degree", programId: "", batchId: "", academicYear: "",
  });
  const [generating, setGenerating] = useState(false);
  const [selected, setSelected] = useState([]);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchCertificates = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterType) params.type = filterType;
      if (filterStatus) params.status = filterStatus;
      if (searchTerm) params.search = searchTerm;
      const res = await certService.getAllCertificates(params);
      setCertificates(res.data || []);
    } catch {
      showToast("error", "Failed to load certificates");
    } finally {
      setLoading(false);
    }
  }, [filterType, filterStatus, searchTerm]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await certService.getCertificateStats();
      setStats(res.data);
    } catch {
      showToast("error", "Failed to load stats");
    }
  }, []);

  useEffect(() => { fetchCertificates(); }, [fetchCertificates]);
  useEffect(() => { if (activeTab === "stats") fetchStats(); }, [activeTab, fetchStats]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!genForm.programId) { showToast("error", "Program is required"); return; }
    try {
      setGenerating(true);
      const res = await certService.generateCertificates(genForm);
      showToast("success", res.message);
      fetchCertificates();
    } catch (err) {
      showToast("error", err.response?.data?.message || "Failed to generate");
    } finally {
      setGenerating(false);
    }
  };

  const handleVerify = async (id) => {
    try {
      await certService.verifyCertificate(id);
      showToast("success", "Certificate verified");
      fetchCertificates();
    } catch (err) {
      showToast("error", err.response?.data?.message || "Failed to verify");
    }
  };

  const handleIssue = async (id) => {
    try {
      await certService.issueCertificate(id);
      showToast("success", "Certificate issued");
      fetchCertificates();
    } catch (err) {
      showToast("error", err.response?.data?.message || "Failed to issue");
    }
  };

  const handleRevoke = async (id) => {
    const reason = prompt("Reason for revocation:");
    if (!reason) return;
    try {
      await certService.revokeCertificate(id, reason);
      showToast("success", "Certificate revoked");
      fetchCertificates();
    } catch (err) {
      showToast("error", err.response?.data?.message || "Failed to revoke");
    }
  };

  const handleBulkVerify = async () => {
    if (selected.length === 0) return;
    try {
      const res = await certService.bulkVerify(selected);
      showToast("success", res.message);
      setSelected([]);
      fetchCertificates();
    } catch (err) {
      showToast("error", err.response?.data?.message || "Failed to bulk verify");
    }
  };

  const handleBulkIssue = async () => {
    if (selected.length === 0) return;
    try {
      const res = await certService.bulkIssue(selected);
      showToast("success", res.message);
      setSelected([]);
      fetchCertificates();
    } catch (err) {
      showToast("error", err.response?.data?.message || "Failed to bulk issue");
    }
  };

  const toggleSelect = (id) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selected.length === certificates.length) setSelected([]);
    else setSelected(certificates.map((c) => c._id));
  };

  const handleViewDetail = async (id) => {
    try {
      const res = await certService.getCertificate(id);
      setSelectedCert(res.data);
      setShowDetailModal(true);
    } catch {
      showToast("error", "Failed to load certificate details");
    }
  };

  const tabs = [
    { id: "certificates", label: "Certificates", icon: Award },
    { id: "generate", label: "Generate", icon: Plus },
    { id: "stats", label: "Statistics", icon: BarChart3 },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Certificates & Degrees</h1>
        <p className="text-sm text-gray-500 mt-1">Generate, verify, and issue certificates to students</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id ? "bg-white dark:bg-gray-700 text-indigo-600 shadow-sm" : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
            }`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Certificates Tab */}
      {activeTab === "certificates" && (
        <div>
          {/* Filters */}
          <div className="flex gap-3 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, serial, roll..."
                className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
              />
            </div>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200">
              <option value="">All Types</option>
              {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200">
              <option value="">All Statuses</option>
              <option value="generated">Generated</option>
              <option value="verified">Verified</option>
              <option value="issued">Issued</option>
              <option value="revoked">Revoked</option>
            </select>
          </div>

          {/* Bulk Actions */}
          {selected.length > 0 && (
            <div className="flex items-center gap-3 mb-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
              <span className="text-sm text-indigo-700 dark:text-indigo-300">{selected.length} selected</span>
              <button onClick={handleBulkVerify} className="px-3 py-1.5 text-sm bg-yellow-500 text-white rounded-lg hover:bg-yellow-600">Bulk Verify</button>
              <button onClick={handleBulkIssue} className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">Bulk Issue</button>
              <button onClick={() => setSelected([])} className="text-sm text-gray-500 hover:text-gray-700">Clear</button>
            </div>
          )}

          {/* Table */}
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : certificates.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Award className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No certificates found</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input type="checkbox" checked={selected.length === certificates.length && certificates.length > 0}
                        onChange={toggleSelectAll} className="rounded" />
                    </th>
                    <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-300">Serial No</th>
                    <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-300">Student</th>
                    <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-300">Type</th>
                    <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-300">Program</th>
                    <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-300">CGPA</th>
                    <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-300">Status</th>
                    <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {certificates.map((cert) => (
                    <tr key={cert._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={selected.includes(cert._id)}
                          onChange={() => toggleSelect(cert._id)} className="rounded" />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{cert.serialNumber}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 dark:text-white">{cert.studentName}</div>
                        <div className="text-xs text-gray-500">{cert.rollNumber}</div>
                      </td>
                      <td className="px-4 py-3 text-xs">{TYPE_LABELS[cert.type] || cert.type}</td>
                      <td className="px-4 py-3 text-xs">{cert.program?.name || cert.programName}</td>
                      <td className="px-4 py-3">{cert.cgpa || "-"}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[cert.status]}`}>
                          {cert.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleViewDetail(cert._id)} className="p-1.5 text-gray-500 hover:text-indigo-600 rounded" title="View">
                            <Eye className="w-4 h-4" />
                          </button>
                          {cert.status === "generated" && (
                            <button onClick={() => handleVerify(cert._id)} className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded" title="Verify">
                              <Shield className="w-4 h-4" />
                            </button>
                          )}
                          {cert.status === "verified" && (
                            <button onClick={() => handleIssue(cert._id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Issue">
                              <Send className="w-4 h-4" />
                            </button>
                          )}
                          {cert.status !== "revoked" && cert.status !== "draft" && (
                            <button onClick={() => handleRevoke(cert._id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Revoke">
                              <XCircle className="w-4 h-4" />
                            </button>
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

      {/* Generate Tab */}
      {activeTab === "generate" && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 max-w-xl">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Generate Certificates</h2>
          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Certificate Type *</label>
              <select value={genForm.type} onChange={(e) => setGenForm({ ...genForm, type: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Program ID *</label>
              <input type="text" value={genForm.programId}
                onChange={(e) => setGenForm({ ...genForm, programId: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Program ObjectId" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Batch ID</label>
              <input type="text" value={genForm.batchId}
                onChange={(e) => setGenForm({ ...genForm, batchId: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Optional - Batch ObjectId" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Academic Year</label>
              <input type="text" value={genForm.academicYear}
                onChange={(e) => setGenForm({ ...genForm, academicYear: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="e.g. 2025-26" />
            </div>
            <button type="submit" disabled={generating}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {generating ? "Generating..." : "Generate Certificates"}
            </button>
          </form>
        </div>
      )}

      {/* Stats Tab */}
      {activeTab === "stats" && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(stats.byType || {}).map(([type, count]) => (
              <div key={type} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-sm text-gray-500">{TYPE_LABELS[type] || type}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{count}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(stats.byStatus || {}).map(([status, count]) => (
              <div key={status} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[status]?.split(" ")[0] || "bg-gray-300"}`} />
                  <p className="text-sm text-gray-500 capitalize">{status}</p>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{count}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedCert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b dark:border-gray-700 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{TYPE_LABELS[selectedCert.type]}</h2>
                <p className="text-sm text-gray-500 mt-1 font-mono">{selectedCert.serialNumber}</p>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Detail label="Student Name" value={selectedCert.studentName} />
                <Detail label="Roll Number" value={selectedCert.rollNumber} />
                <Detail label="Registration No" value={selectedCert.registrationNumber} />
                <Detail label="Enrollment No" value={selectedCert.enrollmentNumber} />
                <Detail label="Program" value={`${selectedCert.programName} (${selectedCert.programCode})`} />
                <Detail label="Department" value={selectedCert.department} />
                <Detail label="School" value={selectedCert.school} />
                <Detail label="CGPA" value={selectedCert.cgpa} />
                <Detail label="Total Credits" value={selectedCert.totalCredits} />
                <Detail label="Division" value={DIVISION_LABELS[selectedCert.division] || "-"} />
                <Detail label="Status" value={
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[selectedCert.status]}`}>
                    {selectedCert.status}
                  </span>
                } />
                <Detail label="Academic Year" value={selectedCert.academicYear} />
                {selectedCert.issueDate && <Detail label="Issue Date" value={new Date(selectedCert.issueDate).toLocaleDateString("en-IN")} />}
                {selectedCert.generatedBy && <Detail label="Generated By" value={selectedCert.generatedBy.name} />}
                {selectedCert.verifiedBy && <Detail label="Verified By" value={selectedCert.verifiedBy.name} />}
                {selectedCert.issuedBy && <Detail label="Issued By" value={selectedCert.issuedBy.name} />}
              </div>
              {selectedCert.remarks && (
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Remarks</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{selectedCert.remarks}</p>
                </div>
              )}
              {selectedCert.revokeReason && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <p className="text-sm font-medium text-red-700">Revocation Reason</p>
                  <p className="text-sm text-red-600 mt-1">{selectedCert.revokeReason}</p>
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
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">{value || "-"}</p>
    </div>
  );
}
