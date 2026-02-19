import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Edit, Save, X, FileText } from 'lucide-react';
import {
  getProgramById,
  updateProgram,
} from '../services/program.service';
import { getTeachers } from '../services/user.service';
import { getPeriodLabel } from '../utils/periodLabel';
import {
  MODE_OF_DELIVERY,
  MODE_OF_DELIVERY_OPTIONS,
  getModeOfDeliveryLabel,
  normalizeModeOfDeliveryValue,
} from '../constants/modeOfDelivery';

const EMPTY_FORM = {
  name: '',
  code: '',
  school: '',
  stream: '',
  modeOfDelivery: MODE_OF_DELIVERY.REGULAR,
  description: '',
  periodType: 'semester',
  totalSemesters: '',
  totalCredits: '',
  programCoordinator: '',
};

const normalizeOptionalText = (value) => {
  if (value === null || value === undefined) return '';
  const trimmed = value.toString().trim();
  if (!trimmed) return '';
  if (['null', 'undefined', 'na', 'n/a'].includes(trimmed.toLowerCase())) {
    return '';
  }
  return trimmed;
};

const toProgramForm = (program) => ({
  name: program?.name || '',
  code: program?.code || '',
  school: program?.school || '',
  stream: normalizeOptionalText(program?.stream),
  modeOfDelivery:
    normalizeModeOfDeliveryValue(program?.modeOfDelivery) || MODE_OF_DELIVERY.REGULAR,
  description: program?.description || '',
  periodType: program?.periodType || 'semester',
  totalSemesters: program?.totalSemesters?.toString() || '',
  totalCredits: program?.totalCredits?.toString() || '',
  programCoordinator:
    typeof program?.programCoordinator === 'object'
      ? program?.programCoordinator?._id || ''
      : program?.programCoordinator || '',
});

