import React, { useEffect, useMemo, useState } from "react";
import { Upload, X, AlertCircle, CheckCircle, FileText } from "lucide-react";
import {
  downloadStudentProfileTemplate,
  importStudentsFromTemplate,
  importFromExtraaedgeCrm,
  pullFromExtraaedgeCrm,
} from "../../services/studentImport.service";
import { getProgramsDropdown } from "../../services/program.service";
import { getBatchesByProgram } from "../../services/batch.service";
import {
  MODE_OF_DELIVERY,
  MODE_OF_DELIVERY_OPTIONS,
  normalizeModeOfDeliveryValue,
} from "../../constants/modeOfDelivery";

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

const formatCrmDate = (value) => {
  if (!value) return "";
  const normalized = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return `${normalized} 00:00:00`;
  }
  return normalized;
};

const normalizeCrmKey = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const toCrmMap = (record = {}) => {
  const map = new Map();
  if (!record || typeof record !== "object" || Array.isArray(record)) return map;
  Object.keys(record).forEach((key) => {
    const normalized = normalizeCrmKey(key);
    if (!normalized || map.has(normalized)) return;
    map.set(normalized, record[key]);
  });
  return map;
};

const pickCrmValue = (recordMap, keys = []) => {
  for (const key of keys) {
    const value = String(recordMap.get(key) ?? "").trim();
    if (value) return value;
  }
  return "";
};

const extractCrmPreviewRow = (record = {}) => {
  const map = toCrmMap(record);
  return {
    externalId: pickCrmValue(map, [
      "applicationformnumber",
      "applicationformno",
      "applicationnumber",
      "formnumber",
      "applicantid",
      "leadid",
      "rollno",
      "rollnumber",
    ]),
    candidateName: pickCrmValue(map, [
      "nameofthecandidateasinthe10thcertificate",
      "applicantfullnameasmentionedonaadharcard",
      "applicantfullname",
      "fullname",
      "name",
    ]),
    email: pickCrmValue(map, ["emailid", "email", "emailaddress", "kiitmailid", "personalemailid"]),
    rollNumber: pickCrmValue(map, ["rollno", "rollnumber", "studentrollnumber"]),
    enrollmentNumber: pickCrmValue(map, [
      "enrollmentnumber",
      "enrolmentnumber",
      "enrollmentno",
      "enrolmentno",
    ]),
  };
};

const verifyCrmRow = (record = {}, rowNumber = 0) => {
  const extracted = extractCrmPreviewRow(record);
  const errors = [];
  if (!extracted.externalId) {
    errors.push({
      rowNumber,
      field: "externalId",
      message: "Application Form Number (externalId) is required",
    });
  }
  if (!extracted.email) {
    errors.push({
      rowNumber,
      field: "email",
      message:
        "Email is missing. Approval may fail if no existing student/user is found for this row.",
    });
  }
  return { extracted, errors };
};

