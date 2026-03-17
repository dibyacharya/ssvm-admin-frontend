import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  CreditCard,
  Calendar,
  Percent,
  Lock,
  X,
  Copy,
  ChevronsDown,
} from 'lucide-react';
import {
  getFeeStructureById,
  createFeeStructure,
  updateFeeStructure,
  getProgramsDropdown,
} from '../services/fee.service';

const DEFAULT_COMPONENTS = [
  { key: 'TUITION', label: 'Tuition Fee', isDefault: true },
  { key: 'EXAM', label: 'Examination Fee', isDefault: true },
  { key: 'LIBRARY', label: 'Library Fee', isDefault: true },
  { key: 'LAB', label: 'Laboratory Fee', isDefault: true },
];

const PERIOD_LABELS = {
  semester: 'Semester',
  term: 'Term',
  month: 'Month',
  week: 'Week',
  days: 'Period',
};

const FeeStructureForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    program: '',
    name: '',
    feeComponents: [...DEFAULT_COMPONENTS],
    periods: [],
    lateFeeConfig: {
      enabled: true,
      ratePerMonth: 2,
      gracePeriodDays: 7,
      maxLateFeePercent: 50,
    },
    lmsLockConfig: {
      enabled: true,
      lockAfterDays: 0,
    },
  });

  const [selectedProgram, setSelectedProgram] = useState(null);
  const [newComponentLabel, setNewComponentLabel] = useState('');

  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const data = await getProgramsDropdown();
        setPrograms(data.programs || data || []);
      } catch (err) {
        console.error('Failed to fetch programs:', err);
      }
    };
    fetchPrograms();
  }, []);

  useEffect(() => {
    if (isEdit) {
      const fetchStructure = async () => {
        try {
          setLoading(true);
          const data = await getFeeStructureById(id);
          const s = data.structure;
          setForm({
            program: s.program?._id || '',
            name: s.name || '',
            feeComponents: s.feeComponents || [],
            periods: s.periods?.map((p) => ({
              ...p,
              dueDate: p.dueDate ? p.dueDate.slice(0, 10) : '',
            })) || [],
            lateFeeConfig: s.lateFeeConfig || form.lateFeeConfig,
            lmsLockConfig: s.lmsLockConfig || form.lmsLockConfig,
          });
          setSelectedProgram(s.program);
        } catch (err) {
          setError('Failed to load fee structure');
        } finally {
          setLoading(false);
        }
      };
      fetchStructure();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit]);

  const handleProgramChange = (programId) => {
    const prog = programs.find((p) => (p._id || p.id) === programId);
    setSelectedProgram(prog);
    setForm((prev) => ({ ...prev, program: programId }));

    // Auto-generate periods
    if (prog && prog.totalSemesters) {
      const periodType = prog.periodType || 'semester';
      const label = PERIOD_LABELS[periodType] || 'Period';
      const periods = [];
      for (let i = 1; i <= prog.totalSemesters; i++) {
        periods.push({
          periodNumber: i,
          periodLabel: `${label} ${i}`,
          dueDate: '',
          amounts: form.feeComponents.map((c) => ({
            componentKey: c.key,
            amount: 0,
          })),
          totalAmount: 0,
        });
      }
      setForm((prev) => ({ ...prev, periods }));
    }
  };

  const addComponent = () => {
    if (!newComponentLabel.trim()) return;
    const key = newComponentLabel.trim().toUpperCase().replace(/\s+/g, '_');
    if (form.feeComponents.some((c) => c.key === key)) return;

    const newComp = { key, label: newComponentLabel.trim(), isDefault: false };
    setForm((prev) => ({
      ...prev,
      feeComponents: [...prev.feeComponents, newComp],
      periods: prev.periods.map((p) => ({
        ...p,
        amounts: [...p.amounts, { componentKey: key, amount: 0 }],
      })),
    }));
    setNewComponentLabel('');
  };

  const removeComponent = (key) => {
    setForm((prev) => ({
      ...prev,
      feeComponents: prev.feeComponents.filter((c) => c.key !== key),
      periods: prev.periods.map((p) => ({
        ...p,
        amounts: p.amounts.filter((a) => a.componentKey !== key),
        totalAmount: p.amounts
          .filter((a) => a.componentKey !== key)
          .reduce((sum, a) => sum + (a.amount || 0), 0),
      })),
    }));
  };

  const updatePeriodAmount = (periodIdx, componentKey, value) => {
    setForm((prev) => {
      const newPeriods = [...prev.periods];
      const period = { ...newPeriods[periodIdx] };
      period.amounts = period.amounts.map((a) =>
        a.componentKey === componentKey ? { ...a, amount: Number(value) || 0 } : a
      );
      period.totalAmount = period.amounts.reduce((sum, a) => sum + (a.amount || 0), 0);
      newPeriods[periodIdx] = period;
      return { ...prev, periods: newPeriods };
    });
  };

  const updatePeriodDueDate = (periodIdx, value) => {
    setForm((prev) => {
      const newPeriods = [...prev.periods];
      newPeriods[periodIdx] = { ...newPeriods[periodIdx], dueDate: value };
      return { ...prev, periods: newPeriods };
    });
  };

  const applyFirstToAll = (mode) => {
    // mode: 'all' = fees + dates, 'fees' = only fees, 'dates' = only dates
    if (form.periods.length < 2) return;
    const first = form.periods[0];
    const periodType = selectedProgram?.periodType || 'semester';

    // Calculate interval in months based on period type
    const intervalMonths = periodType === 'week' ? 0 : periodType === 'month' ? 1 : periodType === 'term' ? 4 : 6;

    setForm((prev) => {
      const newPeriods = prev.periods.map((p, idx) => {
        if (idx === 0) return p;
        const updated = { ...p };

        // Copy fee amounts
        if (mode === 'all' || mode === 'fees') {
          updated.amounts = first.amounts.map((a) => ({ ...a }));
          updated.totalAmount = first.totalAmount;
        }

        // Auto-generate due dates
        if ((mode === 'all' || mode === 'dates') && first.dueDate) {
          const baseDate = new Date(first.dueDate);
          if (periodType === 'week') {
            baseDate.setDate(baseDate.getDate() + idx * 7);
          } else if (periodType === 'days') {
            baseDate.setDate(baseDate.getDate() + idx * 30);
          } else {
            baseDate.setMonth(baseDate.getMonth() + idx * intervalMonths);
          }
          updated.dueDate = baseDate.toISOString().slice(0, 10);
        }

        return updated;
      });
      return { ...prev, periods: newPeriods };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.program || !form.name) {
      setError('Program and name are required');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (isEdit) {
        await updateFeeStructure(id, form);
      } else {
        await createFeeStructure(form);
      }
      navigate('/fees');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save fee structure');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/fees')}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-blue-600" />
            {isEdit ? 'Edit Fee Structure' : 'Create Fee Structure'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Define fee components and amounts for each period
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Program</label>
              <select
                value={form.program}
                onChange={(e) => handleProgramChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                required
                disabled={isEdit}
              >
                <option value="">Select a program</option>
                {programs.map((p) => (
                  <option key={p._id || p.id} value={p._id || p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Structure Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., BTech CSE 2024 Fee Structure"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                required
              />
            </div>
          </div>
          {selectedProgram && (
            <div className="flex gap-4 text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
              <span>Period Type: <strong className="text-gray-700">{selectedProgram.periodType || 'semester'}</strong></span>
              <span>Total Periods: <strong className="text-gray-700">{selectedProgram.totalSemesters || selectedProgram.totalPeriods}</strong></span>
            </div>
          )}
        </div>

        {/* Fee Components */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Fee Components</h2>
          <div className="flex flex-wrap gap-2">
            {form.feeComponents.map((c) => (
              <span
                key={c.key}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm"
              >
                {c.label}
                <button
                  type="button"
                  onClick={() => removeComponent(c.key)}
                  className="hover:text-red-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newComponentLabel}
              onChange={(e) => setNewComponentLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addComponent())}
              placeholder="Add custom component (e.g., Sports Fee)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={addComponent}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1 text-sm"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
        </div>

        {/* Period-wise Amounts */}
        {form.periods.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-lg font-semibold text-gray-900">Period-wise Fee Amounts</h2>
              {form.periods.length > 1 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-500 font-medium">Apply 1st period to all:</span>
                  <button
                    type="button"
                    onClick={() => applyFirstToAll('all')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium transition-colors shadow-sm"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Fees & Dates
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFirstToAll('fees')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-xs font-medium transition-colors shadow-sm"
                  >
                    <ChevronsDown className="w-3.5 h-3.5" />
                    Fees Only
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFirstToAll('dates')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-xs font-medium transition-colors shadow-sm"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    Dates Only
                  </button>
                </div>
              )}
            </div>
            {form.periods.length > 1 && (
              <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
                <strong className="text-gray-500">Tip:</strong> Fill in the 1st period's fees & due date, then click a button above to auto-fill all other periods. Dates auto-increment based on period type (6 months for semesters, 4 for terms, etc.)
              </p>
            )}
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 font-medium text-gray-600">Period</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> Due Date
                      </span>
                    </th>
                    {form.feeComponents.map((c) => (
                      <th key={c.key} className="text-left py-3 px-2 font-medium text-gray-600">
                        {c.label}
                      </th>
                    ))}
                    <th className="text-right py-3 px-2 font-medium text-gray-600">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {form.periods.map((period, pIdx) => (
                    <tr key={pIdx} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-2 font-medium text-gray-800">{period.periodLabel}</td>
                      <td className="py-3 px-2">
                        <input
                          type="date"
                          value={period.dueDate || ''}
                          onChange={(e) => updatePeriodDueDate(pIdx, e.target.value)}
                          className="px-2 py-1.5 border border-gray-300 rounded-md text-sm w-36 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        />
                      </td>
                      {form.feeComponents.map((c) => {
                        const amt = period.amounts?.find((a) => a.componentKey === c.key);
                        return (
                          <td key={c.key} className="py-3 px-2">
                            <input
                              type="number"
                              min="0"
                              value={amt?.amount || 0}
                              onChange={(e) => updatePeriodAmount(pIdx, c.key, e.target.value)}
                              className="px-2 py-1.5 border border-gray-300 rounded-md text-sm w-28 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </td>
                        );
                      })}
                      <td className="py-3 px-2 text-right font-semibold text-gray-900">
                        {formatCurrency(period.totalAmount)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50">
                    <td colSpan={2 + form.feeComponents.length} className="py-3 px-2 text-right font-bold text-gray-700">
                      Grand Total
                    </td>
                    <td className="py-3 px-2 text-right font-bold text-blue-700 text-lg">
                      {formatCurrency(form.periods.reduce((sum, p) => sum + (p.totalAmount || 0), 0))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Late Fee & LMS Lock Config */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Percent className="w-5 h-5 text-amber-600" />
                Late Fee Configuration
              </h2>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.lateFeeConfig.enabled}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      lateFeeConfig: { ...prev.lateFeeConfig, enabled: e.target.checked },
                    }))
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Enable
              </label>
            </div>
            {form.lateFeeConfig.enabled && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Rate Per Month (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={form.lateFeeConfig.ratePerMonth}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        lateFeeConfig: { ...prev.lateFeeConfig, ratePerMonth: Number(e.target.value) },
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Grace Period (days)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.lateFeeConfig.gracePeriodDays}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        lateFeeConfig: { ...prev.lateFeeConfig, gracePeriodDays: Number(e.target.value) },
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Max Late Fee (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={form.lateFeeConfig.maxLateFeePercent}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        lateFeeConfig: { ...prev.lateFeeConfig, maxLateFeePercent: Number(e.target.value) },
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Lock className="w-5 h-5 text-purple-600" />
                LMS Lock Configuration
              </h2>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.lmsLockConfig.enabled}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      lmsLockConfig: { ...prev.lmsLockConfig, enabled: e.target.checked },
                    }))
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Enable
              </label>
            </div>
            {form.lmsLockConfig.enabled && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Lock After (days past due date)
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.lmsLockConfig.lockAfterDays}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      lmsLockConfig: { ...prev.lmsLockConfig, lockAfterDays: Number(e.target.value) },
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  0 = lock immediately after due date. Set higher for grace period before LMS lock.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/fees')}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : isEdit ? 'Update Structure' : 'Create Structure'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FeeStructureForm;
