import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Mail, Shield, Save } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const [bio, setBio] = useState(user?.bio || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  console.log(user);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await updateProfile(bio, user?.role);
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
          <p className="text-gray-600 mt-2">Manage your account information and preferences</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center space-x-6 mb-6">
            <div className="bg-blue-100 p-6 rounded-full">
              <User className="h-12 w-12 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">{user?.email}</h2>
              <div className="flex items-center mt-2">
                {user?.isVerified ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    <Shield className="h-4 w-4 mr-1" />
                    Verified Account
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                    <Mail className="h-4 w-4 mr-1" />
                    Verification Pending
                  </span>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
                Bio
              </label>
              <textarea
                id="bio"
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={500}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-colors"
                placeholder="Tell us about yourself..."
              />
              <div className="flex justify-between items-center mt-2">
                <p className="text-sm text-gray-500">Share a bit about yourself (optional)</p>
                <p className="text-sm text-gray-500">{bio.length}/500</p>
              </div>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-200"
            >
              {loading ? (
                <LoadingSpinner />
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </button>
          </form>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-200">
              <div>
                <p className="text-sm font-medium text-gray-900">Email Address</p>
                <p className="text-sm text-gray-600">{user?.email}</p>
              </div>
              <span className="text-sm text-gray-500">Cannot be changed</span>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-200">
              <div>
                <p className="text-sm font-medium text-gray-900">Account Status</p>
                <p className="text-sm text-gray-600">
                  {user?.isVerified ? 'Verified and Active' : 'Verification Pending'}
                </p>
              </div>
              {user?.isVerified ? (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Verified
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  Pending
                </span>
              )}
            </div>

            <div className="pt-3">
              <p className="text-sm font-medium text-gray-900 mb-2">Security</p>
              <p className="text-sm text-gray-600 mb-4">
                Keep your account secure by using a strong password and enabling available security features.
              </p>
              <a
                href="/verify-code"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Change Password
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
