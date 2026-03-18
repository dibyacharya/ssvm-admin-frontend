import { useState, useEffect, useCallback } from "react";
import {
  Plus, Award, FileText, CheckCircle, XCircle, Search,
  Eye, Shield, Send, Trash2, BarChart3, Download, Upload,
  UserPlus, Loader2, X, Save, Image, QrCode, Pencil,
} from "lucide-react";
import * as certService from "../services/certificate.service";
import * as tmplService from "../services/certificateTemplate.service";

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

const QR_POSITIONS = [
  { value: "bottom_left", label: "Bottom Left" },
  { value: "bottom_right", label: "Bottom Right" },
  { value: "top_right", label: "Top Right" },
];

function getEmptyTemplateForm() {
  return {
    name: "",
    program: "",
    certificateType: "degree",
    letterheadImage: "",
    useLetterhead: true,
    layout: {
      title: "DEGREE CERTIFICATE",
      subtitle: "KiiT eXtension School",
      bodyTemplate:
        "This is to certify that <strong>{{studentName}}</strong>, Roll No: <strong>{{rollNumber}}</strong>, " +
        "has successfully completed the <strong>{{programName}}</strong> program " +
        "with a CGPA of <strong>{{cgpa}}</strong> and has been placed in <strong>{{division}}</strong>.",
      showQrCode: true,
      qrPosition: "bottom_left",
      signatureFields: [
        { label: "Controller of Examinations", name: "", designation: "ACOE" },
        { label: "Dean", name: "", designation: "Dean" },
      ],
    },
    isDefault: false,
    isActive: true,
  };
}

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
  const [downloading, setDownloading] = useState(null);

  // Generate form
  const [genForm, setGenForm] = useState({ type: "degree", programId: "", batchId: "", academicYear: "" });
  const [generating, setGenerating] = useState(false);
  const [selected, setSelected] = useState([]);

  // Individual issue
  const [issueForm, setIssueForm] = useState({ studentId: "", type: "degree", academicYear: "", remarks: "" });
  const [issuing, setIssuing] = useState(false);

  // Templates
  const [templates, setTemplates] = useState([]);
  const [tmplLoading, setTmplLoading] = useState(false);
  const [showTmplModal, setShowTmplModal] = useState(false);
  const [editingTmpl, setEditingTmpl] = useState(null);
  const [tmplForm, setTmplForm] = useState(getEmptyTemplateForm());
  const [tmplSaving, setTmplSaving] = useState(false);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // ─── Data fetching ───
  const fetchCertificates = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterType) params.type = filterType;
      if (filterStatus) params.status = filterStatus;
      if (searchTerm) params.search = searchTerm;
      const res = await certService.getAllCertificates(params);
      setCertificates(res.data || []);
    } catch { showToast("error", "Failed to load certificates"); }
    finally { setLoading(false); }
  }, [filterType, filterStatus, searchTerm]);

  const fetchStats = useCallback(async () => {
    try { const res = await certService.getCertificateStats(); setStats(res.data); }
    catch { showToast("error", "Failed to load stats"); }
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      setTmplLoading(true);
      const res = await tmplService.getAllTemplates();
      setTemplates(res.data || []);
    } catch { showToast("error", "Failed to load templates"); }
    finally { setTmplLoading(false); }
  }, []);

  useEffect(() => { fetchCertificates(); }, [fetchCertificates]);
  useEffect(() => {
    if (activeTab === "stats") fetchStats();
    if (activeTab === "templates") fetchTemplates();
  }, [activeTab, fetchStats, fetchTemplates]);

  // ─── Certificate actions ───
  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!genForm.programId) { showToast("error", "Program is required"); return; }
    try {
      setGenerating(true);
      const res = await certService.generateCertificates(genForm);
      showToast("success", res.message);
      fetchCertificates();
    } catch (err) { showToast("error", err.response?.data?.message || "Failed to generate"); }
    finally { setGenerating(false); }
  };

  const handleVerify = async (id) => {
    try { await certService.verifyCertificate(id); showToast("success", "Certificate verified"); fetchCertificates(); }
    catch (err) { showToast("error", err.response?.data?.message || "Failed to verify"); }
  };

  const handleIssue = async (id) => {
    try { await certService.issueCertificate(id); showToast("success", "Certificate issued"); fetchCertificates(); }
    catch (err) { showToast("error", err.response?.data?.message || "Failed to issue"); }
  };

  const handleRevoke = async (id) => {
    const reason = prompt("Reason for revocation:");
    if (!reason) return;
    try { await certService.revokeCertificate(id, reason); showToast("success", "Certificate revoked"); fetchCertificates(); }
    catch (err) { showToast("error", err.response?.data?.message || "Failed to revoke"); }
  };

  const handleBulkVerify = async () => {
    if (selected.length === 0) return;
    try { const res = await certService.bulkVerify(selected); showToast("success", res.message); setSelected([]); fetchCertificates(); }
    catch (err) { showToast("error", err.response?.data?.message || "Failed"); }
  };

  const handleBulkIssue = async () => {
    if (selected.length === 0) return;
    try { const res = await certService.bulkIssue(selected); showToast("success", res.message); setSelected([]); fetchCertificates(); }
    catch (err) { showToast("error", err.response?.data?.message || "Failed"); }
  };

  const toggleSelect = (id) => setSelected((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  const toggleSelectAll = () => {
    if (selected.length === certificates.length) setSelected([]);
    else setSelected(certificates.map((c) => c._id));
  };

  const handleViewDetail = async (id) => {
    try { const res = await certService.getCertificate(id); setSelectedCert(res.data); setShowDetailModal(true); }
    catch { showToast("error", "Failed to load details"); }
  };

  // ─── PDF Download ───
  const handleDownloadPdf = async (id, withLetterhead = true) => {
    try {
      setDownloading(id);
      const blob = await certService.downloadCertificatePdf(id, withLetterhead);
      const url = window.URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `certificate-${id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      showToast("success", "PDF downloaded");
    } catch (err) { showToast("error", err.response?.data?.message || "Failed to download PDF"); }
    finally { setDownloading(null); }
  };

  // ─── Individual Issue ───
  const handleIssueIndividual = async (e) => {
    e.preventDefault();
    if (!issueForm.studentId || !issueForm.type) { showToast("error", "Student ID and type are required"); return; }
    try {
      setIssuing(true);
      await certService.issueToStudent(issueForm);
      showToast("success", "Certificate issued to student");
      setIssueForm({ studentId: "", type: "degree", academicYear: "", remarks: "" });
      fetchCertificates();
    } catch (err) { showToast("error", err.response?.data?.message || "Failed to issue"); }
    finally { setIssuing(false); }
  };

  // ─── Template actions ───
  const openCreateTmpl = () => {
    setEditingTmpl(null);
    setTmplForm(getEmptyTemplateForm());
    setShowTmplModal(true);
  };

  const openEditTmpl = (tmpl) => {
    setEditingTmpl(tmpl._id);
    setTmplForm({
      name: tmpl.name || "",
      program: tmpl.program?._id || tmpl.program || "",
      certificateType: tmpl.certificateType || "degree",
      letterheadImage: tmpl.letterheadImage || "",
      useLetterhead: tmpl.useLetterhead !== false,
      layout: {
        title: tmpl.layout?.title || "CERTIFICATE",
        subtitle: tmpl.layout?.subtitle || "KiiT eXtension School",
        bodyTemplate: tmpl.layout?.bodyTemplate || "",
        showQrCode: tmpl.layout?.showQrCode !== false,
        qrPosition: tmpl.layout?.qrPosition || "bottom_left",
        signatureFields: tmpl.layout?.signatureFields || [{ label: "", name: "", designation: "" }],
      },
      isDefault: tmpl.isDefault || false,
      isActive: tmpl.isActive !== false,
    });
    setShowTmplModal(true);
  };

  const handleSaveTmpl = async () => {
    if (!tmplForm.name.trim()) { showToast("error", "Template name is required"); return; }
    try {
      setTmplSaving(true);
      if (editingTmpl) {
        await tmplService.updateTemplate(editingTmpl, tmplForm);
        showToast("success", "Template updated");
      } else {
        await tmplService.createTemplate(tmplForm);
        showToast("success", "Template created");
      }
      setShowTmplModal(false);
      setEditingTmpl(null);
      fetchTemplates();
    } catch (err) { showToast("error", err.response?.data?.message || "Failed to save template"); }
    finally { setTmplSaving(false); }
  };

  const handleDeleteTmpl = async (id) => {
    if (!window.confirm("Delete this template?")) return;
    try { await tmplService.deleteTemplate(id); showToast("success", "Template deleted"); fetchTemplates(); }
    catch (err) { showToast("error", err.response?.data?.message || "Failed to delete"); }
  };

  const handlePreviewTmpl = async (id, withLetterhead = true) => {
    try {
      const blob = await tmplService.previewTemplate(id, withLetterhead);
      const url = window.URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
      window.open(url, "_blank");
    } catch (err) { showToast("error", err.response?.data?.message || "Failed to preview"); }
  };

  const updateTmplLayout = (field, value) =>
    setTmplForm((f) => ({ ...f, layout: { ...f.layout, [field]: value } }));

  const addSignatureField = () =>
    setTmplForm((f) => ({
      ...f,
      layout: { ...f.layout, signatureFields: [...(f.layout.signatureFields || []), { label: "", name: "", designation: "" }] },
    }));

  const removeSignatureField = (idx) =>
    setTmplForm((f) => ({
      ...f,
      layout: { ...f.layout, signatureFields: f.layout.signatureFields.filter((_, i) => i !== idx) },
    }));

  const updateSignatureField = (idx, field, value) =>
    setTmplForm((f) => ({
      ...f,
      layout: {
        ...f.layout,
        signatureFields: f.layout.signatureFields.map((s, i) => (i === idx ? { ...s, [field]: value } : s)),
      },
    }));

  const tabs = [
    { id: "certificates", label: "Certificates", icon: Award },
    { id: "generate", label: "Generate / Issue", icon: Plus },
    { id: "templates", label: "Templates", icon: FileText },
    { id: "stats", label: "Statistics", icon: BarChart3 },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Certificates & Degrees</h1>
        <p className="text-sm text-gray-500 mt-1">Generate, verify, issue certificates with PDF download and QR code</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
            }`}>
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* ═══ Certificates Tab ═══ */}
      {activeTab === "certificates" && (
        <div>
          <div className="flex gap-3 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, serial, roll..." className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm" />
            </div>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
              <option value="">All Types</option>
              {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
              <option value="">All Statuses</option>
              <option value="generated">Generated</option>
              <option value="verified">Verified</option>
              <option value="issued">Issued</option>
              <option value="revoked">Revoked</option>
            </select>
          </div>

          {selected.length > 0 && (
            <div className="flex items-center gap-3 mb-4 p-3 bg-blue-50 rounded-lg">
              <span className="text-sm text-blue-700">{selected.length} selected</span>
              <button onClick={handleBulkVerify} className="px-3 py-1.5 text-sm bg-yellow-500 text-white rounded-lg hover:bg-yellow-600">Bulk Verify</button>
              <button onClick={handleBulkIssue} className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">Bulk Issue</button>
              <button onClick={() => setSelected([])} className="text-sm text-gray-500 hover:text-gray-700">Clear</button>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : certificates.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Award className="w-12 h-12 mx-auto mb-3 text-gray-300" /><p>No certificates found</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input type="checkbox" checked={selected.length === certificates.length && certificates.length > 0}
                        onChange={toggleSelectAll} className="rounded" />
                    </th>
                    <th className="px-4 py-3 text-left text-gray-600">Serial No</th>
                    <th className="px-4 py-3 text-left text-gray-600">Student</th>
                    <th className="px-4 py-3 text-left text-gray-600">Type</th>
                    <th className="px-4 py-3 text-left text-gray-600">Program</th>
                    <th className="px-4 py-3 text-left text-gray-600">CGPA</th>
                    <th className="px-4 py-3 text-left text-gray-600">Status</th>
                    <th className="px-4 py-3 text-left text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {certificates.map((cert) => (
                    <tr key={cert._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={selected.includes(cert._id)} onChange={() => toggleSelect(cert._id)} className="rounded" />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{cert.serialNumber}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{cert.studentName}</div>
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
                          <button onClick={() => handleViewDetail(cert._id)} className="p-1.5 text-gray-500 hover:text-blue-600 rounded" title="View">
                            <Eye className="w-4 h-4" />
                          </button>
                          {cert.status === "issued" && (
                            <>
                              <button onClick={() => handleDownloadPdf(cert._id, true)}
                                disabled={downloading === cert._id}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Download PDF (with letterhead)">
                                {downloading === cert._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                              </button>
                              <button onClick={() => handleDownloadPdf(cert._id, false)}
                                disabled={downloading === cert._id}
                                className="p-1.5 text-gray-500 hover:bg-gray-100 rounded" title="Download PDF (without letterhead)">
                                <FileText className="w-4 h-4" />
                              </button>
                            </>
                          )}
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

      {/* ═══ Generate / Issue Tab ═══ */}
      {activeTab === "generate" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Bulk Generate */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Bulk Generate</h2>
            <p className="text-xs text-gray-500 mb-4">Generate certificates for all eligible students in a program/batch</p>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Certificate Type *</label>
                <select value={genForm.type} onChange={(e) => setGenForm({ ...genForm, type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg">
                  {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Program ID *</label>
                <input type="text" value={genForm.programId}
                  onChange={(e) => setGenForm({ ...genForm, programId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg" placeholder="Program ObjectId" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Batch ID</label>
                <input type="text" value={genForm.batchId}
                  onChange={(e) => setGenForm({ ...genForm, batchId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg" placeholder="Optional" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
                <input type="text" value={genForm.academicYear}
                  onChange={(e) => setGenForm({ ...genForm, academicYear: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg" placeholder="e.g. 2025-26" />
              </div>
              <button type="submit" disabled={generating}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {generating ? "Generating..." : "Generate Certificates"}
              </button>
            </form>
          </div>

          {/* Individual Issue */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <UserPlus className="w-5 h-5" /> Issue to Individual Student
            </h2>
            <p className="text-xs text-gray-500 mb-4">Directly issue a certificate to a specific student (skips generate/verify steps)</p>
            <form onSubmit={handleIssueIndividual} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Student ID *</label>
                <input type="text" value={issueForm.studentId}
                  onChange={(e) => setIssueForm({ ...issueForm, studentId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg" placeholder="Student ObjectId" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Certificate Type *</label>
                <select value={issueForm.type} onChange={(e) => setIssueForm({ ...issueForm, type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg">
                  {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
                <input type="text" value={issueForm.academicYear}
                  onChange={(e) => setIssueForm({ ...issueForm, academicYear: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg" placeholder="e.g. 2025-26" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <input type="text" value={issueForm.remarks}
                  onChange={(e) => setIssueForm({ ...issueForm, remarks: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg" placeholder="Optional" />
              </div>
              <button type="submit" disabled={issuing}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                {issuing ? "Issuing..." : "Issue Certificate"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ═══ Templates Tab ═══ */}
      {activeTab === "templates" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">Manage certificate design templates per program</p>
            <button onClick={openCreateTmpl}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
              <Plus className="w-4 h-4" /> Add Template
            </button>
          </div>

          {tmplLoading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No templates created yet</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-gray-600">#</th>
                    <th className="px-4 py-3 text-left text-gray-600">Template Name</th>
                    <th className="px-4 py-3 text-left text-gray-600">Type</th>
                    <th className="px-4 py-3 text-left text-gray-600">Program</th>
                    <th className="px-4 py-3 text-left text-gray-600">Letterhead</th>
                    <th className="px-4 py-3 text-left text-gray-600">QR Code</th>
                    <th className="px-4 py-3 text-left text-gray-600">Default</th>
                    <th className="px-4 py-3 text-left text-gray-600">Status</th>
                    <th className="px-4 py-3 text-right text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {templates.map((tmpl, idx) => (
                    <tr key={tmpl._id} className={`hover:bg-gray-50 ${!tmpl.isActive ? "opacity-50" : ""}`}>
                      <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{tmpl.name}</td>
                      <td className="px-4 py-3 text-xs">{TYPE_LABELS[tmpl.certificateType] || tmpl.certificateType}</td>
                      <td className="px-4 py-3 text-xs">{tmpl.program?.name || "All Programs"}</td>
                      <td className="px-4 py-3">
                        {tmpl.letterheadImage ? (
                          <span className="flex items-center gap-1 text-green-600 text-xs"><Image className="w-3 h-3" /> Yes</span>
                        ) : (
                          <span className="text-gray-400 text-xs">No</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {tmpl.layout?.showQrCode !== false ? (
                          <span className="flex items-center gap-1 text-blue-600 text-xs"><QrCode className="w-3 h-3" /> {tmpl.layout?.qrPosition?.replace("_", " ")}</span>
                        ) : (
                          <span className="text-gray-400 text-xs">Off</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {tmpl.isDefault ? (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">Default</span>
                        ) : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${tmpl.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {tmpl.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handlePreviewTmpl(tmpl._id, true)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Preview with letterhead">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => handlePreviewTmpl(tmpl._id, false)}
                            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded" title="Preview without letterhead">
                            <FileText className="w-4 h-4" />
                          </button>
                          <button onClick={() => openEditTmpl(tmpl)}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded" title="Edit">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteTmpl(tmpl._id)}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Placeholder tags info */}
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-blue-800 mb-2">Available Placeholders for Body Template</h4>
            <div className="flex flex-wrap gap-2 text-xs">
              {["{{studentName}}", "{{rollNumber}}", "{{registrationNumber}}", "{{enrollmentNumber}}",
                "{{programName}}", "{{programCode}}", "{{department}}", "{{school}}",
                "{{serialNumber}}", "{{cgpa}}", "{{totalCredits}}", "{{division}}",
                "{{issueDate}}", "{{completionDate}}", "{{admissionDate}}", "{{academicYear}}",
              ].map((tag) => (
                <code key={tag} className="px-2 py-0.5 bg-white border border-blue-200 text-blue-700 rounded">{tag}</code>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ Stats Tab ═══ */}
      {activeTab === "stats" && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(stats.byType || {}).map(([type, count]) => (
              <div key={type} className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-sm text-gray-500">{TYPE_LABELS[type] || type}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{count}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(stats.byStatus || {}).map(([status, count]) => (
              <div key={status} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[status]?.split(" ")[0] || "bg-gray-300"}`} />
                  <p className="text-sm text-gray-500 capitalize">{status}</p>
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-1">{count}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Detail Modal ═══ */}
      {showDetailModal && selectedCert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{TYPE_LABELS[selectedCert.type]}</h2>
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
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[selectedCert.status]}`}>{selectedCert.status}</span>
                } />
                <Detail label="Academic Year" value={selectedCert.academicYear} />
                {selectedCert.issueDate && <Detail label="Issue Date" value={new Date(selectedCert.issueDate).toLocaleDateString("en-IN")} />}
                {selectedCert.generatedBy && <Detail label="Generated By" value={selectedCert.generatedBy.name} />}
                {selectedCert.verifiedBy && <Detail label="Verified By" value={selectedCert.verifiedBy.name} />}
                {selectedCert.issuedBy && <Detail label="Issued By" value={selectedCert.issuedBy.name} />}
              </div>
              {selectedCert.remarks && (
                <div><p className="text-sm font-medium text-gray-700">Remarks</p><p className="text-sm text-gray-600 mt-1">{selectedCert.remarks}</p></div>
              )}
              {selectedCert.revokeReason && (
                <div className="p-3 bg-red-50 rounded-lg">
                  <p className="text-sm font-medium text-red-700">Revocation Reason</p>
                  <p className="text-sm text-red-600 mt-1">{selectedCert.revokeReason}</p>
                </div>
              )}
              {selectedCert.status === "issued" && (
                <div className="flex gap-3 pt-4 border-t">
                  <button onClick={() => { setShowDetailModal(false); handleDownloadPdf(selectedCert._id, true); }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    <Download className="w-4 h-4" /> PDF with Letterhead
                  </button>
                  <button onClick={() => { setShowDetailModal(false); handleDownloadPdf(selectedCert._id, false); }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                    <Download className="w-4 h-4" /> PDF without Letterhead
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ Template Modal ═══ */}
      {showTmplModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold">{editingTmpl ? "Edit Template" : "Create Template"}</h2>
              <button onClick={() => setShowTmplModal(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-4 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Template Name *</label>
                  <input type="text" value={tmplForm.name}
                    onChange={(e) => setTmplForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. B.Tech Degree Certificate" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Certificate Type *</label>
                  <select value={tmplForm.certificateType}
                    onChange={(e) => setTmplForm((f) => ({ ...f, certificateType: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm">
                    {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Program ID (optional)</label>
                  <input type="text" value={tmplForm.program}
                    onChange={(e) => setTmplForm((f) => ({ ...f, program: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Leave empty for all programs" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Letterhead Image URL</label>
                  <input type="text" value={tmplForm.letterheadImage}
                    onChange={(e) => setTmplForm((f) => ({ ...f, letterheadImage: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="https://... or Azure Blob URL" />
                </div>
              </div>

              {/* Layout */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Certificate Layout</h3>
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
                    <input type="text" value={tmplForm.layout.title}
                      onChange={(e) => updateTmplLayout("title", e.target.value)}
                      className="w-full border rounded px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Subtitle</label>
                    <input type="text" value={tmplForm.layout.subtitle}
                      onChange={(e) => updateTmplLayout("subtitle", e.target.value)}
                      className="w-full border rounded px-3 py-2 text-sm" />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Body Template (HTML with placeholders)</label>
                  <textarea value={tmplForm.layout.bodyTemplate}
                    onChange={(e) => updateTmplLayout("bodyTemplate", e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm font-mono" rows={4} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">QR Code Position</label>
                    <select value={tmplForm.layout.qrPosition}
                      onChange={(e) => updateTmplLayout("qrPosition", e.target.value)}
                      className="w-full border rounded px-3 py-2 text-sm">
                      {QR_POSITIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                  <div className="flex items-end gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={tmplForm.layout.showQrCode}
                        onChange={(e) => updateTmplLayout("showQrCode", e.target.checked)} className="rounded text-blue-600" />
                      <span className="text-sm text-gray-700">Show QR Code</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={tmplForm.useLetterhead}
                        onChange={(e) => setTmplForm((f) => ({ ...f, useLetterhead: e.target.checked }))} className="rounded text-blue-600" />
                      <span className="text-sm text-gray-700">Use Letterhead</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Signature Fields */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">Signature Fields</h3>
                  <button type="button" onClick={addSignatureField}
                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>
                {(tmplForm.layout.signatureFields || []).map((sig, idx) => (
                  <div key={idx} className="flex gap-2 mb-2 items-center">
                    <input type="text" value={sig.label} onChange={(e) => updateSignatureField(idx, "label", e.target.value)}
                      className="flex-1 border rounded px-2 py-1.5 text-xs" placeholder="Label (e.g. Dean)" />
                    <input type="text" value={sig.name} onChange={(e) => updateSignatureField(idx, "name", e.target.value)}
                      className="flex-1 border rounded px-2 py-1.5 text-xs" placeholder="Name (optional)" />
                    <input type="text" value={sig.designation} onChange={(e) => updateSignatureField(idx, "designation", e.target.value)}
                      className="flex-1 border rounded px-2 py-1.5 text-xs" placeholder="Designation" />
                    <button type="button" onClick={() => removeSignatureField(idx)} className="text-red-500 hover:text-red-700 p-1">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Toggles */}
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={tmplForm.isDefault}
                    onChange={(e) => setTmplForm((f) => ({ ...f, isDefault: e.target.checked }))} className="rounded text-blue-600" />
                  <span className="text-sm text-gray-700">Set as Default for this type</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={tmplForm.isActive}
                    onChange={(e) => setTmplForm((f) => ({ ...f, isActive: e.target.checked }))} className="rounded text-blue-600" />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50 sticky bottom-0">
              <button onClick={() => setShowTmplModal(false)} className="px-4 py-2 text-sm text-gray-700 border rounded-lg hover:bg-gray-100">Cancel</button>
              <button onClick={handleSaveTmpl} disabled={tmplSaving}
                className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {tmplSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editingTmpl ? "Update" : "Create"}
              </button>
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

function Detail({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-900 mt-0.5">{value || "-"}</p>
    </div>
  );
}
