import { apiClient } from './apiClient';

export const getSummary = async () => {
  const response = await apiClient('/dashboard/summary');
  if (!response.ok) throw new Error('Failed to fetch dashboard summary');
  return response.json();
};
