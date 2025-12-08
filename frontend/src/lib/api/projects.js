import { useAuth } from "../../contexts/AuthContext";

const { apiRequest } = useAuth;

export async function createProject(project) {
  try {
    const response = await apiRequest("/api/admin/createProject", {
      method: "POST",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || error.errors?.[0]?.msg || 'Registration failed');
    }

    const data = await response.json();
  } catch (error) {
      console.error("error creating organization", error);
  }
}

export async function getProjects() {
  try {
    const response = await apiRequest("/api/admin/getProjects", {
      method: "GET",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || error.errors?.[0]?.msg || 'Registration failed');
    }

    const data = await response.json();
  } catch (error) {
      console.error("error creating organization", error);
  }
}

export async function getProject(id) {
    try {
        const response = await apiRequest("/api/admin/getProject", {
          method: "GET",
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.errors?.[0]?.msg || 'Registration failed');
      }

      const data = await response.json();
    } catch (error) {
        console.error("error creating organization", error);
    }
}

export async function updateProject(id, updates) {
    try {
        const response = await apiRequest("/api/admin/addUserToOrganization", {
          method: "POST",
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.errors?.[0]?.msg || 'Registration failed');
      }

      const data = await response.json();

      return data;
    } catch (error) {
        console.error("error creating organization", error);
    }
}
