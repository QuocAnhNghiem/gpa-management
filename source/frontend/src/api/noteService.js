import { apiClient } from './apiClient';

export const getNotes = async () => {
  const response = await apiClient('/notes');
  if (!response.ok) throw new Error('Failed to fetch notes');
  return response.json();
};

export const createNote = async (noteData) => {
  const response = await apiClient('/notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(noteData)
  });
  if (!response.ok) throw new Error('Failed to create note');
  return response.json();
};

export const updateNote = async (id, noteData) => {
  const response = await apiClient(`/notes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(noteData)
  });
  if (!response.ok) throw new Error('Failed to update note');
  return response.json();
};

export const deleteNote = async (id) => {
  const response = await apiClient(`/notes/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete note');
  return response.json();
};