const StudentImportModal = ({
  open,
  onClose,
  onImported,
  variant = "regular_bulk",
  studentMode = "regular",
}) => {
  const normalizedVariant = variant === "online_crm" ? "online_crm" : "regular_bulk";
  const supportsBulkImport = normalizedVariant === "regular_bulk";
  const supportsCrmImport = normalizedVariant === "online_crm";
  const initialStudentModeFromProp =
    normalizeModeOfDeliveryValue(studentMode) || MODE_OF_DELIVERY.REGULAR;
  const initialBulkMode =
    initialStudentModeFromProp === MODE_OF_DELIVERY.ONLINE
      ? MODE_OF_DELIVERY.REGULAR
      : initialStudentModeFromProp;
  const bulkModeOptions = useMemo(
    () =>
      MODE_OF_DELIVERY_OPTIONS.filter(
        (option) => option.value !== MODE_OF_DELIVERY.ONLINE
      ),
    []
  );

  const [file, setFile] = useState(null);
  const [bulkStudentMode, setBulkStudentMode] = useState(initialBulkMode);
  const [mode, setMode] = useState("dry_run");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [unknownColumns, setUnknownColumns] = useState([]);
  const [result, setResult] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [batches, setBatches] = useState([]);
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [crmDate, setCrmDate] = useState("");
  const [pullingCrm, setPullingCrm] = useState(false);
  const [crmPullError, setCrmPullError] = useState("");
  const [crmPullResult, setCrmPullResult] = useState(null);
  const [crmImporting, setCrmImporting] = useState(false);
  const [crmImportError, setCrmImportError] = useState("");
  const [crmImportResult, setCrmImportResult] = useState(null);
  const [selectedCrmRows, setSelectedCrmRows] = useState([]);
  const [crmSessionCode, setCrmSessionCode] = useState("SP");
  const [crmAdmissionYear, setCrmAdmissionYear] = useState("");
  const [templateDownloading, setTemplateDownloading] = useState(false);
  const [templateDownloadError, setTemplateDownloadError] = useState("");
  const normalizedStudentMode = supportsCrmImport
    ? MODE_OF_DELIVERY.ONLINE
    : normalizeModeOfDeliveryValue(bulkStudentMode) || initialBulkMode;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const loadPrograms = async () => {
      setLoadingPrograms(true);
      try {
        const response = await getProgramsDropdown();
        if (!cancelled) {
          setPrograms(Array.isArray(response) ? response : []);
        }
      } catch (_err) {
        if (!cancelled) {
          setPrograms([]);
          setError("Failed to load programs. Please refresh and try again.");
        }
      } finally {
        if (!cancelled) {
          setLoadingPrograms(false);
        }
      }
    };
    loadPrograms();
    return () => {
      cancelled = true;
    };
  }, [open, initialStudentModeFromProp]);

  useEffect(() => {
    if (!open) return;
    const now = new Date();
    const y = now.getFullYear();
    const m = `${now.getMonth() + 1}`.padStart(2, "0");
    const d = `${now.getDate()}`.padStart(2, "0");
    const inferredSessionCode = now.getMonth() + 1 <= 6 ? "SP" : "AU";
    setFile(null);
    setMode("dry_run");
    setError("");
    setResult(null);
    setSelectedProgramId("");
    setSelectedBatchId("");
    setCrmDate(`${y}-${m}-${d} 00:00:00`);
    setCrmSessionCode(inferredSessionCode);
    setCrmAdmissionYear(String(y));
    setCrmPullError("");
    setCrmPullResult(null);
    setCrmImportError("");
    setCrmImportResult(null);
    setSelectedCrmRows([]);
    setTemplateDownloadError("");
    setUnknownColumns([]);
    setBulkStudentMode(initialBulkMode);
  }, [open]);

  useEffect(() => {
    if (!open || supportsCrmImport) return;
    setBulkStudentMode(initialBulkMode);
  }, [open, supportsCrmImport, initialBulkMode]);

  useEffect(() => {
    if (!selectedProgramId) {
      setBatches([]);
      setSelectedBatchId("");
      return;
    }
    let cancelled = false;
    const loadBatches = async () => {
      setLoadingBatches(true);
      try {
        const response = await getBatchesByProgram(selectedProgramId);
        if (!cancelled) {
          const rows = Array.isArray(response?.batches) ? response.batches : [];
          setBatches(rows);
        }
      } catch (_err) {
        if (!cancelled) {
          setBatches([]);
          setSelectedBatchId("");
          setError("Failed to load batches for the selected program.");
        }
      } finally {
        if (!cancelled) {
          setLoadingBatches(false);
        }
      }
    };
    loadBatches();
    return () => {
      cancelled = true;
    };
  }, [selectedProgramId]);

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

  const crmItems = useMemo(() => {
    const rows = crmPullResult?.items;
    return Array.isArray(rows) ? rows : [];
  }, [crmPullResult]);

  const crmColumns = useMemo(() => {
    const rows = crmItems.slice(0, 20);
    const keys = new Set();
    rows.forEach((row) => {
      if (!row || typeof row !== "object") return;
      Object.keys(row).forEach((key) => {
        if (keys.size < 10) keys.add(key);
      });
    });
    return Array.from(keys);
  }, [crmItems]);

  const filteredPrograms = useMemo(() => {
    return programs.filter((program) => {
      const modeValue =
        normalizeModeOfDeliveryValue(program?.modeOfDelivery) ||
        MODE_OF_DELIVERY.REGULAR;
      return modeValue === normalizedStudentMode;
    });
  }, [programs, normalizedStudentMode]);

  useEffect(() => {
    if (!selectedProgramId) return;
    const isStillVisible = filteredPrograms.some(
      (program) => String(program?._id) === String(selectedProgramId)
    );
    if (!isStillVisible) {
      setSelectedProgramId("");
      setSelectedBatchId("");
    }
  }, [filteredPrograms, selectedProgramId]);

  useEffect(() => {
    setSelectedCrmRows((prev) =>
      prev.filter((rowIndex) => Number.isInteger(rowIndex) && rowIndex >= 0 && rowIndex < crmItems.length)
    );
  }, [crmItems]);

  const selectedCrmItems = useMemo(
    () =>
      selectedCrmRows
        .map((rowIndex) => crmItems[rowIndex])
        .filter(Boolean),
    [crmItems, selectedCrmRows]
  );

  const crmVerification = useMemo(() => {
    const verifiedRows = selectedCrmRows
      .map((rowIndex) => {
        const rowNumber = rowIndex + 1;
        const item = crmItems[rowIndex];
        if (!item) return null;
        const verified = verifyCrmRow(item, rowNumber);
        return {
          rowNumber,
          rowIndex,
          ...verified,
        };
      })
      .filter(Boolean);
    const errors = verifiedRows.flatMap((row) => row.errors || []);
    return { rows: verifiedRows, errors };
  }, [crmItems, selectedCrmRows]);

  const crmImportErrors = useMemo(() => {
    const rows = crmImportResult?.errors;
    return Array.isArray(rows) ? rows : [];
  }, [crmImportResult]);

  const allCrmRowsSelected =
    crmItems.length > 0 && selectedCrmRows.length === crmItems.length;

  const toggleAllCrmRows = () => {
    if (allCrmRowsSelected) {
      setSelectedCrmRows([]);
      return;
    }
    setSelectedCrmRows(crmItems.map((_, index) => index));
  };

  const toggleCrmRow = (rowIndex) => {
    setSelectedCrmRows((prev) =>
      prev.includes(rowIndex)
        ? prev.filter((value) => value !== rowIndex)
        : [...prev, rowIndex]
    );
  };

  const handleFileChange = (nextFile) => {
    setError("");
    setUnknownColumns([]);
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
    if (!supportsBulkImport) {
      return;
    }
    if (!file) {
      setError("Please choose a file first.");
      return;
    }
    if (!selectedProgramId) {
      setError("Please select a program.");
      return;
    }
    if (!selectedBatchId) {
      setError("Please select a batch.");
      return;
    }
    setSubmitting(true);
    setError("");
    setUnknownColumns([]);
    setResult(null);
    try {
      const payload = await importStudentsFromTemplate({
        file,
        mode,
        programId: selectedProgramId,
        batchId: selectedBatchId,
        studentType: "regular",
        studentMode: normalizedStudentMode,
      });
      setResult(payload);
      if (mode === "import" && onImported) {
        onImported(payload);
      }
    } catch (err) {
      const unknownCols = Array.isArray(err?.response?.data?.unknownColumns)
        ? err.response.data.unknownColumns
        : [];
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        (unknownCols.length > 0
          ? "Unknown column(s) found in template upload."
          : "") ||
        err?.message ||
        "Import failed. Please check the template and try again.";
      setUnknownColumns(unknownCols);
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

  const handleDownloadTemplate = async (format) => {
    setTemplateDownloadError("");
    setTemplateDownloading(true);
    try {
      const response = await downloadStudentProfileTemplate(format);
      const blob = response?.data instanceof Blob ? response.data : new Blob([response?.data || ""]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `student_profile_template.${format === "xlsx" ? "xlsx" : "csv"}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to download template.";
      setTemplateDownloadError(message);
    } finally {
      setTemplateDownloading(false);
    }
  };

  const handlePullFromCrm = async () => {
    if (!supportsCrmImport) {
      return;
    }
    if (!selectedProgramId) {
      setCrmPullError("Please select a program before pulling CRM data.");
      return;
    }
    if (!selectedBatchId) {
      setCrmPullError("Please select a batch before pulling CRM data.");
      return;
    }
    const normalizedDate = formatCrmDate(crmDate);
    if (!normalizedDate) {
      setCrmPullError("Please provide a valid date.");
      return;
    }

    setPullingCrm(true);
    setCrmPullError("");
    setCrmPullResult(null);
    setCrmImportError("");
    setCrmImportResult(null);
    setSelectedCrmRows([]);
    try {
      const payload = await pullFromExtraaedgeCrm(normalizedDate);
      setCrmPullResult(payload);
      const pulledItems = Array.isArray(payload?.items) ? payload.items : [];
      setSelectedCrmRows(pulledItems.map((_, index) => index));
    } catch (err) {
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to pull CRM data.";
      setCrmPullError(message);
    } finally {
      setPullingCrm(false);
    }
  };

  const handleImportCrm = async () => {
    if (!supportsCrmImport) {
      return;
    }
    if (!selectedProgramId) {
      setCrmImportError("Please select a program before importing CRM data.");
      return;
    }
    if (!selectedBatchId) {
      setCrmImportError("Please select a batch before importing CRM data.");
      return;
    }
    const normalizedDate = formatCrmDate(crmDate);
    if (!normalizedDate) {
      setCrmImportError("Please provide a valid CRM date.");
      return;
    }
    const normalizedSessionCode = String(crmSessionCode || "")
      .trim()
      .toUpperCase();
    if (!["AU", "SP"].includes(normalizedSessionCode)) {
      setCrmImportError("Session code is required (AU or SP).");
      return;
    }
    const admissionYearNumber = Number.parseInt(String(crmAdmissionYear || ""), 10);
    if (!Number.isInteger(admissionYearNumber) || admissionYearNumber < 1900 || admissionYearNumber > 2100) {
      setCrmImportError("Admission year is required and must be a valid 4-digit year.");
      return;
    }

    const itemsToImport = selectedCrmItems;
    if (!Array.isArray(itemsToImport) || itemsToImport.length === 0) {
      setCrmImportError("Select at least one CRM row to approve.");
      return;
    }
    if (crmVerification.errors.length > 0) {
      setCrmImportError("Fix verification errors before approving CRM rows.");
      return;
    }

    setCrmImporting(true);
    setCrmImportError("");
    setCrmImportResult(null);

    try {
      const payload = await importFromExtraaedgeCrm({
        requestedDate: normalizedDate,
        items: itemsToImport,
        programId: selectedProgramId,
        batchId: selectedBatchId,
        admissionYear: admissionYearNumber,
        sessionCode: normalizedSessionCode,
      });
      setCrmImportResult(payload);
      if (onImported) {
        onImported(payload);
      }
    } catch (err) {
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to approve CRM data.";
      setCrmImportError(message);
    } finally {
      setCrmImporting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-xl border border-gray-200 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              {supportsBulkImport
                ? `Bulk Import Students (${normalizedStudentMode})`
                : "Online Students: CRM Pull"}
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

        <div className="p-6 space-y-5 overflow-y-auto min-h-0">
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-red-800">
              <AlertCircle className="w-5 h-5 mt-0.5" />
              <div className="text-sm">
                <div>{error}</div>
                {unknownColumns.length > 0 && (
                  <div className="mt-2">
                    <div className="font-semibold">Unknown columns:</div>
                    <ul className="list-disc pl-5 mt-1 space-y-0.5">
                      {unknownColumns.map((column) => (
                        <li key={column}>
                          <code>{column}</code>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {supportsBulkImport && (
            <>
              <div className="rounded-lg border border-gray-200 p-4 space-y-2">
                <div className="text-sm font-medium text-gray-800">
                  Download Template
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownloadTemplate("csv")}
                    disabled={templateDownloading}
                    className={`inline-flex items-center rounded-lg px-3 py-2 text-sm text-gray-700 border border-gray-300 ${
                      templateDownloading ? "opacity-60 cursor-not-allowed" : "hover:bg-gray-50"
                    }`}
                  >
                    Download CSV Template
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadTemplate("xlsx")}
                    disabled={templateDownloading}
                    className={`inline-flex items-center rounded-lg px-3 py-2 text-sm text-gray-700 border border-gray-300 ${
                      templateDownloading ? "opacity-60 cursor-not-allowed" : "hover:bg-gray-50"
                    }`}
                  >
                    Download XLSX Template
                  </button>
                </div>
                {templateDownloadError && (
                  <div className="text-xs text-red-600">{templateDownloadError}</div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Student Mode
                </label>
                <select
                  value={bulkStudentMode}
                  onChange={(e) => {
                    setBulkStudentMode(e.target.value);
                    setSelectedProgramId("");
                    setSelectedBatchId("");
                    setError("");
                    setResult(null);
                  }}
                  disabled={submitting}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                >
                  {bulkModeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

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
                    Program <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={selectedProgramId}
                    onChange={(e) => {
                      setSelectedProgramId(e.target.value);
                      setSelectedBatchId("");
                      setError("");
                      setResult(null);
                    }}
                    disabled={loadingPrograms || submitting}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  >
                    <option value="">Select Program ({normalizedStudentMode})</option>
                    {filteredPrograms.map((program) => (
                      <option key={program._id} value={program._id}>
                        {program.code ? `${program.code} - ${program.name}` : program.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Batch <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={selectedBatchId}
                    onChange={(e) => {
                      setSelectedBatchId(e.target.value);
                      setError("");
                      setResult(null);
                    }}
                    disabled={!selectedProgramId || loadingBatches || submitting}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  >
                    <option value="">
                      {!selectedProgramId
                        ? "Select Program first"
                        : loadingBatches
                        ? "Loading batches..."
                        : "Select Batch"}
                    </option>
                    {batches.map((batch) => (
                      <option key={batch._id} value={batch._id}>
                        {batch.name || `Batch ${batch.year || ""}`.trim()}
                      </option>
                    ))}
                  </select>
                  {selectedProgramId && !loadingBatches && batches.length === 0 && (
                    <p className="mt-1 text-xs text-amber-700">
                      No active batches found for the selected program.
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Run Mode
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
                  disabled={
                    submitting ||
                    !file ||
                    !selectedProgramId ||
                    !selectedBatchId ||
                    loadingPrograms ||
                    loadingBatches
                  }
                  className={`inline-flex items-center px-4 py-2 rounded-lg text-white transition-colors ${
                    submitting ||
                    !file ||
                    !selectedProgramId ||
                    !selectedBatchId ||
                    loadingPrograms ||
                    loadingBatches
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
            </>
          )}

          {supportsCrmImport && (
            <div className="rounded-lg border border-gray-200 p-4 space-y-4">
              <div className="text-sm font-medium text-gray-800">
                Online Intake Parameters
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Program <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={selectedProgramId}
                    onChange={(e) => {
                      setSelectedProgramId(e.target.value);
                      setSelectedBatchId("");
                      setCrmPullError("");
                      setCrmImportError("");
                    }}
                    disabled={loadingPrograms || pullingCrm || crmImporting}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  >
                    <option value="">Select Program (ONLINE)</option>
                    {filteredPrograms.map((program) => (
                      <option key={program._id} value={program._id}>
                        {program.code ? `${program.code} - ${program.name}` : program.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Batch <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={selectedBatchId}
                    onChange={(e) => {
                      setSelectedBatchId(e.target.value);
                      setCrmPullError("");
                      setCrmImportError("");
                    }}
                    disabled={!selectedProgramId || loadingBatches || pullingCrm || crmImporting}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  >
                    <option value="">
                      {!selectedProgramId
                        ? "Select Program first"
                        : loadingBatches
                        ? "Loading batches..."
                        : "Select Batch"}
                    </option>
                    {batches.map((batch) => (
                      <option key={batch._id} value={batch._id}>
                        {batch.name || `Batch ${batch.year || ""}`.trim()}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Session Code <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={crmSessionCode}
                    onChange={(e) => setCrmSessionCode(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="SP">SP (Spring)</option>
                    <option value="AU">AU (Autumn)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Admission Year <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="number"
                    min="1900"
                    max="2100"
                    value={crmAdmissionYear}
                    onChange={(e) => setCrmAdmissionYear(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}

          {supportsCrmImport && (
            <div className="rounded-lg border border-gray-200 p-4 space-y-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[220px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CRM Date
                </label>
                <input
                  type="text"
                  value={crmDate}
                  onChange={(e) => {
                    setCrmDate(e.target.value);
                    setCrmPullError("");
                  }}
                  placeholder="YYYY-MM-DD 00:00:00"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                type="button"
                onClick={handlePullFromCrm}
                disabled={pullingCrm}
                className={`inline-flex items-center px-4 py-2 rounded-lg text-white transition-colors ${
                  pullingCrm
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                <Upload className="w-4 h-4 mr-2" />
                {pullingCrm ? "Pulling..." : "Pull from CRM"}
              </button>
            </div>

            {crmPullError && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
                {crmPullError}
              </div>
            )}

            {crmPullResult?.counts && (
              <div className="text-sm text-gray-700">
                <span className="font-semibold">CRM Pull:</span>{" "}
                total {crmPullResult.counts.total ?? 0}, parsed{" "}
                {crmPullResult.counts.parsed ?? 0}, parse errors{" "}
                {crmPullResult.counts.parseErrors ?? 0}
              </div>
            )}

            {crmItems.length > 0 && crmColumns.length > 0 && (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 text-sm font-semibold text-gray-800">
                  Verification Preview ({Math.min(crmItems.length, 25)} of {crmItems.length})
                </div>
                <div className="px-3 py-2 flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-white">
                  <label className="inline-flex items-center gap-2 text-xs text-gray-700">
                    <input
                      type="checkbox"
                      checked={allCrmRowsSelected}
                      onChange={toggleAllCrmRows}
                    />
                    Select all rows ({selectedCrmRows.length}/{crmItems.length})
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleImportCrm}
                      disabled={
                        crmImporting ||
                        selectedCrmItems.length === 0 ||
                        crmVerification.errors.length > 0
                      }
                      className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium text-white ${
                        crmImporting ||
                        selectedCrmItems.length === 0 ||
                        crmVerification.errors.length > 0
                          ? "bg-gray-400 cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-700"
                      }`}
                    >
                      {crmImporting ? "Approving..." : "Approve & Create Users"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCrmPullResult(null);
                        setSelectedCrmRows([]);
                        setCrmImportError("");
                        setCrmImportResult(null);
                      }}
                      disabled={crmImporting}
                      className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
                <div className="max-h-64 overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-white sticky top-0">
                      <tr className="text-left text-gray-600">
                        <th className="px-3 py-2 whitespace-nowrap">Select</th>
                        {crmColumns.map((column) => (
                          <th key={column} className="px-3 py-2 whitespace-nowrap">
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {crmItems.slice(0, 25).map((item, rowIdx) => (
                        <tr key={`crm-${rowIdx}`} className="hover:bg-gray-50">
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={selectedCrmRows.includes(rowIdx)}
                              onChange={() => toggleCrmRow(rowIdx)}
                            />
                          </td>
                          {crmColumns.map((column) => (
                            <td key={`${rowIdx}-${column}`} className="px-3 py-2 text-gray-700">
                              {String(item?.[column] ?? "-")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {selectedCrmRows.length > 0 && (
              <div className="rounded-lg border border-gray-200 p-3">
                <div className="text-sm font-semibold text-gray-800 mb-2">Verification Result</div>
                <div className="text-xs text-gray-600">
                  Selected rows: {selectedCrmRows.length} | Validation errors:{" "}
                  {crmVerification.errors.length}
                </div>
              </div>
            )}

            {crmVerification.errors.length > 0 && (
              <div className="border border-red-200 rounded-lg overflow-hidden">
                <div className="px-3 py-2 bg-red-50 border-b border-red-200 text-sm font-semibold text-red-800">
                  Verification Errors
                </div>
                <div className="max-h-48 overflow-auto">
                  <table className="min-w-full text-xs">
                    <thead className="bg-white sticky top-0">
                      <tr className="text-left text-gray-600">
                        <th className="px-3 py-2">Row</th>
                        <th className="px-3 py-2">Field</th>
                        <th className="px-3 py-2">Message</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {crmVerification.errors.map((item, index) => (
                        <tr key={`crm-verify-error-${index}`}>
                          <td className="px-3 py-2">{item.rowNumber}</td>
                          <td className="px-3 py-2">{item.field}</td>
                          <td className="px-3 py-2">{item.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {crmImportError && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
                {crmImportError}
              </div>
            )}

            {crmImportResult?.counts && (
              <div className="text-sm text-gray-700 bg-emerald-50 border border-emerald-200 rounded p-2">
                <span className="font-semibold">CRM Approve:</span>{" "}
                created {crmImportResult.counts.created ?? 0}, updated{" "}
                {crmImportResult.counts.updated ?? 0}, failed{" "}
                {crmImportResult.counts.failed ?? 0}
              </div>
            )}
            {crmImportErrors.length > 0 && (
              <div className="border border-red-200 rounded-lg overflow-hidden">
                <div className="px-3 py-2 bg-red-50 border-b border-red-200 text-sm font-semibold text-red-800">
                  Approval Errors
                </div>
                <div className="max-h-48 overflow-auto">
                  <table className="min-w-full text-xs">
                    <thead className="bg-white sticky top-0">
                      <tr className="text-left text-gray-600">
                        <th className="px-3 py-2">Row</th>
                        <th className="px-3 py-2">Field</th>
                        <th className="px-3 py-2">Message</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {crmImportErrors.map((item, index) => (
                        <tr key={`crm-import-error-${index}`}>
                          <td className="px-3 py-2">{item.rowNumber ?? "-"}</td>
                          <td className="px-3 py-2">{item.field || "-"}</td>
                          <td className="px-3 py-2">{item.message || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            </div>
          )}

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

          {result?.summary && (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 font-semibold text-gray-800 flex items-center justify-between gap-2">
                <span>Errors ({errors.length})</span>
                {errors.length > 0 && (
                  <button
                    onClick={handleDownloadErrors}
                    className="inline-flex items-center px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Download Errors CSV
                  </button>
                )}
              </div>
              {errors.length === 0 ? (
                <div className="px-4 py-3 text-sm text-green-700">
                  No row-wise errors found in this run.
                </div>
              ) : (
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
              )}
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
