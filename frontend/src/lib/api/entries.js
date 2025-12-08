import { useAuth } from "../../contexts/AuthContext";

const createEntry = async (entryData) => {
  const response = await fetch(`${API_URL}/api/entries`, {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify(entryData),
    credentials: 'include'
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create entry');
  }

  return response.json();
};

// Search entries with filters
export const searchEntries = async (query = '', filters = {}) => {
  const params = new URLSearchParams({ q: query, ...filters });
  const response = await fetch(`${API_URL}/api/entries?${params}`, {
    headers: getAuthHeader(),
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error('Failed to search entries');
  }

  return response.json();
};

// Get single entry with connections
export const getEntry = async (entryId) => {
  const response = await fetch(`${API_URL}/api/entries/${entryId}`, {
    headers: getAuthHeader(),
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error('Failed to fetch entry');
  }

  return response.json();
}

// Update an entry
export const updateEntry = async (entryId, updates) => {
  const response = await fetch(`${API_URL}/api/entries/${entryId}`, {
    method: 'PUT',
    headers: getAuthHeader(),
    body: JSON.stringify(updates),
    credentials: 'include'
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update entry');
  }

  return response.json();
}

// Delete an entry
export const deleteEntry = async (entryId) => {
  const response = await fetch(`${API_URL}/api/entries/${entryId}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error('Failed to delete entry');
  }

  return response.json();
}

// Link entries
export const linkEntries = async (parentId, childId, linkType = 'related_to') => {
  const response = await fetch(`${API_URL}/api/entries/${parentId}/links`, {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify({
      related_entry_id: childId,
      link_type: linkType
    }),
    credentials: 'include'
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create link');
  }

  return response.json();
};

// Get project timeline
export const getProjectTimeline = async (projectId) => {
  const response = await fetch(`${API_URL}/api/entries/timeline/${projectId}`, {
    headers: getAuthHeader(),
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error('Failed to fetch timeline');
  }

  return response.json();
};

// Get dashboard statistics
export const getStats = async () => {
  const response = await fetch(`${API_URL}/api/entries/stats/dashboard`, {
    headers: getAuthHeader(),
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error('Failed to fetch statistics');
  }

  return response.json();
}

