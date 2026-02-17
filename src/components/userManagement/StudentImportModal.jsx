import React, { useMemo, useState } from "react";
import { Upload, X, AlertCircle, CheckCircle, FileText } from "lucide-react";
import { importStudentsFromTemplate } from "../../services/studentImport.service";

const csvEscape = (value) => {
  const str = value === undefined || value === null ? "" : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const buildErrorsCsv = (errors) => {
  const rows = Array.isArray(errors) ? errors : [];
  const header = ["rowNumber", "field", "message"];
  const lines = [header.join(",")];
  rows.forEach((err) => {
    lines.push(
      [
        csvEscape(err?.rowNumber ?? ""),
        csvEscape(err?.field ?? ""),
        csvEscape(err?.message ?? ""),
      ].join(",")
    );
  });
  return `${lines.join("\n")}\n`;
};

const downloadTextFile = ({ filename, content, mimeType }) => {
  const blob = new Blob([content], { type: mimeType || "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const StudentImportModal = ({ open, onClose, onImported }) => {
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState("dry_run");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const errors = useMemo(() => {
    const rows = result?.errors;
    return Array.isArray(rows) ? rows : [];
  }, [result]);

  const warnings = useMemo(() => {
    const rows = result?.warnings;
    return Array.isArray(rows) ? rows : [];
  }, [result]);

  const preview = useMemo(() => {
    const rows = result?.preview;
    return Array.isArray(rows) ? rows : [];
  }, [result]);

  const handleFileChange = (nextFile) => {
    setError("");
    setResult(null);
    if (!nextFile) {
      setFile(null);
      return;
    }
    const name = nextFile.name.toLowerCase();
    if (!name.endsWith(".csv") && !name.endsWith(".xlsx") && !name.endsWith(".xls")) {
      setError("Please select a .csv, .xlsx, or .xls file.");
      setFile(null);
      return;
    }
    if (nextFile.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB.");
      setFile(null);
      return;
    }
    setFile(nextFile);
  };

  const handleRun = async () => {
    if (!file) {
      setError("Please choose a file first.");
      return;
    }
    setSubmitting(true);
    setError("");
    setResult(null);
    try {
      const payload = await importStudentsFromTemplate({ file, mode });
      setResult(payload);
      if (mode === "import" && onImported) {
        onImported(payload);
      }
    } catch (err) {
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Import failed. Please check the template and try again.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadErrors = () => {
    downloadTextFile({
      filename: "student_import_errors.csv",
      content: buildErrorsCsv(errors),
      mimeType: "text/csv; charset=utf-8",
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-3xl bg-white rounded-lg shadow-xl border border-gray-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Import Students (Template)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-red-800">
              <AlertCircle className="w-5 h-5 mt-0.5" />
              <div className="text-sm">{error}</div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload CSV/XLSX file
              </label>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => handleFileChange(e.target.files?.[0])}
                className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {file && (
                <div className="mt-2 text-xs text-gray-600 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>{file.name}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mode
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    name="importMode"
                    value="dry_run"
                    checked={mode === "dry_run"}
                    onChange={() => setMode("dry_run")}
                  />
                  Dry Run
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    name="importMode"
                    value="import"
                    checked={mode === "import"}
                    onChange={() => setMode("import")}
                  />
                  Import
                </label>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRun}
              disabled={submitting || !file}
              className={`inline-flex items-center px-4 py-2 rounded-lg text-white transition-colors ${
                submitting || !file
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              <Upload className="w-4 h-4 mr-2" />
              {submitting ? "Running..." : mode === "import" ? "Import" : "Dry Run"}
            </button>

            {errors.length > 0 && (
              <button
                onClick={handleDownloadErrors}
                className="inline-flex items-center px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Download Error Report (CSV)
              </button>
            )}
          </div>

          {result?.summary && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-2 text-green-800">
                <CheckCircle className="w-5 h-5 mt-0.5" />
                <div>
                  <div className="font-semibold">Run Summary</div>
                  <div className="mt-1 text-sm grid grid-cols-2 md:grid-cols-5 gap-2">
                    <div>
                      <div className="text-xs text-green-700">Total</div>
                      <div className="font-mono">{result.summary.total ?? 0}</div>
                    </div>
                    <div>
                      <div className="text-xs text-green-700">Created</div>
                      <div className="font-mono">{result.summary.created ?? 0}</div>
                    </div>
                    <div>
                      <div className="text-xs text-green-700">Updated</div>
                      <div className="font-mono">{result.summary.updated ?? 0}</div>
                    </div>
                    <div>
                      <div className="text-xs text-green-700">Skipped</div>
                      <div className="font-mono">{result.summary.skipped ?? 0}</div>
                    </div>
                    <div>
                      <div className="text-xs text-green-700">Failed</div>
                      <div className="font-mono">{result.summary.failed ?? 0}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {warnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="text-amber-900 font-semibold mb-2">Warnings</div>
              <ul className="list-disc pl-5 space-y-1 text-sm text-amber-900">
                {warnings.slice(0, 25).map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
              {warnings.length > 25 && (
                <div className="text-xs text-amber-800 mt-2">
                  Showing first 25 warnings of {warnings.length}.
                </div>
              )}
            </div>
          )}

          {errors.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 font-semibold text-gray-800">
                Errors ({errors.length})
              </div>
              <div className="max-h-64 overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-white sticky top-0">
                    <tr className="text-left text-gray-600">
                      <th className="px-4 py-2">Row</th>
                      <th className="px-4 py-2">Field</th>
                      <th className="px-4 py-2">Message</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {errors.slice(0, 250).map((err, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-mono text-gray-800">
                          {err?.rowNumber ?? "-"}
                        </td>
                        <td className="px-4 py-2 font-mono text-gray-700">
                          {err?.field ?? "-"}
                        </td>
                        <td className="px-4 py-2 text-gray-700">
                          {err?.message ?? "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {errors.length > 250 && (
                <div className="px-4 py-2 text-xs text-gray-500">
                  Showing first 250 errors of {errors.length}.
                </div>
              )}
            </div>
          )}

          {preview.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 font-semibold text-gray-800">
                Preview ({preview.length})
              </div>
              <div className="max-h-64 overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-white sticky top-0">
                    <tr className="text-left text-gray-600">
                      <th className="px-4 py-2">Row</th>
                      <th className="px-4 py-2">Program</th>
                      <th className="px-4 py-2">RollNo</th>
                      <th className="px-4 py-2">Candidate Name</th>
                      <th className="px-4 py-2">Email</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {preview.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-mono text-gray-800">
                          {row?.rowNumber ?? "-"}
                        </td>
                        <td className="px-4 py-2 text-gray-700">
                          {row?.program ?? "-"}
                        </td>
                        <td className="px-4 py-2 font-mono text-gray-700">
                          {row?.rollNo ?? "-"}
                        </td>
                        <td className="px-4 py-2 text-gray-700">
                          {row?.candidateName10th ?? "-"}
                        </td>
                        <td className="px-4 py-2 font-mono text-gray-700">
                          {row?.emailId ?? "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentImportModal;
