import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard,
  Search,
  Plus,
  Edit,
  Trash2,
  Users,
  RefreshCw,
  IndianRupee,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Lock,
} from 'lucide-react';
import {
  getFeeStructures,
  deleteFeeStructure,
  generateFeeRecords,
  getFeeDashboard,
  recalculateLateFees,
  syncLockStatus,
} from '../services/fee.service';

const FeeStructureManagement = () => {
  const navigate = useNavigate();
  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dashboard, setDashboard] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [structData, dashData] = await Promise.all([
        getFeeStructures(),
        getFeeDashboard(),
      ]);
      setStructures(structData.structures || []);
      setDashboard(dashData.stats || null);
    } catch (err) {
      setError('Failed to fetch fee data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const filteredStructures = useMemo(
    () =>
      structures.filter(
        (s) =>
          s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.program?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.program?.code?.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [structures, searchTerm]
  );

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to deactivate this fee structure?')) return;
    try {
      await deleteFeeStructure(id);
      setToast({ type: 'success', message: 'Fee structure deactivated' });
      fetchData();
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.error || 'Failed to delete' });
    }
  };

  const handleGenerateRecords = async (id) => {
    setActionLoading(id);
    try {
      const result = await generateFeeRecords(id);
      setToast({
        type: 'success',
        message: `Records generated: ${result.created} created, ${result.skipped} skipped`,
      });
      fetchData();
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.error || 'Failed to generate records' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRecalculate = async () => {
    setActionLoading('recalc');
    try {
      const result = await recalculateLateFees();
      setToast({ type: 'success', message: `Late fees recalculated: ${result.updated} updated` });
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to recalculate' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSyncLock = async () => {
    setActionLoading('sync');
    try {
      const result = await syncLockStatus();
      setToast({ type: 'success', message: `LMS lock synced: ${result.locked} locked` });
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to sync lock' });
    } finally {
      setActionLoading(null);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="w-7 h-7 text-blue-600" />
            Fee Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage program fee structures and student payments</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/fees/records')}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            Student Records
          </button>
          <button
            onClick={() => navigate('/fees/new')}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Fee Structure
          </button>
        </div>
      </div>

      {/* Dashboard Stats */}
      {dashboard && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <IndianRupee className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Collected</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(dashboard.totalCollected)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Pending</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(dashboard.totalPending)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Paid Records</p>
                <p className="text-lg font-bold text-gray-900">{dashboard.paidRecords}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Overdue</p>
                <p className="text-lg font-bold text-gray-900">{dashboard.overdueRecords}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Lock className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">LMS Locked</p>
                <p className="text-lg font-bold text-gray-900">{dashboard.lockedStudents}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions Bar */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search fee structures..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>
        <div className="flex gap-2 ml-4">
          <button
            onClick={handleRecalculate}
            disabled={actionLoading === 'recalc'}
            className="px-3 py-2 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${actionLoading === 'recalc' ? 'animate-spin' : ''}`} />
            Recalculate Late Fees
          </button>
          <button
            onClick={handleSyncLock}
            disabled={actionLoading === 'sync'}
            className="px-3 py-2 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 flex items-center gap-1.5 disabled:opacity-50"
          >
            <Lock className={`w-3.5 h-3.5 ${actionLoading === 'sync' ? 'animate-spin' : ''}`} />
            Sync LMS Lock
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">{error}</div>
      )}

      {/* Fee Structures Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Structure Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Program</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Periods</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Late Fee</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredStructures.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  {searchTerm ? 'No matching fee structures found' : 'No fee structures created yet. Click "New Fee Structure" to get started.'}
                </td>
              </tr>
            ) : (
              filteredStructures.map((s) => (
                <tr key={s._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{s.name}</div>
                    <div className="text-xs text-gray-500">{s.feeComponents?.length || 0} components</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{s.program?.name}</div>
                    <div className="text-xs text-gray-500">{s.program?.code}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-700">{s.periods?.length || 0} periods</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-700">
                      {s.lateFeeConfig?.enabled
                        ? `${s.lateFeeConfig.ratePerMonth}%/month`
                        : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        s.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {s.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleGenerateRecords(s._id)}
                        disabled={actionLoading === s._id}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50"
                        title="Generate Student Records"
                      >
                        <Users className={`w-4 h-4 ${actionLoading === s._id ? 'animate-spin' : ''}`} />
                      </button>
                      <button
                        onClick={() => navigate(`/fees/${s._id}/edit`)}
                        className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(s._id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Deactivate"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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

export default FeeStructureManagement;
