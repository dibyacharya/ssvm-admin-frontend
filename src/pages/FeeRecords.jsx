import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Lock,
  CreditCard,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { getFeeRecords, bulkMarkPaid, getProgramsDropdown } from '../services/fee.service';

const STATUS_CONFIG = {
  PAID: { label: 'Paid', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  UNPAID: { label: 'Unpaid', color: 'bg-gray-100 text-gray-700', icon: Clock },
  OVERDUE: { label: 'Overdue', color: 'bg-red-100 text-red-800', icon: AlertTriangle },
  PARTIAL: { label: 'Partial', color: 'bg-amber-100 text-amber-800', icon: CreditCard },
};

const FeeRecords = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [programs, setPrograms] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const [filters, setFilters] = useState({
    program: '',
    status: '',
    periodNumber: '',
    page: 1,
    limit: 20,
  });

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.program) params.program = filters.program;
      if (filters.status) params.status = filters.status;
      if (filters.periodNumber) params.periodNumber = filters.periodNumber;
      params.page = filters.page;
      params.limit = filters.limit;

      const data = await getFeeRecords(params);
      setRecords(data.records || []);
      setPagination(data.pagination || null);
    } catch (err) {
      console.error('Failed to fetch records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const data = await getProgramsDropdown();
        setPrograms(data.programs || data || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchPrograms();
  }, []);

  useEffect(() => {
    fetchRecords();
    setSelectedIds([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const unpaidIds = records.filter((r) => r.status !== 'PAID').map((r) => r._id);
    if (selectedIds.length === unpaidIds.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(unpaidIds);
    }
  };

  const handleBulkMarkPaid = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Mark ${selectedIds.length} records as paid?`)) return;

    setBulkLoading(true);
    try {
      const result = await bulkMarkPaid({ recordIds: selectedIds });
      setToast({ type: 'success', message: `${result.marked} records marked as paid` });
      setSelectedIds([]);
      fetchRecords();
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to mark records' });
    } finally {
      setBulkLoading(false);
    }
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount || 0);

  const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/fees')} className="p-2 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Student Fee Records</h1>
            <p className="text-sm text-gray-500 mt-1">View and manage student payment records</p>
          </div>
        </div>
        {selectedIds.length > 0 && (
          <button
            onClick={handleBulkMarkPaid}
            disabled={bulkLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            {bulkLoading ? 'Processing...' : `Mark ${selectedIds.length} as Paid`}
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center gap-4">
        <Filter className="w-4 h-4 text-gray-500" />
        <select
          value={filters.program}
          onChange={(e) => setFilters((p) => ({ ...p, program: e.target.value, page: 1 }))}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Programs</option>
          {programs.map((p) => (
            <option key={p._id || p.id} value={p._id || p.id}>
              {p.name} ({p.code})
            </option>
          ))}
        </select>
        <select
          value={filters.status}
          onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value, page: 1 }))}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Status</option>
          <option value="PAID">Paid</option>
          <option value="UNPAID">Unpaid</option>
          <option value="OVERDUE">Overdue</option>
          <option value="PARTIAL">Partial</option>
        </select>
        <input
          type="number"
          min="1"
          placeholder="Period #"
          value={filters.periodNumber}
          onChange={(e) => setFilters((p) => ({ ...p, periodNumber: e.target.value, page: 1 }))}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-24 focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    onChange={toggleSelectAll}
                    checked={
                      records.filter((r) => r.status !== 'PAID').length > 0 &&
                      selectedIds.length === records.filter((r) => r.status !== 'PAID').length
                    }
                    className="rounded border-gray-300 text-blue-600"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Program</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Late Fee</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">LMS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                    No fee records found
                  </td>
                </tr>
              ) : (
                records.map((r) => {
                  const statusConf = STATUS_CONFIG[r.status] || STATUS_CONFIG.UNPAID;
                  const StatusIcon = statusConf.icon;
                  return (
                    <tr
                      key={r._id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/fees/records/${r._id}`)}
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        {r.status !== 'PAID' && (
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(r._id)}
                            onChange={() => toggleSelect(r._id)}
                            className="rounded border-gray-300 text-blue-600"
                          />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">
                          {r.student?.user?.name || '-'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {r.student?.rollNumber || r.student?.user?.email || ''}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {r.program?.code || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{r.periodLabel}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {formatCurrency(r.totalAmount)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{formatDate(r.dueDate)}</td>
                      <td className="px-4 py-3 text-sm text-red-600 font-medium">
                        {r.lateFeeAmount > 0 ? formatCurrency(r.lateFeeAmount) : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConf.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusConf.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {r.isLmsLocked && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            <Lock className="w-3 h-3" />
                            Locked
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <span className="text-sm text-gray-700">
              Page {pagination.page} of {pagination.pages} ({pagination.total} records)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setFilters((p) => ({ ...p, page: p.page - 1 }))}
                disabled={pagination.page <= 1}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setFilters((p) => ({ ...p, page: p.page + 1 }))}
                disabled={pagination.page >= pagination.pages}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 z-50 rounded-lg border px-4 py-3 text-sm shadow-lg ${
            toast.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default FeeRecords;
