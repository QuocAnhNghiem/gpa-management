import { apiClient } from './apiClient';

export const getAttendances = async () => {
  const response = await apiClient('/attendance');
  if (!response.ok) throw new Error('Failed to fetch attendances');
  return response.json();
};

export const updateAttendanceConfig = async (data) => {
  const response = await apiClient('/attendance/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Failed to update config');
  return response.json();
};

export const toggleAttendance = async (data) => {
  const response = await apiClient('/attendance/toggle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Failed to toggle attendance');
  return response.json();
};

export const deleteAttendance = async (id) => {
  const response = await apiClient(`/attendance/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Failed to delete attendance');
  return response.json();
};
