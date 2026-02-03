const API_URL = import.meta.env.VITE_API_BACKEND;

const getAuthHeader = () => ({
  'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
  'Content-Type': 'application/json'
});

export const loadData = async () => {
  try {
    // Fetch user profile
    const userResponse = await fetch(`${API_URL}/api/user/profile`, {
      headers: getAuthHeader(),
      credentials: 'include'
    });
    
    if (!userResponse.ok) {
      throw new Error('Failed to load user profile');
    }
    
    const userData = await userResponse.json();
    return userData.user;
  } catch (error) {
    console.error('Error loading user data:', error);
    return null;
  }
}

export const getUserProfile = async (email) => {
  try {
    const response = await fetch(`${API_URL}/api/user/${email}`);

    if (!response.ok) {
      throw new Error('Failed to fetch user profile');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
}
