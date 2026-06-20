import { apiClient } from './apiClient';

const API_URL = '/vocabulary';

const handleResponse = async (response) => {
  const data = await response.json();
  if (!response.ok || (data && data.success === false)) {
    throw new Error(data.message || 'Đã xảy ra lỗi khi xử lý yêu cầu');
  }
  return data;
};

export const getVocabularies = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.topic) params.append('topic', filters.topic);
  if (filters.status) params.append('status', filters.status);

  const response = await apiClient(`${API_URL}?${params.toString()}`);
  return handleResponse(response);
};

export const createVocabulary = async (vocabData) => {
  const response = await apiClient(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(vocabData)
  });
  return handleResponse(response);
};

export const updateVocabulary = async (id, vocabData) => {
  const response = await apiClient(`${API_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(vocabData)
  });
  return handleResponse(response);
};

export const updateVocabularyStatus = async (id, status) => {
  const response = await apiClient(`${API_URL}/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  return handleResponse(response);
};

export const deleteVocabulary = async (id) => {
  const response = await apiClient(`${API_URL}/${id}`, {
    method: 'DELETE'
  });
  return handleResponse(response);
};

export const getFlashcards = async (topic) => {
  const url = topic ? `${API_URL}/flashcards?topic=${topic}` : `${API_URL}/flashcards`;
  const response = await apiClient(url);
  return handleResponse(response);
};

