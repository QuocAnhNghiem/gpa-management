import { apiClient, parseApiResponse } from './apiClient';

export const getSubjects = async ({ year, semester } = {}) => {
  let url = '/subjects';
  const params = new URLSearchParams();
  if (year) params.append('year', year);
  if (semester) params.append('semester', semester);
  if (params.toString()) url += `?${params.toString()}`;
  
  const response = await apiClient(url);
  return parseApiResponse(response, 'Không thể tải danh sách môn học');
};

export const createSubject = async (subjectData) => {
  const response = await apiClient('/subjects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subjectData)
  });
  return parseApiResponse(response, 'Không thể tạo môn học');
};

export const updateSubject = async (id, subjectData) => {
  const response = await apiClient(`/subjects/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subjectData)
  });
  return parseApiResponse(response, 'Không thể cập nhật môn học');
};

export const deleteSubject = async (id, { deleteAttendance = false } = {}) => {
  const suffix = deleteAttendance ? '?deleteAttendance=true' : '';
  const response = await apiClient(`/subjects/${id}${suffix}`, {
    method: 'DELETE',
  });
  return parseApiResponse(response, 'Không thể xóa môn học');
};
