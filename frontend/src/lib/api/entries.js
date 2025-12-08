const API_URL = import.meta.env.VITE_API_BACKEND;

const getAuthHeader = () => ({
  'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
  'Content-Type': 'application/json'
});

export const entriesAPI = {
  // Create a new entry
  async createEntry(entryData) {
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
  },

  // Search entries with filters
  async searchEntries(query = '', filters = {}) {
    const params = new URLSearchParams({ q: query, ...filters });
    const response = await fetch(`${API_URL}/api/entries?${params}`, {
      headers: getAuthHeader(),
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to search entries');
    }

    return response.json();
  },

  // Get single entry with connections
  async getEntry(entryId) {
    const response = await fetch(`${API_URL}/api/entries/${entryId}`, {
      headers: getAuthHeader(),
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to fetch entry');
    }

    return response.json();
  },

  // Update an entry
  async updateEntry(entryId, updates) {
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
  },

  // Delete an entry
  async deleteEntry(entryId) {
    const response = await fetch(`${API_URL}/api/entries/${entryId}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to delete entry');
    }

    return response.json();
  },

  // Link entries
  async linkEntries(parentId, childId, linkType = 'related_to') {
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
  },

  // Get project timeline
  async getProjectTimeline(projectId) {
    const response = await fetch(`${API_URL}/api/entries/timeline/${projectId}`, {
      headers: getAuthHeader(),
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to fetch timeline');
    }

    return response.json();
  },

  // Get dashboard statistics
  async getStats() {
    const response = await fetch(`${API_URL}/api/entries/stats/dashboard`, {
      headers: getAuthHeader(),
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to fetch statistics');
    }

    return response.json();
  },

  // Semantic search with vector embeddings
  async semanticSearch(query, options = {}) {
    const { limit = 10, minSimilarity = 0.3 } = options;
    const response = await fetch(`${API_URL}/api/entries/search/semantic`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({
        query,
        limit,
        minSimilarity
      }),
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to perform semantic search');
    }

    return response.json();
  },

  // Record a user action (reuse, share, edit, rate, view)
  async recordAction(entryId, actionType, options = {}) {
    const { rating = null } = options;
    const response = await fetch(`${API_URL}/api/entries/${entryId}/action`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({
        action_type: actionType,
        rating
      }),
      credentials: 'include'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to record action');
    }

    return response.json();
  },

  // Get action history for an entry
  async getActionHistory(entryId, filters = {}) {
    const params = new URLSearchParams(filters);
    const response = await fetch(`${API_URL}/api/entries/${entryId}/actions?${params}`, {
      headers: getAuthHeader(),
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to fetch action history');
    }

    return response.json();
  },

  // Get user's activity summary
  async getUserActivity() {
    const response = await fetch(`${API_URL}/api/entries/user/activity`, {
      headers: getAuthHeader(),
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user activity');
    }

    return response.json();
  },

  // Get similarity graph and related entries
  async getEntryGraph(entryId) {
    const response = await fetch(`${API_URL}/api/entries/${entryId}/graph`, {
      headers: getAuthHeader(),
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to fetch entry graph');
    }

    return response.json();
  },

  // Get organization-level insights
  async getOrganizationInsights() {
    const response = await fetch(`${API_URL}/api/entries/insights/organization`, {
      headers: getAuthHeader(),
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to fetch organization insights');
    }

    return response.json();
  }
};
