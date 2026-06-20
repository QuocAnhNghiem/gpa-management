import { apiClient } from './apiClient';

const handleResponse = async (response) => {
  const data = await response.json();
  if (!response.ok || data.success === false) {
    throw new Error(data.message || 'Không thể xử lý đồng bộ ERP');
  }
  return data;
};

export const previewUsthErpSync = async (payload) => {
  const response = await apiClient('/integrations/usth-erp/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
};

export const syncUsthErp = async (payload) => {
  const response = await apiClient('/integrations/usth-erp/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
};

export const getUsthErpHistory = async () => {
  const response = await apiClient('/integrations/usth-erp/history');
  return handleResponse(response);
};
