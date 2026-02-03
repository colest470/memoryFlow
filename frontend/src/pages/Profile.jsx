import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Briefcase, Users, X, FileText, Link as LinkIcon } from 'lucide-react';
import { getUserProfile } from "../lib/api/user.js"; 

const Profile = () => {
  const { email } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [entries, setEntries] = useState([]);
  const [entryLinks, setEntryLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const modalRef = useRef(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        
        // This should be your API call to fetch user data with email
        const userData = await getUserProfile(email);
        
        if (userData.success) {
          setUser(userData.data);
          setProjects(userData.projects || []);
          setEntries(userData.entries || []);
          setEntryLinks(userData.entryLinks || []);
        } else {
          setError(userData.error || 'Failed to load user profile');
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError(err.message || 'Failed to load user profile');
        setLoading(false);
      }
    };

    fetchUserData();
  }, [email]);

  // Function to get entries linked to a specific entry
  const getLinkedEntries = (entryId) => {
    return entryLinks.filter(link => 
      link.parent_entry_id === entryId || link.child_entry_id === entryId
    ).map(link => {
      const linkedEntryId = link.parent_entry_id === entryId ? link.child_entry_id : link.parent_entry_id;
      return entries.find(entry => entry.id === linkedEntryId);
    }).filter(Boolean);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const getEntryIcon = (entryType) => {
    const icons = {
      'report': '📊',
      'meeting_note': '📝',
      'insight': '💡',
      'decision': '✅',
      'experiment': '🧪',
      'outcome': '📈',
      'proposal': '📋',
      'result': '🏆'
    };
    return icons[entryType] || '📄';
  };

  const getEntryColor = (entryType) => {
    const colors = {
      'report': 'from-blue-500 to-cyan-500',
      'meeting_note': 'from-green-500 to-emerald-500',
      'insight': 'from-yellow-500 to-orange-500',
      'decision': 'from-purple-500 to-pink-500',
      'experiment': 'from-red-500 to-rose-500',
      'outcome': 'from-indigo-500 to-violet-500',
      'proposal': 'from-teal-500 to-green-500',
      'result': 'from-amber-500 to-orange-500'
    };
    return colors[entryType] || 'from-gray-500 to-gray-600';
  };

  const handleEntryClick = (entry) => {
    setSelectedEntry({
      ...entry,
      linkedEntries: getLinkedEntries(entry.id)
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedEntry(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg">{error || 'User not found'}</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-6 py-2 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Cover Photo */}
      <div className="relative h-64">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-900/80 via-amber-900/60 to-black/80"></div>
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1519750783826-e2420f4d687f?q=80&w=1974')] bg-cover bg-center opacity-20"></div>
      </div>

      {/* Profile Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-10">
        <div className="bg-gray-900/90 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-orange-500/20">
          <div className="flex flex-col lg:flex-row items-start lg:items-center space-y-6 lg:space-y-0 lg:space-x-8">
            {/* Profile Image */}
            <div className="flex-shrink-0">
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-gray-900 shadow-xl">
                  {user.full_name?.charAt(0) || 'U'}
                </div>
                <div className="absolute -bottom-2 -right-2 bg-orange-500 text-black text-xs px-3 py-1 rounded-full font-bold animate-pulse">
                  {user.role || 'Member'}
                </div>
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">
                    {user.full_name}
                  </h1>
                  <p className="text-gray-400 mt-1">
                    {user.email}
                    {user.organization && ` • ${user.organization}`}
                  </p>
                  <p className="text-gray-300 mt-4 max-w-2xl">
                    {user.department && <span className="text-orange-400 font-medium">{user.department}</span>}
                    {user.department && user.role && ' • '}
                    {user.role && <span>{user.role}</span>}
                  </p>
                </div>

                {/* Stats */}
                <div className="flex space-x-8 mt-4 lg:mt-0">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-400">{projects.length}</div>
                    <div className="text-gray-400 text-sm">Projects</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-amber-400">{entries.length}</div>
                    <div className="text-gray-400 text-sm">Entries</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-yellow-400">{entryLinks.length}</div>
                    <div className="text-gray-400 text-sm">Connections</div>
                  </div>
                </div>
              </div>

              {/* Location and Contact Info */}
              <div className="flex flex-wrap items-center gap-6 mt-8 text-gray-300">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-orange-400" />
                  <span>Joined {formatDate(user.created_at)}</span>
                </div>
                
                {user.is_verified && (
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-green-400">Verified</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Projects Section */}
      {projects.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-2 flex items-center">
              <Briefcase className="h-8 w-8 mr-3 text-orange-400" />
              Projects
            </h2>
            <p className="text-gray-400">Projects {user.full_name} is involved in</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div 
                key={project.id} 
                className="group bg-gray-900/80 backdrop-blur-sm rounded-xl p-6 border border-orange-500/10 hover:border-orange-500/30 transition-all hover:scale-[1.02] cursor-pointer"
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-bold text-white group-hover:text-orange-300 transition-colors">
                    {project.title}
                  </h3>
                  <span className={`text-xs px-3 py-1 rounded-full ${
                    project.status === 'active' ? 'bg-green-500/20 text-green-400' :
                    project.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {project.status}
                  </span>
                </div>
                <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                  {project.description || 'No description'}
                </p>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span className="flex items-center">
                    <Users className="h-4 w-4 mr-1" />
                    {project.department || 'General'}
                  </span>
                  <span>{formatDate(project.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Memory Entries Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2 flex items-center">
            <FileText className="h-8 w-8 mr-3 text-amber-400" />
            Memory Entries
          </h2>
          <p className="text-gray-400">Knowledge contributions by {user.full_name}</p>
        </div>

        {entries.length === 0 ? (
          <div className="text-center py-16 bg-gray-900/50 rounded-2xl border border-dashed border-gray-700">
            <div className="text-gray-500 mb-4">
              <FileText className="h-20 w-20 mx-auto opacity-30" />
            </div>
            <h3 className="text-xl font-medium text-gray-300 mb-2">No entries yet</h3>
            <p className="text-gray-500">{user.full_name} hasn't created any memory entries.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {entries.map((entry) => {
              const linkedEntries = getLinkedEntries(entry.id);
              
              return (
                <div 
                  key={entry.id} 
                  className="group bg-gradient-to-br from-gray-900 to-black rounded-xl p-6 border border-gray-800 hover:border-orange-500/50 transition-all cursor-pointer hover:shadow-2xl hover:shadow-orange-900/20"
                  onClick={() => handleEntryClick(entry)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getEntryColor(entry.entry_type)} flex items-center justify-center text-2xl`}>
                        {getEntryIcon(entry.entry_type)}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white group-hover:text-orange-300 transition-colors">
                          {entry.title}
                        </h3>
                        <p className="text-gray-400 text-sm capitalize">{entry.entry_type.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-3 py-1 rounded-full ${
                      entry.status === 'active' ? 'bg-green-500/20 text-green-400' :
                      entry.status === 'archived' ? 'bg-gray-500/20 text-gray-400' :
                      'bg-orange-500/20 text-orange-400'
                    }`}>
                      {entry.status}
                    </span>
                  </div>
                  
                  <p className="text-gray-300 mb-4 line-clamp-3">
                    {entry.content || entry.genAISummary || 'No content available'}
                  </p>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-4">
                      {linkedEntries.length > 0 && (
                        <div className="flex items-center text-amber-400">
                          <LinkIcon className="h-4 w-4 mr-1" />
                          {linkedEntries.length} linked
                        </div>
                      )}
                      {entry.tags && (
                        <div className="text-gray-400">
                          {entry.tags.split(',').slice(0, 2).map(tag => (
                            <span key={tag} className="mr-2">#{tag.trim()}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-gray-500">
                      {formatDate(entry.created_at)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Entry Detail Modal */}
      {isModalOpen && selectedEntry && (
        <div
          ref={modalRef}
          className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
          onClick={(e) => e.target === modalRef.current && closeModal()}
        >
          <div className="relative bg-gradient-to-br from-gray-900 to-black rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-auto border border-orange-500/30">
            {/* Close Button */}
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-white z-10 p-2 hover:bg-gray-800 rounded-full transition-colors"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Entry Header */}
            <div className="p-8 border-b border-gray-800">
              <div className="flex items-start space-x-4">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${getEntryColor(selectedEntry.entry_type)} flex items-center justify-center text-3xl`}>
                  {getEntryIcon(selectedEntry.entry_type)}
                </div>
                <div className="flex-1">
                  <h2 className="text-3xl font-bold text-white mb-2">{selectedEntry.title}</h2>
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="text-orange-400 font-medium capitalize">{selectedEntry.entry_type.replace('_', ' ')}</span>
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      selectedEntry.status === 'active' ? 'bg-green-500/20 text-green-400' :
                      selectedEntry.status === 'archived' ? 'bg-gray-500/20 text-gray-400' :
                      'bg-orange-500/20 text-orange-400'
                    }`}>
                      {selectedEntry.status}
                    </span>
                    <span className="text-gray-400">{formatDate(selectedEntry.created_at)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Entry Content */}
            <div className="p-8">
              <div className="mb-8">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-orange-400" />
                  Content
                </h3>
                <div className="bg-gray-900/50 rounded-xl p-6">
                  <p className="text-gray-300 whitespace-pre-wrap">{selectedEntry.content || 'No content available'}</p>
                </div>
              </div>

              {/* AI Summary */}
              {selectedEntry.genAISummary && (
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                    <span className="mr-2">🤖</span>
                    AI Summary
                  </h3>
                  <div className="bg-gradient-to-r from-orange-900/20 to-amber-900/20 rounded-xl p-6 border border-orange-500/20">
                    <p className="text-gray-300">{selectedEntry.genAISummary}</p>
                  </div>
                </div>
              )}

              {/* Linked Entries */}
              {selectedEntry.linkedEntries && selectedEntry.linkedEntries.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                    <LinkIcon className="h-5 w-5 mr-2 text-amber-400" />
                    Linked Entries ({selectedEntry.linkedEntries.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedEntry.linkedEntries.map((linkedEntry) => (
                      <div 
                        key={linkedEntry.id}
                        className="bg-gray-900/50 rounded-xl p-4 hover:bg-gray-800/50 transition-colors cursor-pointer border border-gray-800"
                        onClick={() => {
                          setSelectedEntry({
                            ...linkedEntry,
                            linkedEntries: getLinkedEntries(linkedEntry.id)
                          });
                        }}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getEntryColor(linkedEntry.entry_type)} flex items-center justify-center text-lg`}>
                            {getEntryIcon(linkedEntry.entry_type)}
                          </div>
                          <div>
                            <h4 className="font-medium text-white">{linkedEntry.title}</h4>
                            <p className="text-gray-400 text-sm capitalize">{linkedEntry.entry_type.replace('_', ' ')}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div>
                <h3 className="text-xl font-bold text-white mb-4">Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {selectedEntry.department && (
                    <div className="bg-gray-900/30 rounded-lg p-4">
                      <p className="text-gray-400 mb-1">Department</p>
                      <p className="text-orange-400 font-medium">{selectedEntry.department}</p>
                    </div>
                  )}
                  {selectedEntry.tags && (
                    <div className="bg-gray-900/30 rounded-lg p-4">
                      <p className="text-gray-400 mb-1">Tags</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedEntry.tags.split(',').map((tag, index) => (
                          <span key={index} className="px-3 py-1 bg-orange-500/10 text-orange-400 rounded-full text-xs">
                            {tag.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="bg-gray-900/30 rounded-lg p-4">
                    <p className="text-gray-400 mb-1">Last Updated</p>
                    <p className="text-gray-300">{formatDate(selectedEntry.updated_at)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;


// import React, { useState, useEffect } from 'react';
// import { useAuth } from '../contexts/AuthContext';
// import { User, Mail, Shield, Save } from 'lucide-react';
// import LoadingSpinner from '../components/LoadingSpinner';

// const Profile = () => {
//   const { user, updateProfile } = useAuth();
//   const [bio, setBio] = useState(user?.bio || '');
//   const [loading, setLoading] = useState(false);
//   const [success, setSuccess] = useState('');
//   const [error, setError] = useState('');

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setError('');
//     setSuccess('');
//     setLoading(true);

//     useEffect(() => {
//       const userEmail = (location.href).split("/").length - 1;


//     }, []);

//     try {
//       await updateProfile(bio, user?.role);
//       setSuccess('Profile updated successfully!');
//       setTimeout(() => setSuccess(''), 3000);
//     } catch (error) {
//       setError(error instanceof Error ? error.message : 'Failed to update profile');
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gray-50 py-8">
//       <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
//         <div className="mb-8">
//           <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
//           <p className="text-gray-600 mt-2">Manage your account information and preferences</p>
//         </div>

//         <div className="bg-white rounded-lg shadow-md p-6 mb-6">
//           <div className="flex items-center space-x-6 mb-6">
//             <div className="bg-blue-100 p-6 rounded-full">
//               <User className="h-12 w-12 text-blue-600" />
//             </div>
//             <div>
//               <h2 className="text-2xl font-semibold text-gray-900">{user?.email}</h2>
//               <div className="flex items-center mt-2">
//                 {user?.isVerified ? (
//                   <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
//                     <Shield className="h-4 w-4 mr-1" />
//                     Verified Account
//                   </span>
//                 ) : (
//                   <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
//                     <Mail className="h-4 w-4 mr-1" />
//                     Verification Pending
//                   </span>
//                 )}
//               </div>
//             </div>
//           </div>

//           <form onSubmit={handleSubmit}>
//             <div className="mb-6">
//               <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
//                 Bio
//               </label>
//               <textarea
//                 id="bio"
//                 rows={4}
//                 value={bio}
//                 onChange={(e) => setBio(e.target.value)}
//                 maxLength={500}
//                 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-colors"
//                 placeholder="Tell us about yourself..."
//               />
//               <div className="flex justify-between items-center mt-2">
//                 <p className="text-sm text-gray-500">Share a bit about yourself (optional)</p>
//                 <p className="text-sm text-gray-500">{bio.length}/500</p>
//               </div>
//             </div>

//             {error && (
//               <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
//                 {error}
//               </div>
//             )}

//             {success && (
//               <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
//                 {success}
//               </div>
//             )}

//             <button
//               type="submit"
//               disabled={loading}
//               className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-200"
//             >
//               {loading ? (
//                 <LoadingSpinner />
//               ) : (
//                 <>
//                   <Save className="h-4 w-4 mr-2" />
//                   Save Changes
//                 </>
//               )}
//             </button>
//           </form>
//         </div>
//         <div className="bg-white rounded-lg shadow-md p-6">
//           <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>
//           <div className="space-y-4">
//             <div className="flex items-center justify-between py-3 border-b border-gray-200">
//               <div>
//                 <p className="text-sm font-medium text-gray-900">Email Address</p>
//                 <p className="text-sm text-gray-600">{user?.email}</p>
//               </div>
//               <span className="text-sm text-gray-500">Cannot be changed</span>
//             </div>

//             <div className="flex items-center justify-between py-3 border-b border-gray-200">
//               <div>
//                 <p className="text-sm font-medium text-gray-900">Account Status</p>
//                 <p className="text-sm text-gray-600">
//                   {user?.isVerified ? 'Verified and Active' : 'Verification Pending'}
//                 </p>
//               </div>
//               {user?.isVerified ? (
//                 <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
//                   Verified
//                 </span>
//               ) : (
//                 <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
//                   Pending
//                 </span>
//               )}
//             </div>

//             <div className="pt-3">
//               <p className="text-sm font-medium text-gray-900 mb-2">Security</p>
//               <p className="text-sm text-gray-600 mb-4">
//                 Keep your account secure by using a strong password and enabling available security features.
//               </p>
//               <a
//                 href="/verify-code"
//                 className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
//               >
//                 Change Password
//               </a>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Profile;