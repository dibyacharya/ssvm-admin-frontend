import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Search,
  Trash2,
  Plus,
  Edit,
} from 'lucide-react';
import {
  getAllPrograms,
  deleteProgram,
} from '../services/program.service';
import {
  getModeOfDeliveryLabel,
  normalizeModeOfDeliveryValue,
} from '../constants/modeOfDelivery';
import { getPeriodLabel } from '../utils/periodLabel';

const ProgramManagement = () => {
  const navigate = useNavigate();
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSchool, setFilterSchool] = useState('all');
  const [filterMode, setFilterMode] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  const itemsPerPage = 10;

  const fetchPrograms = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = { page: currentPage, limit: itemsPerPage };
      // Default: show only active programs (hides draft/wizard-in-progress)
      // When user selects "all" or "inactive", respect that choice
      if (filterStatus === 'all') params.isActive = true;
      else if (filterStatus !== 'all') params.isActive = filterStatus === 'active';
      if (filterSchool !== 'all') params.school = filterSchool;
      if (filterMode !== 'all') params.modeOfDelivery = filterMode;

      const data = await getAllPrograms(params);
      setPrograms(data.programs || []);
      setPagination(data.pagination || null);
    } catch (err) {
      setError('Failed to fetch programs');
      console.error('Error fetching programs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrograms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, filterStatus, filterSchool, filterMode]);

  const filteredPrograms = useMemo(
    () =>
      programs.filter(
        (program) =>
          program.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          program.code?.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [programs, searchTerm]
  );

  const schools = useMemo(
    () => [...new Set(programs.map((program) => program.school).filter(Boolean))],
    [programs]
  );

  const modes = useMemo(
    () =>
      [
        ...new Set(
          programs
            .map((program) => normalizeModeOfDeliveryValue(program.modeOfDelivery))
            .filter(Boolean)
        ),
      ],
    [programs]
  );

  const totalPages = pagination?.pages || 1;

  const openProgramDetail = (programId) => {
    if (!programId) return;
    navigate(`/programs/${programId}/review`);
  };

  const openProgramEdit = (programId) => {
    if (!programId) return;
    navigate(`/programs/${programId}`);
  };

  const handleDelete = async (program) => {
    if (!window.confirm(`Are you sure you want to delete "${program.name}"?`)) return;
    try {
      setError(null);
      await deleteProgram(program._id);
      await fetchPrograms();
    } catch (err) {
      const errData = err.response?.data;
      const msg = errData?.error || 'Failed to delete program';
      const hint = errData?.hint ? ` ${errData.hint}` : '';
      setError(`${msg}${hint}`);
    }
  };

  if (loading && programs.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg border border-[rgba(0,0,0,0.08)] p-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F97316] mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-[#1E293B] mb-2">Loading Programs</h2>
            <p className="text-[#94A3B8]">Please wait...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-[rgba(0,0,0,0.08)] p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-[#1E293B] flex items-center">
              <GraduationCap className="w-8 h-8 text-[#F97316] mr-3" />
              Program Management
            </h1>
            <p className="text-[#94A3B8] mt-1">Manage all academic programs.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/programs/new')}
              className="flex items-center px-4 py-2 bg-[#F97316] text-white rounded-lg hover:bg-[#EA580C] transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Program
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search programs..."
              className="pl-10 pr-4 py-2 w-full border border-[rgba(0,0,0,0.08)] rounded-lg bg-white text-[#1E293B] focus:ring-2 focus:ring-[#F97316] focus:border-[#F97316]"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 border border-[rgba(0,0,0,0.08)] rounded-lg bg-white text-[#1E293B] focus:ring-2 focus:ring-[#F97316] focus:border-[#F97316]"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            value={filterSchool}
            onChange={(e) => {
              setFilterSchool(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 border border-[rgba(0,0,0,0.08)] rounded-lg bg-white text-[#1E293B] focus:ring-2 focus:ring-[#F97316] focus:border-[#F97316]"
          >
            <option value="all">All Schools</option>
            {schools.map((school) => (
              <option key={school} value={school}>
                {school}
              </option>
            ))}
          </select>
          <select
            value={filterMode}
            onChange={(e) => {
              setFilterMode(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 border border-[rgba(0,0,0,0.08)] rounded-lg bg-white text-[#1E293B] focus:ring-2 focus:ring-[#F97316] focus:border-[#F97316]"
          >
            <option value="all">All Modes</option>
            {modes.map((mode) => (
              <option key={mode} value={mode}>
                {getModeOfDeliveryLabel(mode, mode)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-[rgba(220,38,38,0.08)] border border-[rgba(239,68,68,0.2)] rounded-lg p-4">
          <p className="text-[#EF4444]">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-lg border border-[rgba(0,0,0,0.08)] overflow-hidden">
        <div className="px-6 py-3 bg-white border-b border-[rgba(0,0,0,0.08)]">
          <span className="text-sm font-medium text-[#94A3B8]">
            {pagination?.total || filteredPrograms.length} programs
          </span>
        </div>

        <div className="divide-y divide-[rgba(255,255,255,0.06)]">
          <div className="px-6 py-3 bg-white grid grid-cols-8 gap-4 text-xs font-medium text-[#94A3B8] uppercase tracking-wider">
            <div>Code</div>
            <div className="col-span-2">Name</div>
            <div>School</div>
            <div>Mode</div>
            <div>Periods</div>
            <div>Status</div>
            <div>Actions</div>
          </div>

          {filteredPrograms.map((program) => (
            <div
              key={program._id}
              className="px-6 py-4 hover:bg-white grid grid-cols-8 gap-4 items-center cursor-pointer"
              onClick={() => openProgramDetail(program._id)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  openProgramDetail(program._id);
                }
              }}
            >
              <div className="text-sm font-medium text-[#1E293B]">{program.code}</div>
              <div className="col-span-2">
                <div className="text-sm font-medium text-[#1E293B]">{program.name}</div>
                {program.description && (
                  <div className="text-xs text-[#94A3B8] truncate">{program.description}</div>
                )}
              </div>
              <div className="text-sm text-[#94A3B8]">{program.school || '-'}</div>
              <div className="text-sm text-[#94A3B8]">{getModeOfDeliveryLabel(program.modeOfDelivery)}</div>
              <div className="text-sm text-[#94A3B8]">
                {program.totalSemesters
                  ? `${program.totalSemesters} ${getPeriodLabel(program.periodType).toLowerCase()}s`
                  : '-'}
              </div>
              <div>
                <span
                  className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                    program.isActive ? 'bg-[rgba(5,150,105,0.1)] text-[#10B981]' : 'bg-[rgba(239,68,68,0.15)] text-[#EF4444]'
                  }`}
                >
                  {program.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div
                className="flex items-center space-x-2"
                onClick={(event) => event.stopPropagation()}
                role="presentation"
              >
                <button
                  onClick={() => openProgramEdit(program._id)}
                  className="p-1 text-[#94A3B8] hover:text-[#F97316]"
                  title="Edit Program"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(program)}
                  className="p-1 text-[#94A3B8] hover:text-[#EF4444]"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredPrograms.length === 0 && !loading && (
          <div className="text-center py-12">
            <GraduationCap className="w-16 h-16 text-[#94A3B8] mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-[#1E293B] mb-2">No Programs Found</h2>
            <p className="text-[#94A3B8] mb-4">Get started by creating your first program.</p>
            <button
              onClick={() => navigate('/programs/new')}
              className="inline-flex items-center px-4 py-2 bg-[#F97316] text-white rounded-md hover:bg-[#EA580C] transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Program
            </button>
          </div>
        )}

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
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
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

export default ProgramManagement;
