import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  Filter,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { listAmendments } from '../services/courseAmendment.service';
import { getAllPrograms } from '../services/program.service';

const STATUS_COLORS = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  REJECTED: 'bg-red-100 text-red-800',
  PARTIALLY_APPLIED: 'bg-orange-100 text-orange-800',
  FULLY_APPLIED: 'bg-green-100 text-green-800',
  REVERTED: 'bg-purple-100 text-purple-800',
};

const STATUS_LABELS = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Pending Approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  PARTIALLY_APPLIED: 'Partially Applied',
  FULLY_APPLIED: 'Fully Applied',
  REVERTED: 'Reverted',
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

const CourseAmendments = () => {
  const navigate = useNavigate();
  const [amendments, setAmendments] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [programs, setPrograms] = useState([]);

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterProgram, setFilterProgram] = useState('');

  const fetchAmendments = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterProgram) params.program = filterProgram;
      const data = await listAmendments(params);
      setAmendments(data.amendments || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Failed to load amendments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getAllPrograms()
      .then((res) => setPrograms(res.programs || res || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchAmendments();
  }, [filterStatus, filterProgram]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Course Amendments</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage course changes across program batches
          </p>
        </div>
        <button
          onClick={() => navigate('/course-amendments/new')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Amendment
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Statuses</option>
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <select
          value={filterProgram}
          onChange={(e) => setFilterProgram(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">All Programs</option>
          {programs.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name} {p.code ? `(${p.code})` : ''}
            </option>
          ))}
        </select>
        <button
          onClick={fetchAmendments}
          className="inline-flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
        <span className="text-sm text-gray-500">
          {total} amendment{total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          <span className="ml-2 text-sm text-gray-500">Loading amendments...</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && amendments.length === 0 && (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No amendments found</p>
          <button
            onClick={() => navigate('/course-amendments/new')}
            className="mt-3 inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Create your first amendment
          </button>
        </div>
      )}

      {/* Table */}
      {!loading && amendments.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amendment ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Program
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Scope
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Changes
                  </th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {amendments.map((amd) => (
                  <tr
                    key={amd._id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/course-amendments/${amd._id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600">
                      {amd.amendmentId || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {amd.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {amd.program?.name || '-'}
                      {amd.program?.code ? (
                        <span className="ml-1 text-gray-400">({amd.program.code})</span>
                      ) : null}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {amd.scope === 'CURRENT_AND_FUTURE'
                        ? 'Current + Future'
                        : 'Future Only'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          STATUS_COLORS[amd.status] || 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {STATUS_LABELS[amd.status] || amd.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(amd.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {amd.changes?.length || 0} change
                      {(amd.changes?.length || 0) !== 1 ? 's' : ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseAmendments;
