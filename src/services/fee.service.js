import api from './api';

// ==================== Fee Structures ====================

export const getFeeStructures = async (params = {}) => {
  const response = await api.get('/fees/structures', { params });
  return response.data;
};

export const getFeeStructureById = async (id) => {
  const response = await api.get(`/fees/structures/${id}`);
  return response.data;
};

export const createFeeStructure = async (data) => {
  const response = await api.post('/fees/structures', data);
  return response.data;
};

export const updateFeeStructure = async (id, data) => {
  const response = await api.put(`/fees/structures/${id}`, data);
  return response.data;
};

export const deleteFeeStructure = async (id) => {
  const response = await api.delete(`/fees/structures/${id}`);
  return response.data;
};

export const generateFeeRecords = async (structureId) => {
  const response = await api.post(`/fees/structures/${structureId}/generate-records`);
  return response.data;
};

// ==================== Student Fee Records ====================

export const getFeeRecords = async (params = {}) => {
  const response = await api.get('/fees/records', { params });
  return response.data;
};

export const getFeeRecordById = async (id) => {
  const response = await api.get(`/fees/records/${id}`);
  return response.data;
};

export const markFeeRecordPaid = async (id, data) => {
  const response = await api.put(`/fees/records/${id}/mark-paid`, data);
  return response.data;
};

export const bulkMarkPaid = async (data) => {
  const response = await api.put('/fees/records/bulk-mark-paid', data);
  return response.data;
};

// ==================== Dashboard & Utilities ====================

export const getFeeDashboard = async (params = {}) => {
  const response = await api.get('/fees/dashboard', { params });
  return response.data;
};

export const recalculateLateFees = async () => {
  const response = await api.post('/fees/recalculate-late-fees');
  return response.data;
};

export const syncLockStatus = async () => {
  const response = await api.post('/fees/sync-lock-status');
  return response.data;
};

// ==================== Programs (for dropdown) ====================

export const getProgramsDropdown = async () => {
  const response = await api.get('/programs/dropdown');
  return response.data;
};