const ProgramReview = () => {
  const { programId } = useParams();
  const [program, setProgram] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const coordinatorMap = useMemo(() => {
    const map = new Map();
    teachers.forEach((teacher) => {
      if (teacher?._id) {
        map.set(String(teacher._id), teacher);
      }
    });
    return map;
  }, [teachers]);

  const coordinatorDisplay = useMemo(() => {
    const raw =
      typeof program?.programCoordinator === 'object'
        ? program?.programCoordinator?._id
        : program?.programCoordinator;
    const coordinatorId = raw ? String(raw) : '';
    if (!coordinatorId) return '-';
    const teacher = coordinatorMap.get(coordinatorId);
    if (!teacher) return coordinatorId;
    return `${teacher.name || 'Unknown'} (${teacher.email || 'no-email'})`;
  }, [program, coordinatorMap]);

  const fetchProgram = async () => {
    if (!programId) {
      setError('Program ID missing in URL.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await getProgramById(programId);
      setProgram(data);
      setFormData(toProgramForm(data));
    } catch (err) {
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to load program details';
      setError(message);
      console.error('Error fetching program details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgram();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId]);

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const data = await getTeachers();
        setTeachers(data.users || data.teachers || []);
      } catch (err) {
        console.error('Error fetching teachers:', err);
        setTeachers([]);
      }
    };
    fetchTeachers();
  }, []);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleStartEdit = () => {
    setFormData(toProgramForm(program));
    setIsEditing(true);
    setError(null);
  };

  const handleCancelEdit = () => {
    setFormData(toProgramForm(program));
    setIsEditing(false);
    setError(null);
  };

  const handleSave = async (event) => {
    event.preventDefault();

    const normalizedTotalSemesters = Number.parseInt(String(formData.totalSemesters || ''), 10);
    if (!Number.isInteger(normalizedTotalSemesters) || normalizedTotalSemesters < 1) {
      setError('Total periods must be a valid number greater than 0.');
      return;
    }

    const payload = {
      name: formData.name,
      code: formData.code,
      school: formData.school,
      stream: normalizeOptionalText(formData.stream),
      modeOfDelivery:
        normalizeModeOfDeliveryValue(formData.modeOfDelivery) || MODE_OF_DELIVERY.REGULAR,
      description: formData.description,
      periodType: formData.periodType,
      totalSemesters: normalizedTotalSemesters,
      totalCredits:
        formData.totalCredits && String(formData.totalCredits).trim() !== ''
          ? Number(formData.totalCredits)
          : null,
      programCoordinator:
        formData.programCoordinator && String(formData.programCoordinator).trim() !== ''
          ? formData.programCoordinator
          : null,
    };

    try {
      setSaving(true);
      setError(null);
      await updateProgram(programId, payload);
      await fetchProgram();
      setIsEditing(false);
    } catch (err) {
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to update program';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Program Details</h2>
            <p className="text-gray-600">Please wait...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !program) {
    return (
      <div className="space-y-6">
        <Link to="/programs" className="flex items-center text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Programs
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/programs" className="flex items-center text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Programs
        </Link>
        {!isEditing ? (
          <button
            onClick={handleStartEdit}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </button>
        ) : (
          <button
            onClick={handleCancelEdit}
            className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <FileText className="w-6 h-6 text-blue-600 mr-2" />
            Program Details
          </h1>
          <p className="text-gray-600 mt-1">Program-only details and edit</p>
        </div>

        {!isEditing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div><span className="font-medium text-gray-900">Program Name:</span> {program?.name || '-'}</div>
            <div><span className="font-medium text-gray-900">Program Code:</span> {program?.code || '-'}</div>
            <div><span className="font-medium text-gray-900">School / Department:</span> {program?.school || '-'}</div>
            <div><span className="font-medium text-gray-900">Stream:</span> {program?.stream || '-'}</div>
            <div><span className="font-medium text-gray-900">Mode of Delivery:</span> {getModeOfDeliveryLabel(program?.modeOfDelivery)}</div>
            <div><span className="font-medium text-gray-900">Period Type:</span> {program?.periodType || '-'}</div>
            <div>
              <span className="font-medium text-gray-900">Total {getPeriodLabel(program?.periodType || 'semester')}s:</span>{' '}
              {program?.totalSemesters ?? '-'}
            </div>
            <div><span className="font-medium text-gray-900">Total Credits:</span> {program?.totalCredits ?? '-'}</div>
            <div><span className="font-medium text-gray-900">Program Coordinator:</span> {coordinatorDisplay}</div>
            <div className="md:col-span-2">
              <span className="font-medium text-gray-900">Description:</span> {program?.description || '-'}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Program Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Program Code *</label>
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">School / Department</label>
                <input
                  type="text"
                  name="school"
                  value={formData.school}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stream</label>
                <input
                  type="text"
                  name="stream"
                  value={formData.stream}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mode of Delivery</label>
                <select
                  name="modeOfDelivery"
                  value={formData.modeOfDelivery}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {MODE_OF_DELIVERY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Period Type</label>
                <select
                  name="periodType"
                  value={formData.periodType}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="semester">Semester</option>
                  <option value="term">Term</option>
                  <option value="month">Month</option>
                  <option value="week">Week</option>
                  <option value="days">Days</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total {getPeriodLabel(formData.periodType)}s *
                </label>
                <input
                  type="number"
                  name="totalSemesters"
                  value={formData.totalSemesters}
                  onChange={handleInputChange}
                  required
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Credits</label>
                <input
                  type="number"
                  name="totalCredits"
                  value={formData.totalCredits}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Program Coordinator</label>
              <select
                name="programCoordinator"
                value={formData.programCoordinator}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Coordinator (optional)</option>
                {teachers.map((teacher) => (
                  <option key={teacher._id} value={teacher._id}>
                    {teacher.name} ({teacher.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className={`inline-flex items-center px-4 py-2 rounded-lg text-white transition-colors ${
                  saving ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ProgramReview;
