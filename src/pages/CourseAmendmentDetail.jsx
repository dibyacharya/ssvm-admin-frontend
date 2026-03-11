import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Play,
  RotateCcw,
  Edit3,
  Loader2,
  Clock,
  AlertTriangle,
  Send,
  User,
  Mail,
  FileText,
} from 'lucide-react';
import {
  getAmendmentById,
  approveAmendment,
  rejectAmendment,
  getEligibleBatches,
  applyToBatch,
  revertFromBatch,
  submitForApproval,
} from '../services/courseAmendment.service';

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

const BATCH_STATUS_COLORS = {
  APPLIED: 'bg-green-100 text-green-800',
  REVERTED: 'bg-purple-100 text-purple-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  FAILED: 'bg-red-100 text-red-800',
  NOT_APPLIED: 'bg-gray-100 text-gray-600',
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
};

const CourseAmendmentDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [amendment, setAmendment] = useState(null);
  const [eligibleBatches, setEligibleBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getAmendmentById(id);
      setAmendment(res.amendment);

      // Fetch eligible batches if approved or partially applied
      if (
        ['APPROVED', 'PARTIALLY_APPLIED', 'FULLY_APPLIED'].includes(
          res.amendment.status
        )
      ) {
        try {
          const batchRes = await getEligibleBatches(id);
          setEligibleBatches(batchRes.batches || []);
        } catch {
          // Non-critical
        }
      }
    } catch (err) {
      setError(
        err?.response?.data?.error || err.message || 'Failed to load amendment'
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAction = async (actionFn, label, ...args) => {
    try {
      setActionLoading(label);
      setError('');
      setSuccessMsg('');
      await actionFn(...args);
      setSuccessMsg(`${label} successful!`);
      await fetchData();
    } catch (err) {
      setError(
        err?.response?.data?.error || err.message || `${label} failed`
      );
    } finally {
      setActionLoading('');
    }
  };

  const handleApprove = () =>
    handleAction(approveAmendment, 'Approval', id);

  const handleReject = () => {
    setShowRejectDialog(true);
  };

  const confirmReject = () => {
    setShowRejectDialog(false);
    handleAction(rejectAmendment, 'Rejection', id, rejectionReason);
    setRejectionReason('');
  };

  const handleSubmit = () =>
    handleAction(submitForApproval, 'Submit', id);

  const handleApply = (batchId) =>
    handleAction(applyToBatch, 'Apply', id, batchId);

  const handleRevert = (batchId) =>
    handleAction(revertFromBatch, 'Revert', id, batchId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        <span className="ml-2 text-gray-500">Loading amendment...</span>
      </div>
    );
  }

  if (!amendment) {
    return (
      <div className="text-center py-20">
        <AlertTriangle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">{error || 'Amendment not found'}</p>
        <button
          onClick={() => navigate('/course-amendments')}
          className="mt-3 text-blue-600 hover:text-blue-800 text-sm"
        >
          Back to amendments
        </button>
      </div>
    );
  }

  const canEdit = amendment.status === 'DRAFT';
  const canSubmit = amendment.status === 'DRAFT';
  const canApprove = amendment.status === 'PENDING_APPROVAL';
  const canApply = ['APPROVED', 'PARTIALLY_APPLIED'].includes(amendment.status);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/course-amendments')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {amendment.amendmentId}
              </h1>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  STATUS_COLORS[amendment.status] || 'bg-gray-100'
                }`}
              >
                {STATUS_LABELS[amendment.status] || amendment.status}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {amendment.title}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && (
            <button
              onClick={() =>
                navigate(`/course-amendments/${amendment._id}/edit`)
              }
              className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              Edit
            </button>
          )}
          {canSubmit && (
            <button
              onClick={handleSubmit}
              disabled={!!actionLoading}
              className="inline-flex items-center gap-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {actionLoading === 'Submit' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Submit for Approval
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          {successMsg}
        </div>
      )}

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            Details
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Program</span>
              <span className="text-gray-900 font-medium">
                {amendment.program?.name || '-'}
                {amendment.program?.code ? ` (${amendment.program.code})` : ''}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Scope</span>
              <span className="text-gray-900">
                {amendment.scope === 'CURRENT_AND_FUTURE'
                  ? 'Current + Future'
                  : 'Future Only'}
              </span>
            </div>
            {amendment.currentBatchId && (
              <div className="flex justify-between">
                <span className="text-gray-500">Current Batch</span>
                <span className="text-gray-900">
                  {amendment.currentBatchId?.name || '-'}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Effective Date</span>
              <span className="text-gray-900">
                {formatDate(amendment.effectiveDate)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Created By</span>
              <span className="text-gray-900">
                {amendment.createdBy?.name || '-'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            Approval
          </h3>
          <div className="space-y-2 text-sm">
            {amendment.approvedBy && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-500">Approved By</span>
                  <span className="text-green-700 font-medium">
                    {amendment.approvedBy?.name || '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Approved At</span>
                  <span className="text-gray-900">
                    {formatDate(amendment.approvedAt)}
                  </span>
                </div>
              </>
            )}
            {amendment.rejectedBy && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-500">Rejected By</span>
                  <span className="text-red-700 font-medium">
                    {amendment.rejectedBy?.name || '-'}
                  </span>
                </div>
                {amendment.rejectionReason && (
                  <div>
                    <span className="text-gray-500 block mb-1">Reason</span>
                    <p className="text-red-600 bg-red-50 p-2 rounded text-xs">
                      {amendment.rejectionReason}
                    </p>
                  </div>
                )}
              </>
            )}
            {!amendment.approvedBy && !amendment.rejectedBy && (
              <p className="text-gray-400 text-sm italic">
                Awaiting approval action
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Reason */}
      {amendment.reason && (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Reason
          </h3>
          <p className="text-sm text-gray-700">{amendment.reason}</p>
        </div>
      )}

      {/* Changes Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            Course Changes ({amendment.changes?.length || 0})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Type
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Semester
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Course Added
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Course Removed
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(amendment.changes || []).map((change, idx) => (
                <tr key={change._id || idx}>
                  <td className="px-5 py-3 text-sm">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        change.type === 'ADD_COURSE'
                          ? 'bg-green-100 text-green-800'
                          : change.type === 'REMOVE_COURSE'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {change.type === 'ADD_COURSE'
                        ? 'Add'
                        : change.type === 'REMOVE_COURSE'
                          ? 'Remove'
                          : 'Replace'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-700">
                    Semester {change.semesterNumber}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-700">
                    {change.courseId ? (
                      <>
                        <span className="font-mono text-xs text-gray-500">
                          {change.courseId.courseCode || ''}
                        </span>{' '}
                        {change.courseId.title || '-'}
                        {change.courseId.credits != null && (
                          <span className="ml-1 text-gray-400">
                            ({change.courseId.credits} cr)
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-700">
                    {change.removedCourseId ? (
                      <>
                        <span className="font-mono text-xs text-gray-500">
                          {change.removedCourseId.courseCode || ''}
                        </span>{' '}
                        {change.removedCourseId.title || '-'}
                        {change.removedCourseId.credits != null && (
                          <span className="ml-1 text-gray-400">
                            ({change.removedCourseId.credits} cr)
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dean Approval Section */}
      {canApprove && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-yellow-800 mb-3">
            Dean Approval Required
          </h3>
          <div className="flex items-center gap-3">
            <button
              onClick={handleApprove}
              disabled={!!actionLoading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {actionLoading === 'Approval' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              Approve
            </button>
            <button
              onClick={handleReject}
              disabled={!!actionLoading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {actionLoading === 'Rejection' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              Reject
            </button>
          </div>
        </div>
      )}

      {/* Reject Dialog */}
      {showRejectDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Reject Amendment
            </h3>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Reason for rejection (optional)"
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent mb-4"
            />
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowRejectDialog(false);
                  setRejectionReason('');
                }}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={confirmReject}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Application Section */}
      {canApply && eligibleBatches.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Batch Applications
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Apply or revert this amendment on eligible batches
            </p>
          </div>
          <div className="divide-y divide-gray-200">
            {eligibleBatches.map((batch) => (
              <div
                key={batch._id}
                className="px-5 py-4 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {batch.name || `Batch ${batch.year}`}
                  </p>
                  <p className="text-xs text-gray-500">
                    {batch.status || '-'} &middot; Started{' '}
                    {formatDate(batch.startDate)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      BATCH_STATUS_COLORS[batch.applicationStatus] ||
                      'bg-gray-100'
                    }`}
                  >
                    {batch.applicationStatus === 'NOT_APPLIED'
                      ? 'Not Applied'
                      : batch.applicationStatus}
                  </span>

                  {batch.notificationResult && (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {batch.notificationResult.sent || 0} sent
                    </span>
                  )}

                  {(batch.applicationStatus === 'NOT_APPLIED' ||
                    batch.applicationStatus === 'REVERTED' ||
                    batch.applicationStatus === 'PENDING') && (
                    <button
                      onClick={() => handleApply(batch._id)}
                      disabled={!!actionLoading}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {actionLoading === 'Apply' ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Play className="w-3 h-3" />
                      )}
                      Apply
                    </button>
                  )}

                  {batch.applicationStatus === 'APPLIED' && (
                    <button
                      onClick={() => handleRevert(batch._id)}
                      disabled={!!actionLoading}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-500 text-white text-xs font-medium rounded-lg hover:bg-orange-600 disabled:opacity-50"
                    >
                      {actionLoading === 'Revert' ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <RotateCcw className="w-3 h-3" />
                      )}
                      Revert
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Audit Trail */}
      {amendment.audit && amendment.audit.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Audit Trail
          </h3>
          <div className="space-y-3">
            {[...amendment.audit].reverse().map((entry, idx) => (
              <div key={entry._id || idx} className="flex gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                    {entry.action === 'APPROVED' ? (
                      <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                    ) : entry.action === 'REJECTED' ? (
                      <XCircle className="w-3.5 h-3.5 text-red-600" />
                    ) : entry.action === 'APPLIED' ? (
                      <Play className="w-3.5 h-3.5 text-blue-600" />
                    ) : entry.action === 'REVERTED' ? (
                      <RotateCcw className="w-3.5 h-3.5 text-orange-600" />
                    ) : entry.action === 'NOTIFIED' ? (
                      <Mail className="w-3.5 h-3.5 text-purple-600" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{entry.action}</span>
                    {entry.by?.name && (
                      <span className="text-gray-500">
                        {' '}
                        by {entry.by.name}
                      </span>
                    )}
                  </p>
                  {entry.meta?.batchName && (
                    <p className="text-xs text-gray-500">
                      Batch: {entry.meta.batchName}
                    </p>
                  )}
                  {entry.meta?.reason && (
                    <p className="text-xs text-red-500">
                      Reason: {entry.meta.reason}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDate(entry.at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseAmendmentDetail;
