import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Lock,
  Unlock,
  CreditCard,
  User,
  Calendar,
  FileText,
  IndianRupee,
} from 'lucide-react';
import { getFeeRecordById, markFeeRecordPaid } from '../services/fee.service';

const FeeRecordDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amountPaid: '',
    paymentReference: '',
    paymentNote: '',
  });

  const fetchRecord = async () => {
    try {
      setLoading(true);
      const data = await getFeeRecordById(id);
      setRecord(data.record);
      setPaymentForm((prev) => ({
        ...prev,
        amountPaid: data.record.totalAmount || '',
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecord();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleMarkPaid = async () => {
    if (!window.confirm('Mark this fee record as paid?')) return;
    setSaving(true);
    try {
      await markFeeRecordPaid(id, {
        amountPaid: Number(paymentForm.amountPaid),
        paymentReference: paymentForm.paymentReference,
        paymentNote: paymentForm.paymentNote,
      });
      setToast({ type: 'success', message: 'Payment marked as paid' });
      fetchRecord();
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.error || 'Failed to mark paid' });
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount || 0);

  const formatDate = (date) =>
    date
      ? new Date(date).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : '-';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="text-center py-12 text-gray-500">Record not found</div>
    );
  }

  const statusColors = {
    PAID: 'bg-green-100 text-green-800 border-green-200',
    UNPAID: 'bg-gray-100 text-gray-700 border-gray-200',
    OVERDUE: 'bg-red-100 text-red-800 border-red-200',
    PARTIAL: 'bg-amber-100 text-amber-800 border-amber-200',
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/fees/records')} className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Fee Record Detail</h1>
          <p className="text-sm text-gray-500 mt-1">{record.periodLabel}</p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${
            statusColors[record.status] || statusColors.UNPAID
          }`}
        >
          {record.status === 'PAID' && <CheckCircle2 className="w-4 h-4" />}
          {record.status === 'OVERDUE' && <AlertTriangle className="w-4 h-4" />}
          {record.status === 'UNPAID' && <Clock className="w-4 h-4" />}
          {record.status}
        </span>
      </div>

      {/* Student Info & Fee Summary side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Student Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            Student Information
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Name</span>
              <span className="text-sm font-medium text-gray-900">{record.student?.user?.name || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Email</span>
              <span className="text-sm text-gray-700">{record.student?.user?.email || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Roll Number</span>
              <span className="text-sm text-gray-700">{record.student?.rollNumber || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Program</span>
              <span className="text-sm text-gray-700">{record.program?.name} ({record.program?.code})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Batch</span>
              <span className="text-sm text-gray-700">{record.batch?.name || '-'}</span>
            </div>
          </div>
        </div>

        {/* Fee Summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <IndianRupee className="w-5 h-5 text-green-600" />
            Fee Summary
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Due Date</span>
              <span className="text-sm font-medium text-gray-900 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {formatDate(record.dueDate)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Total Amount</span>
              <span className="text-sm font-bold text-gray-900">{formatCurrency(record.totalAmount)}</span>
            </div>
            {record.lateFeeAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Late Fee</span>
                <span className="text-sm font-medium text-red-600">{formatCurrency(record.lateFeeAmount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Amount Paid</span>
              <span className="text-sm font-medium text-green-600">{formatCurrency(record.amountPaid)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-3">
              <span className="text-sm text-gray-500">LMS Status</span>
              <span className={`inline-flex items-center gap-1 text-sm font-medium ${record.isLmsLocked ? 'text-purple-700' : 'text-green-700'}`}>
                {record.isLmsLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                {record.isLmsLocked ? 'Locked' : 'Unlocked'}
              </span>
            </div>
            {record.receiptNumber && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Receipt #</span>
                <span className="text-sm font-mono text-gray-700">{record.receiptNumber}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fee Breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <FileText className="w-5 h-5 text-gray-600" />
          Fee Breakdown
        </h2>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 font-medium text-gray-600">Component</th>
              <th className="text-right py-2 font-medium text-gray-600">Amount</th>
            </tr>
          </thead>
          <tbody>
            {record.amounts?.map((a, idx) => (
              <tr key={idx} className="border-b border-gray-100">
                <td className="py-2 text-gray-800">{a.label}</td>
                <td className="py-2 text-right font-medium text-gray-900">{formatCurrency(a.amount)}</td>
              </tr>
            ))}
            {record.lateFeeAmount > 0 && (
              <tr className="border-b border-gray-100">
                <td className="py-2 text-red-600">Late Fee Penalty</td>
                <td className="py-2 text-right font-medium text-red-600">{formatCurrency(record.lateFeeAmount)}</td>
              </tr>
            )}
            <tr className="bg-gray-50">
              <td className="py-2 font-bold text-gray-800">Total</td>
              <td className="py-2 text-right font-bold text-gray-900">
                {formatCurrency(record.totalAmount + (record.lateFeeAmount || 0))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Mark Paid Form */}
      {record.status !== 'PAID' && (
        <div className="bg-white rounded-xl border border-green-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            Mark as Paid
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Amount Paid</label>
              <input
                type="number"
                min="0"
                value={paymentForm.amountPaid}
                onChange={(e) => setPaymentForm((p) => ({ ...p, amountPaid: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Payment Reference</label>
              <input
                type="text"
                value={paymentForm.paymentReference}
                onChange={(e) => setPaymentForm((p) => ({ ...p, paymentReference: e.target.value }))}
                placeholder="Transaction ID / Receipt #"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Note</label>
              <input
                type="text"
                value={paymentForm.paymentNote}
                onChange={(e) => setPaymentForm((p) => ({ ...p, paymentNote: e.target.value }))}
                placeholder="Optional note"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
          <button
            onClick={handleMarkPaid}
            disabled={saving}
            className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            {saving ? 'Processing...' : 'Mark as Paid'}
          </button>
        </div>
      )}

      {/* Payment Info (if paid) */}
      {record.status === 'PAID' && record.paymentDate && (
        <div className="bg-green-50 rounded-xl border border-green-200 p-6 space-y-3">
          <h2 className="text-lg font-semibold text-green-800 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            Payment Information
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-green-600">Payment Date</span>
              <p className="font-medium text-green-900">{formatDate(record.paymentDate)}</p>
            </div>
            <div>
              <span className="text-green-600">Reference</span>
              <p className="font-medium text-green-900">{record.paymentReference || '-'}</p>
            </div>
            <div>
              <span className="text-green-600">Marked By</span>
              <p className="font-medium text-green-900">{record.markedPaidBy?.name || '-'}</p>
            </div>
            <div>
              <span className="text-green-600">Note</span>
              <p className="font-medium text-green-900">{record.paymentNote || '-'}</p>
            </div>
          </div>
        </div>
      )}

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

export default FeeRecordDetail;
