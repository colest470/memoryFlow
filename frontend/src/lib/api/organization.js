import { useAuth } from "../../contexts/AuthContext";

const { apiRequest } = useAuth();

export const CreateOrganization = async (data) => {
    try {
        const response = await apiRequest("/api/admin/createOrganization", {
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

export const AddUserToOrganization = async (data) => {
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
    } catch (error) {
        console.error("error creating organization", error);
    }
};

