import { useAuth } from "../../contexts/AuthContext";

const API_URL = import.meta.env.VITE_API_BACKEND;

const getAuthHeader = () => ({
  'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
  'Content-Type': 'application/json'
});

export async function createProject(projectData) {
  try {
    const response = await fetch(`${API_URL}/api/projects`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(projectData),
      credentials: 'include'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create project');
    }

    const data = await response.json();
    return data.project;
  } catch (error) {
    console.error('Error creating project:', error);
    throw error;
  }
}

export async function getProjects() {
  try {
    const response = await fetch(`${API_URL}/api/projects/`, {
      method: "GET",
      headers: getAuthHeader(),
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error('Failed to fetch projects');
    }

    const data = await response.json();
    return data.projects || [];
  } catch (error) {
    console.error('Error fetching projects:', error);
    throw error;
  }
}

export async function getProject(id) {
  try {
    const response = await fetch(`${API_URL}/api/projects/${id}`, {
      method: 'GET',
      headers: getAuthHeader(),
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to fetch project');
    }

    const data = await response.json();
    console.log('Fetched project:', data);
    return data.project;
  } catch (error) {
    console.error('Error fetching project:', error);
    throw error;
  }
}

export async function updateProject(id, updates) {
  try {
    const response = await fetch(`${API_URL}/api/projects/${id}`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify(updates),
      credentials: 'include'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update project');
    }

    const data = await response.json();
    return data.project;
  } catch (error) {
    console.error('Error updating project:', error);
    throw error;
  }
}

export async function deleteProject(id) {
  try {
    const response = await fetch(`${API_URL}/api/projects/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to delete project');
    }

    return await response.json();
  } catch (error) {
    console.error('Error deleting project:', error);
    throw error;
  }
}

export async function analyzeProject(id) {
  try {
    const response = await fetch(`${API_URL}/api/projects/${id}/analyze`, {
      method: 'POST',
      headers: getAuthHeader(),
      credentials: 'include',
      body: JSON.stringify({ analysisType: "comprehensive" })
    });

    if (!response.ok) {
      throw new Error('Failed to analyze project');
    }

    return await response.json();
  } catch (error) {
    console.error('Error analyzing project:', error);
    throw error;
  }
}

export async function getProjectMembers(projectId) {
  try {
    const response = await fetch(`${API_URL}/api/projects/${projectId}/members`, {
      method: 'GET',
      headers: getAuthHeader(),
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error('Failed to fetch project members');
    }
    const data = await response.json();
    return data.members || [];
  } catch (error) {
    console.error('Error fetching project members:', error);
    throw error;
  }
}

export async function addProjectMember(projectId, userId, role) {
  try {
    console.log('Adding member:', { projectId, userId, role });
    const response = await fetch(`${API_URL}/api/projects/${projectId}/members`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({ user_id: userId, role }),
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to add project member');
    }
    return await response.json();
  } catch (error) {
    console.error('Error adding project member:', error);
    throw error;
  }
}

export async function removeProjectMember(projectId, userId) {
  try {
    const response = await fetch(`${API_URL}/api/projects/${projectId}/members`, {
      method: 'DELETE',
      headers: getAuthHeader(),
      body: JSON.stringify({ user_id: userId }),
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to remove project member');
    }

    return await response.json();
  } catch (error) {
    console.error('Error removing project member:', error);
    throw error;
  }
}

export async function searchAddMember (query, projectId) {
  try {
    const response = await fetch(`${API_URL}/api/projects/${projectId}/searchAddMember`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({ query }),
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to search and add member');
    }

    return await response.json();
  } catch (error) {
    console.error('Error searching and adding member:', error);
    throw error;
  }
}

export async function uploadfiles(projectId) {
  try {
    const response = await fetch(`${API_URL}/api/projects/${projectId}/uploadfiles`, {
      method: "POST",
      headers: getAuthHeader(),
      credentials: "include",
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      throw new Error("Failed to analyze the files", error)
    }

    return await response.json()
  } catch (error) {
    console.error("Error uploading files!")
    throw error;
  }
}

export async function getAnalysis(projectId) {
  try {
    const response = await fetch(`${API_URL}/api/projects/${projectId}/analysis`, {
      headers: getAuthHeader(),
      credentials: "include",
      method: "GET"
    });

    if (!response.ok) {
      throw new Error("Error getting analysis!");
    }

    return await response.json();
  } catch (error) {
    console.error(error);
  }
}