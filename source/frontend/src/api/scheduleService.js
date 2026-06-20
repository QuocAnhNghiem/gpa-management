import { apiClient } from './apiClient';

export const getSchedules = async () => {
  const response = await apiClient('/schedule');
  if (!response.ok) throw new Error('Failed to fetch schedules');
  return response.json();
};

export const createSchedule = async (scheduleData) => {
  const response = await apiClient('/schedule', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(scheduleData)
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(errorData.message || 'Failed to create schedule');
    error.status = response.status;
    error.response = { status: response.status, data: errorData };
    throw error;
  }
  return response.json();
};

export const updateSchedule = async (id, scheduleData) => {
  const response = await apiClient(`/schedule/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(scheduleData)
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(errorData.message || 'Failed to update schedule');
    error.status = response.status;
    error.response = { status: response.status, data: errorData };
    throw error;
  }
  return response.json();
};

export const deleteSchedule = async (id) => {
  const response = await apiClient(`/schedule/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete schedule');
  return response.json();
};
