import { getAccessToken } from "./tokenStore";

const API_URL = import.meta.env.VITE_API_BACKEND;

const getAuthHeader = () => ({
  'Authorization': `Bearer ${getAccessToken()}`,
  'Content-Type': 'application/json'
});

export const CreateOrganization = async (data) => {
    try {
        const response = await fetch(`${API_URL}/api/admin/createOrganization`, {
            method: "POST",
            headers: getAuthHeader(),
            body: JSON.stringify(data),
            credentials: 'include'
        });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.errors?.[0]?.msg || 'Registration failed');
      }

      return await response.json();
    } catch (error) {
        console.error("error creating organization", error);
        throw error;
    }
}

export const AddUserToOrganization = async (data) => {
    try {
        const response = await fetch(`${API_URL}/api/admin/addUserToOrganization`, {
            method: "POST",
            headers: getAuthHeader(),
            body: JSON.stringify(data),
            credentials: 'include'
        });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.errors?.[0]?.msg || 'Registration failed');
      }

      return await response.json();
    } catch (error) {
        console.error("error creating organization", error);
        throw error;
    }
};

export const RemoveUserFromOrganization = async (data) => {
    try {
        const response = await fetch(`${API_URL}/api/admin/removeUserFromOrganization`, {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            credentials: 'include'
        });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.errors?.[0]?.msg || 'Registration failed');
      }

      return await response.json();
    } catch (error) {
        console.error("error creating organization", error);
        throw error;
    }
};
