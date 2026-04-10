import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  Edit,
  Trash2,
  Plus,
} from 'lucide-react';
import {
  getAllBatches,
  deleteBatch
} from '../services/batch.service';
import { getProgramsDropdown } from '../services/program.service';

const statusColors = {
  upcoming: 'bg-[rgba(249,115,22,0.15)] text-[#FB923C]',
  ongoing: 'bg-[rgba(5,150,105,0.1)] text-[#10B981]',
  completed: 'bg-white text-[#1E293B]',
  active: 'bg-[rgba(5,150,105,0.1)] text-[#10B981]',
  graduated: 'bg-white text-[#1E293B]',
  archived: 'bg-white text-[#1E293B]'
};

const normalizeStatus = (status) => {
  if (!status) return 'upcoming';
  if (status === 'active') return 'ongoing';
  if (status === 'graduated') return 'completed';
  return status;
};

const BatchManagement = () => {
  const navigate = useNavigate();
  const [batches, setBatches] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterProgram, setFilterProgram] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  const itemsPerPage = 10;

  useEffect(() => {
    fetchPrograms();
  }, []);

  useEffect(() => {
    fetchBatches();
  }, [currentPage, filterProgram, filterStatus]);

  const fetchPrograms = async () => {
    try {
      const data = await getProgramsDropdown();
      setPrograms(data || []);
    } catch (err) {
      console.error('Error fetching programs dropdown:', err);
    }
  };

  const fetchBatches = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = { page: currentPage, limit: itemsPerPage };
      if (filterProgram !== 'all') params.program = filterProgram;
      if (filterStatus !== 'all') params.status = filterStatus;
      const data = await getAllBatches(params);
      setBatches(data.batches || []);
      setPagination(data.pagination || null);
    } catch (err) {
      setError('Failed to fetch batches');
      console.error('Error fetching batches:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (batch) => {
    if (!window.confirm(`Are you sure you want to delete batch "${batch.name}"?`)) return;
    try {
      setError(null);
      await deleteBatch(batch._id);
      await fetchBatches();
    } catch (err) {
      const errData = err.response?.data;
      const msg = errData?.error || 'Failed to delete batch';
      const hint = errData?.hint ? ` ${errData.hint}` : '';
      setError(`${msg}${hint}`);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const totalPages = pagination?.pages || 1;

  if (loading && batches.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg border border-[rgba(0,0,0,0.08)] p-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F97316] mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-[#1E293B] mb-2">Loading Batches</h2>
            <p className="text-[#94A3B8]">Please wait...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-[rgba(0,0,0,0.08)] p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-[#1E293B] flex items-center">
              <Layers className="w-8 h-8 text-[#F97316] mr-3" />
              Batch Management
            </h1>
            <p className="text-[#94A3B8] mt-1">
              Manage batches for your programs.
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => navigate('/batches/new')}
              className="flex items-center px-4 py-2 bg-[#F97316] text-white rounded-lg hover:bg-[#EA580C] transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Batch
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <select
            value={filterProgram}
            onChange={(e) => { setFilterProgram(e.target.value); setCurrentPage(1); }}
            className="px-4 py-2 border border-[rgba(0,0,0,0.08)] rounded-lg bg-white text-[#1E293B] focus:ring-2 focus:ring-[#F97316] focus:border-[#F97316]"
          >
            <option value="all">All Programs</option>
            {programs.map(p => (
              <option key={p._id} value={p._id}>{p.name} ({p.code})</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
            className="px-4 py-2 border border-[rgba(0,0,0,0.08)] rounded-lg bg-white text-[#1E293B] focus:ring-2 focus:ring-[#F97316] focus:border-[#F97316]"
          >
            <option value="all">All Status</option>
            <option value="upcoming">Upcoming</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
          </select>
          <select
            value={filterMonth}
            onChange={(e) => { setFilterMonth(e.target.value); setCurrentPage(1); }}
            className="px-4 py-2 border border-[rgba(0,0,0,0.08)] rounded-lg bg-white text-[#1E293B] focus:ring-2 focus:ring-[#F97316] focus:border-[#F97316]"
          >
            <option value="all">All Months</option>
            {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => (
              <option key={m} value={i}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-[rgba(220,38,38,0.08)] border border-[rgba(239,68,68,0.2)] rounded-lg p-4">
          <p className="text-[#EF4444]">{error}</p>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border border-[rgba(0,0,0,0.08)] overflow-hidden">
        <div className="px-6 py-3 bg-white border-b border-[rgba(0,0,0,0.08)]">
          <span className="text-sm font-medium text-[#94A3B8]">
            {pagination?.total || batches.length} batches
          </span>
        </div>

        <div className="divide-y divide-[rgba(255,255,255,0.06)]">
          {/* Table Header */}
          <div className="px-6 py-3 bg-white grid grid-cols-8 gap-4 text-xs font-medium text-[#94A3B8] uppercase tracking-wider">
            <div className="col-span-2">Batch Name</div>
            <div>Program</div>
            <div>Year</div>
            <div>Start Date</div>
            <div>End Date</div>
            <div>Status</div>
            <div>Actions</div>
          </div>

          {batches.map((batch) => (
            <div
              key={batch._id}
              onClick={() => navigate(`/batch-detail/${batch._id}`)}
              className="px-6 py-4 hover:bg-white grid grid-cols-8 gap-4 items-center cursor-pointer"
            >
              <div className="col-span-2">
                <div className="text-sm font-medium text-[#1E293B]">{batch.name}</div>
                {batch.maxStrength > 0 && (
                  <div className="text-xs text-[#94A3B8]">Max: {batch.maxStrength} students</div>
                )}
              </div>
              <div className="text-sm text-[#94A3B8]">
                {batch.program?.code || batch.program?.name || '-'}
              </div>
              <div className="text-sm text-[#94A3B8]">{batch.year}</div>
              <div className="text-sm text-[#94A3B8]">{formatDate(batch.startDate)}</div>
              <div className="text-sm text-[#94A3B8]">{formatDate(batch.expectedEndDate)}</div>
              <div>
                {(() => {
                  const displayStatus = normalizeStatus(batch.status);
                  return (
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      statusColors[displayStatus] || 'bg-white text-[#1E293B]'
                    }`}>
                      {displayStatus}
                    </span>
                  );
                })()}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/batches/${batch._id}/edit`);
                  }}
                  className="p-1 text-[#94A3B8] hover:text-[#F97316]"
                  title="Edit"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(batch);
                  }}
                  className="p-1 text-[#94A3B8] hover:text-[#EF4444]"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {batches.length === 0 && !loading && (
          <div className="text-center py-12">
            <Layers className="w-16 h-16 text-[#94A3B8] mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-[#1E293B] mb-2">No Batches Found</h2>
            <p className="text-[#94A3B8] mb-4">Click "Add Batch" to create one.</p>
            <button
              onClick={() => navigate('/batches/new')}
              className="inline-flex items-center px-4 py-2 bg-[#F97316] text-white rounded-lg hover:bg-[#EA580C] transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Batch
            </button>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-3 bg-white border-t border-[rgba(0,0,0,0.08)]">
            <div className="flex items-center justify-between">
              <div className="text-sm text-[#94A3B8]">
                Page {currentPage} of {totalPages} ({pagination?.total || 0} total)
              </div>
              <div className="flex items-center space-x-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                  className="px-3 py-1 text-sm text-[#94A3B8] bg-white border border-[rgba(0,0,0,0.08)] rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 text-sm rounded-lg ${
                      currentPage === page
                        ? 'text-white bg-[#F97316]'
                        : 'text-[#94A3B8] bg-white border border-[rgba(0,0,0,0.08)] hover:bg-white'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                  className="px-3 py-1 text-sm text-[#94A3B8] bg-white border border-[rgba(0,0,0,0.08)] rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BatchManagement;
