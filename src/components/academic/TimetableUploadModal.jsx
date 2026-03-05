import { useState, useRef, useCallback } from 'react';
import { X, Upload, Download, FileSpreadsheet, AlertTriangle, CheckCircle2, AlertCircle, Info, Loader2 } from 'lucide-react';
import {
  downloadTimetableTemplate,
  parseTimetableUpload,
  updateSemesterDateClassSchedule,
} from '../../services/semester.services';

const ACCEPTED_EXTENSIONS = ['.xlsx', '.xls'];
const ACCEPTED_MIMES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const STATUS_CONFIG = {
  matched: { label: 'Matched', color: 'text-green-700 bg-green-50 border-green-200', icon: CheckCircle2 },
  partial: { label: 'Fuzzy', color: 'text-yellow-700 bg-yellow-50 border-yellow-200', icon: AlertTriangle },
  unmatched: { label: 'Not Found', color: 'text-red-700 bg-red-50 border-red-200', icon: AlertCircle },
  break: { label: 'Break', color: 'text-gray-600 bg-gray-50 border-gray-200', icon: Info },
};

const TimetableUploadModal = ({ semesterId, periodLabel = 'Semester', onClose, onImportSuccess }) => {
  const [step, setStep] = useState('upload'); // upload | preview
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [templateDownloading, setTemplateDownloading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [parseResult, setParseResult] = useState(null);
  const fileInputRef = useRef(null);

  // ── Template download ────────────────────────────────────────────────────
  const handleDownloadTemplate = useCallback(async () => {
    setTemplateDownloading(true);
    setError('');
    try {
      const response = await downloadTimetableTemplate(semesterId);
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `timetable_template_${periodLabel.toLowerCase()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Failed to download template.');
    } finally {
      setTemplateDownloading(false);
    }
  }, [semesterId, periodLabel]);

  // ── File validation ──────────────────────────────────────────────────────
  const isValidFile = (f) => {
    const ext = f.name.toLowerCase().split('.').pop();
    const isValidExt = ACCEPTED_EXTENSIONS.some((e) => f.name.toLowerCase().endsWith(e));
    const isValidMime = ACCEPTED_MIMES.includes(f.type) || ext === 'xlsx' || ext === 'xls';
    return isValidExt || isValidMime;
  };

  const handleFileSelect = (f) => {
    setError('');
    if (!f) return;
    if (!isValidFile(f)) {
      setError('Invalid file type. Please upload an Excel file (.xlsx or .xls).');
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      setError('File size exceeds 10MB limit.');
      return;
    }
    setFile(f);
    setParseResult(null);
    setStep('upload');
  };

  // ── Drag & Drop ──────────────────────────────────────────────────────────
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
  };

  // ── Upload & Parse ───────────────────────────────────────────────────────
  const handleUpload = useCallback(async () => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const result = await parseTimetableUpload(semesterId, file);
      setParseResult(result);
      setStep('preview');
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Failed to parse uploaded file.');
    } finally {
      setUploading(false);
    }
  }, [file, semesterId]);

  // ── Import (save to date schedule) ───────────────────────────────────────
  const handleImport = useCallback(async () => {
    if (!parseResult?.entries?.length) return;

    // Filter to only matched/partial entries (skip unmatched and errors)
    const importableEntries = parseResult.entries.filter(
      (e) => e.matchStatus === 'matched' || e.matchStatus === 'partial' || e.matchStatus === 'break'
    );

    if (importableEntries.length === 0) {
      setError('No importable entries. All entries are either unmatched or have errors.');
      return;
    }

    // Build dateClassSchedule payload
    const dateClassSchedule = importableEntries.map((entry) => ({
      type: entry.type,
      label: entry.label || '',
      date: entry.date,
      startTime: entry.startTime,
      endTime: entry.endTime,
      course: entry.course || null,
      teacher: entry.teacher || null,
      mode: entry.mode || '',
      virtualLink: entry.virtualLink || '',
      roomNo: entry.roomNo || '',
      campusNo: entry.campusNo || '',
    }));

    setImporting(true);
    setError('');
    try {
      await updateSemesterDateClassSchedule(semesterId, dateClassSchedule);
      if (onImportSuccess) onImportSuccess();
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || `Failed to save ${periodLabel.toLowerCase()} schedule.`);
    } finally {
      setImporting(false);
    }
  }, [parseResult, semesterId, periodLabel, onImportSuccess]);

  // ── Computed values ──────────────────────────────────────────────────────
  const importableCount = parseResult?.entries?.filter(
    (e) => e.matchStatus === 'matched' || e.matchStatus === 'partial' || e.matchStatus === 'break'
  ).length || 0;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h2 className="text-lg font-semibold text-gray-900">
            Upload {periodLabel} Timetable
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Step 1: Download Template */}
          <section className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Step 1: Download Template</h3>
            <p className="text-xs text-gray-600 mb-3">
              Download the template, fill in your {periodLabel.toLowerCase()} schedule, then upload it below.
              The template includes course and teacher reference sheets.
            </p>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              disabled={templateDownloading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {templateDownloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {templateDownloading ? 'Downloading...' : 'Download Template'}
            </button>
          </section>

          {/* Step 2: Upload File */}
          <section className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Step 2: Upload Filled File</h3>

            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
                ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'}
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files?.[0])}
              />
              <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">
                {file ? (
                  <span className="inline-flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-blue-500" />
                    <span className="font-medium text-gray-800">{file.name}</span>
                    <span className="text-gray-400">({(file.size / 1024).toFixed(1)} KB)</span>
                  </span>
                ) : (
                  <>Drag & drop an Excel file here, or <span className="text-blue-600 font-medium">click to browse</span></>
                )}
              </p>
              <p className="text-xs text-gray-400 mt-1">Accepted: .xlsx, .xls (max 10MB)</p>
            </div>

            {file && step === 'upload' && (
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={uploading}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {uploading ? 'Parsing...' : 'Upload & Parse'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setParseResult(null);
                    setStep('upload');
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Clear
                </button>
              </div>
            )}
          </section>

          {/* Step 3: Preview & Confirm */}
          {step === 'preview' && parseResult && (
            <section className="border border-gray-200 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-800">Step 3: Preview & Confirm</h3>

              {/* Summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-gray-800">{parseResult.summary?.total || 0}</p>
                  <p className="text-[10px] uppercase text-gray-500 font-medium">Total</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-green-700">{parseResult.summary?.matched || 0}</p>
                  <p className="text-[10px] uppercase text-green-600 font-medium">Matched</p>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-yellow-700">{parseResult.summary?.partialMatch || 0}</p>
                  <p className="text-[10px] uppercase text-yellow-600 font-medium">Fuzzy</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-red-700">{parseResult.summary?.unmatched || 0}</p>
                  <p className="text-[10px] uppercase text-red-600 font-medium">Unmatched</p>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-orange-700">{parseResult.summary?.errors || 0}</p>
                  <p className="text-[10px] uppercase text-orange-600 font-medium">Errors</p>
                </div>
              </div>

              {/* Errors */}
              {parseResult.errors?.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-32 overflow-y-auto">
                  <h4 className="text-xs font-semibold text-red-700 mb-1">Errors (skipped):</h4>
                  <ul className="text-xs text-red-600 space-y-0.5">
                    {parseResult.errors.map((err, i) => (
                      <li key={i}>• {err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Warnings */}
              {parseResult.warnings?.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 max-h-32 overflow-y-auto">
                  <h4 className="text-xs font-semibold text-yellow-700 mb-1">Warnings:</h4>
                  <ul className="text-xs text-yellow-600 space-y-0.5">
                    {parseResult.warnings.map((w, i) => (
                      <li key={i}>• {w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preview table */}
              {parseResult.entries?.length > 0 && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="max-h-64 overflow-auto">
                    <table className="min-w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-2 py-1.5 text-left text-gray-600 font-semibold">Row</th>
                          <th className="px-2 py-1.5 text-left text-gray-600 font-semibold">Date</th>
                          <th className="px-2 py-1.5 text-left text-gray-600 font-semibold">Time</th>
                          <th className="px-2 py-1.5 text-left text-gray-600 font-semibold">Type</th>
                          <th className="px-2 py-1.5 text-left text-gray-600 font-semibold">Subject</th>
                          <th className="px-2 py-1.5 text-left text-gray-600 font-semibold">Teacher</th>
                          <th className="px-2 py-1.5 text-left text-gray-600 font-semibold">Mode</th>
                          <th className="px-2 py-1.5 text-center text-gray-600 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {parseResult.entries.map((entry, idx) => {
                          const cfg = STATUS_CONFIG[entry.matchStatus] || STATUS_CONFIG.unmatched;
                          const StatusIcon = cfg.icon;
                          return (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-2 py-1.5 text-gray-500">{entry.rowNum}</td>
                              <td className="px-2 py-1.5 text-gray-800 whitespace-nowrap">{entry.date}</td>
                              <td className="px-2 py-1.5 text-gray-800 whitespace-nowrap">
                                {entry.startTime} – {entry.endTime}
                              </td>
                              <td className="px-2 py-1.5">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                  entry.type === 'BREAK' ? 'bg-gray-100 text-gray-600' : 'bg-blue-50 text-blue-700'
                                }`}>
                                  {entry.type}
                                </span>
                              </td>
                              <td className="px-2 py-1.5 text-gray-800 max-w-[180px] truncate" title={entry.courseLabel}>
                                {entry.courseLabel || entry.label || '—'}
                              </td>
                              <td className="px-2 py-1.5 text-gray-800 max-w-[140px] truncate" title={entry.teacherLabel}>
                                {entry.teacherLabel || '—'}
                              </td>
                              <td className="px-2 py-1.5 text-gray-600">{entry.mode || '—'}</td>
                              <td className="px-2 py-1.5 text-center">
                                <span
                                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium ${cfg.color}`}
                                  title={entry.matchDetail || ''}
                                >
                                  <StatusIcon className="w-3 h-3" />
                                  {cfg.label}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {parseResult.entries?.length === 0 && parseResult.errors?.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No entries found in the uploaded file.</p>
              )}
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-5 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>

          {step === 'preview' && importableCount > 0 && (
            <button
              type="button"
              onClick={handleImport}
              disabled={importing}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {importing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              {importing ? 'Importing...' : `Import ${importableCount} Entries`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TimetableUploadModal;
