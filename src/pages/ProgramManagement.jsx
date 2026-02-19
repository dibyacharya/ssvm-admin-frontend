import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Search,
  Trash2,
  RefreshCw,
  Eye,
} from 'lucide-react';
import {
  getAllPrograms,
  deleteProgram,
} from '../services/program.service';
import {
  getModeOfDeliveryLabel,
  normalizeModeOfDeliveryValue,
} from '../constants/modeOfDelivery';

const ProgramManagement = () => {
  const navigate = useNavigate();
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
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
      if (filterDepartment !== 'all') params.department = filterDepartment;
      if (filterStatus !== 'all') params.isActive = filterStatus === 'active';
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
  }, [currentPage, filterDepartment, filterStatus, filterSchool, filterMode]);

  const filteredPrograms = useMemo(
    () =>
      programs.filter(
        (program) =>
          program.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          program.code?.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [programs, searchTerm]
  );

  const departments = useMemo(
    () => [...new Set(programs.map((program) => program.department).filter(Boolean))],
    [programs]
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Programs</h2>
            <p className="text-gray-600">Please wait...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <GraduationCap className="w-8 h-8 text-blue-600 mr-3" />
              Program Management
            </h1>
            <p className="text-gray-600 mt-1">Programs only. Create new programs via Setup Wizard.</p>
          </div>
          <button
            onClick={fetchPrograms}
            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search programs..."
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterDepartment}
            onChange={(e) => {
              setFilterDepartment(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Departments</option>
            {departments.map((department) => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <span className="text-sm font-medium text-gray-700">
            {pagination?.total || filteredPrograms.length} programs
          </span>
        </div>

        <div className="divide-y divide-gray-200">
          <div className="px-6 py-3 bg-gray-50 grid grid-cols-8 gap-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <div>Code</div>
            <div className="col-span-2">Name</div>
            <div>Department</div>
            <div>School</div>
            <div>Mode</div>
            <div>Status</div>
            <div>Actions</div>
          </div>

          {filteredPrograms.map((program) => (
            <div
              key={program._id}
              className="px-6 py-4 hover:bg-gray-50 grid grid-cols-8 gap-4 items-center cursor-pointer"
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
              <div className="text-sm font-medium text-gray-900">{program.code}</div>
              <div className="col-span-2">
                <div className="text-sm font-medium text-gray-900">{program.name}</div>
                {program.description && (
                  <div className="text-xs text-gray-500 truncate">{program.description}</div>
                )}
              </div>
              <div className="text-sm text-gray-600">{program.department || '-'}</div>
              <div className="text-sm text-gray-600">{program.school || '-'}</div>
              <div className="text-sm text-gray-600">{getModeOfDeliveryLabel(program.modeOfDelivery)}</div>
              <div>
                <span
                  className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                    program.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
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
                  onClick={() => openProgramDetail(program._id)}
                  className="p-1 text-gray-400 hover:text-green-600"
                  title="View Details"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(program)}
                  className="p-1 text-gray-400 hover:text-red-600"
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
            <GraduationCap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Programs Found</h2>
            <p className="text-gray-600 mb-4">Create programs from Setup Wizard.</p>
            <button
              onClick={() => navigate('/onboarding')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Open Setup Wizard
            </button>
          </div>
        )}

        {totalPages > 1 && (
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Page {currentPage} of {totalPages} ({pagination?.total || 0} total)
              </div>
              <div className="flex items-center space-x-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                  className="px-3 py-1 text-sm text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 text-sm rounded-lg ${
                      currentPage === page
                        ? 'text-white bg-blue-600'
                        : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                  className="px-3 py-1 text-sm text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
