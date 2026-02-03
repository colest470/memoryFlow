import React from "react";
import { useState, useEffect } from 'react';
import { useAuth } from "../../contexts/AuthContext";
import { getProjectMembers, addProjectMember, removeProjectMember, searchAddMember } from "../../lib/api/projects";
import { Plus, X, User, Shield, UserPlus, Search, Check, UserX } from 'lucide-react';

const ProjectMembers = ({ projectId }) => {
    const { user } = useAuth();
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddMemberForm, setShowAddMemberForm] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [newMemberRole, setNewMemberRole] = useState('viewer');
    const [addingMember, setAddingMember] = useState(false);
    const [isOwner, setIsOwner] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [searchError, setSearchError] = useState('');

    const fetchMembers = async () => {
        try {
            setLoading(true);
            const data = await getProjectMembers(projectId);
            console.log('Fetched members:', data);
            setMembers(data);
            
            const currentUserMember = data.find(m => m.id === user.id || m.userId === user.id);
            if (currentUserMember && currentUserMember.role === 'owner') {
                setIsOwner(true);
            } else {
                setIsOwner(false);
            }
            
            console.log('Current user member:', currentUserMember);
            console.log('Is owner:', currentUserMember?.role === 'owner');
        } catch (error) {
            console.error('Error fetching project members:', error);
            setIsOwner(false);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMembers();
    }, [projectId]);

    // Debounced search function
    useEffect(() => {
        const searchTimeout = setTimeout(async () => {
            if (searchQuery.trim().length > 1) {
                await performSearch(searchQuery);
            } else {
                setSearchResults([]);
                setSearchError('');
            }
        }, 500);

        return () => clearTimeout(searchTimeout);
    }, [searchQuery]);

    const performSearch = async (query) => {
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        try {
            setSearching(true);
            setSearchError('');
            const results = await searchAddMember(query, projectId);
            
            console.log('Search results:', results);
            
            // Filter out users who are already members
            const filteredResults = results.users?.filter(result => 
                !members.some(member => 
                    member.email === result.email || 
                    member.id === result.id ||
                    member.userId === result.id
                )
            );

            console.log('Filtered results:', filteredResults);
            
            setSearchResults(filteredResults);
            
            if (filteredResults.length === 0 && results.length > 0) {
                setSearchError('User is already a member of this project');
            } else if (filteredResults.length === 0) {
                setSearchError('No users found matching your search');
            }
        } catch (error) {
            console.error('Error searching for users:', error);
            setSearchError('Error searching for users. Please try again.');
            setSearchResults([]);
        } finally {
            setSearching(false);
        }
    };

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchQuery(value);
        setSelectedUser(null);
        if (!value.trim()) {
            setSearchResults([]);
            setSearchError('');
        }
    };

    const handleSelectUser = (user) => {
        setSelectedUser(user);
        setSearchQuery(user.name || user.email);
        setSearchResults([]);
        setSearchError('');
    };

    const handleAddMember = async (e) => {
        e.preventDefault();
        if (!selectedUser) {
            setSearchError('Please select a user from the search results');
            return;
        }
        
        try {
            setAddingMember(true);
            
            // Add the selected user with the chosen role
            await addProjectMember(projectId, selectedUser.id, newMemberRole);


            
            // Add the user to the members list
            const newMember = {
                id: selectedUser.id,
                userId: selectedUser.id,
                email: selectedUser.email,
                name: selectedUser.full_name,
                role: newMemberRole,
                avatar: selectedUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUser.name || selectedUser.email.split('@')[0])}&background=random&color=fff&bold=true`
            };
            
            setMembers([...members, newMember]);
            
            // Reset form
            setSearchQuery('');
            setSelectedUser(null);
            setSearchResults([]);
            setNewMemberRole('member');
            setShowAddMemberForm(false);
            setSearchError('');
            
        } catch (error) {
            console.error('Error adding project member:', error);
            setSearchError('Failed to add member. Please try again.');
        } finally {
            setAddingMember(false);
        }
    };

    const handleRemoveMember = async (memberId) => {
        if (!window.confirm('Are you sure you want to remove this member?')) return;
        
        try {
            await removeProjectMember(projectId, memberId);
            setMembers(members.filter(member => member.id !== memberId));
            
            // If removing self, update ownership status
            if (memberId === user.id) {
                await fetchMembers();
            }
        } catch (error) {
            console.error('Error removing project member:', error);
            alert('Failed to remove member');
        }
    };

    const getRoleIcon = (role) => {
        switch (role) {
            case 'owner':
                return <Shield className="w-4 h-4 text-orange-500" />;
            case 'admin':
                return <Shield className="w-4 h-4 text-orange-400" />;
            case 'editor':
                return <User className="w-4 h-4 text-orange-300" />;
            default:
                return <User className="w-4 h-4 text-gray-400" />;
        }
    };

    const getRoleDisplayName = (role) => {
        switch (role) {
            case 'owner': return 'Owner';
            case 'admin': return 'Admin';
            case 'editor': return 'Editor';
            default: return 'Member';
        }
    };

    if (loading) {
        return (
            <div className="animate-pulse space-y-4">
                <div className="h-6 bg-gray-800 rounded w-1/4"></div>
                <div className="h-20 bg-gray-800 rounded"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-white">Team Members</h2>
                    <p className="text-sm text-gray-400 mt-1">
                        {members.length} member{members.length !== 1 ? 's' : ''} • 
                        {isOwner ? ' You can add/remove members' : ' Only admins can add/remove members'}
                    </p>
                </div>
                {isOwner && (
                    <button
                        onClick={() => setShowAddMemberForm(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors font-medium text-sm hover:shadow-lg hover:shadow-orange-600/20"
                    >
                        <UserPlus className="w-4 h-4" />
                        Add Member
                    </button>
                )}
            </div>

            {showAddMemberForm && (
                <div className="bg-gray-900 border border-gray-800 rounded-lg shadow-lg p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-semibold text-white">Add Team Member</h3>
                            <p className="text-sm text-gray-400 mt-1">Search for users by name or email</p>
                        </div>
                        <button
                            onClick={() => {
                                setShowAddMemberForm(false);
                                setSearchQuery('');
                                setSelectedUser(null);
                                setSearchResults([]);
                                setSearchError('');
                                setNewMemberRole('member');
                            }}
                            className="text-gray-400 hover:text-white p-1 hover:bg-gray-800 rounded transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    
                    <form onSubmit={handleAddMember} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Search Users
                            </label>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                                    <Search className="w-5 h-5" />
                                </div>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={handleSearchChange}
                                    className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 placeholder-gray-500"
                                    placeholder="Type name or email to search..."
                                    disabled={addingMember}
                                    autoFocus
                                />
                                {searching && (
                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-500"></div>
                                    </div>
                                )}
                            </div>
                            
                            {searchError && (
                                <div className="mt-2 p-3 bg-red-900/30 border border-red-800 rounded-lg flex items-start gap-2">
                                    <X className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-sm text-red-300">{searchError}</p>
                                </div>
                            )}
                            
                            {/* Search Results */}
                            {searchResults.length > 0 && (
                                <div className="mt-3 border border-gray-800 rounded-lg overflow-hidden shadow-lg">
                                    <div className="max-h-60 overflow-y-auto bg-gray-900">
                                        {searchResults.map((result) => (
                                            <button
                                                type="button"
                                                key={result.id}
                                                onClick={() => handleSelectUser(result)}
                                                className={`w-full p-3 flex items-center gap-3 hover:bg-gray-800 border-b border-gray-800 last:border-b-0 transition-colors ${
                                                    selectedUser?.id === result.id ? 'bg-orange-900/20' : ''
                                                }`}
                                            >
                                                <img
                                                    src={result.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(result.full_name || result.email.split('@')[0])}&background=orange&color=fff&bold=true`}
                                                    alt={result.full_name}
                                                    className="w-8 h-8 rounded-full border border-gray-700"
                                                />
                                                <div className="flex-1 text-left">
                                                    <p className="font-medium text-white">
                                                        {result.full_name}
                                                    </p>
                                                    <p className="text-sm text-gray-400">{result.email}</p>
                                                </div>
                                                {selectedUser?.id === result.id && (
                                                    <Check className="w-5 h-5 text-orange-500" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        {selectedUser && (
                            <div className="bg-orange-900/20 border border-orange-800/30 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="font-semibold text-white">Selected User</h4>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedUser(null);
                                            setSearchQuery('');
                                            setSearchResults([]);
                                        }}
                                        className="text-gray-400 hover:text-white transition-colors"
                                    >
                                        <UserX className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="flex items-center gap-3">
                                    <img
                                        src={selectedUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUser.name || selectedUser.email.split('@')[0])}&background=orange&color=fff&bold=true`}
                                        alt={selectedUser.full_name}
                                        className="w-12 h-12 rounded-full border border-orange-800/30"
                                    />
                                    <div>
                                        <p className="font-semibold text-white">
                                            {selectedUser.full_name}
                                        </p>
                                        <p className="text-sm text-gray-400">{selectedUser.email}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Assign Role
                            </label>
                            <select
                                value={newMemberRole}
                                onChange={(e) => setNewMemberRole(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                disabled={addingMember}
                            >
                                <option value="owner">Owner (Full Control)</option>
                                <option value="editor">Editor (Can Create & Edit Entries)</option>
                                <option value="viewer">Member (View Only)</option>
                            </select>
                            <p className="text-xs text-gray-500 mt-2">
                                {newMemberRole === 'owner' && 'Admins have full control over the project including member management'}
                                {newMemberRole === 'editor' && 'Editors can create, edit, and delete entries'}
                                {newMemberRole === 'viewer' && 'Members can only view project entries'}
                            </p>
                        </div>
                        
                        <div className="flex gap-3 pt-4 border-t border-gray-800">
                            <button
                                type="submit"
                                disabled={addingMember || !selectedUser}
                                className="flex-1 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:shadow-lg hover:shadow-orange-600/20"
                            >
                                {addingMember ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        Adding...
                                    </span>
                                ) : (
                                    `Add as ${getRoleDisplayName(newMemberRole)}`
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowAddMemberForm(false);
                                    setSearchQuery('');
                                    setSelectedUser(null);
                                    setSearchResults([]);
                                    setSearchError('');
                                    setNewMemberRole('viewer');
                                }}
                                className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-medium transition-colors"
                                disabled={addingMember}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="border border-gray-800 rounded-lg overflow-hidden bg-gray-900">
                {members.length === 0 ? (
                    <div className="text-center py-12">
                        <User className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                        <p className="text-gray-400 mb-4">No team members added yet</p>
                        {isOwner && (
                            <button
                                onClick={() => setShowAddMemberForm(true)}
                                className="text-orange-500 hover:text-orange-400 font-medium transition-colors"
                            >
                                Add your first team member
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="divide-y divide-gray-800">
                        {members.map((member) => (
                            <div 
                                key={member.id} 
                                className={`flex items-center justify-between p-4 hover:bg-gray-800 transition-colors ${
                                    (member.id === user.id || member.userId === user.id) ? 'bg-orange-900/10 border-l-4 border-l-orange-500' : ''
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <img
                                        src={member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.full_name)}&background=orange&color=fff&bold=true`}
                                        alt={member.full_name || member.email}
                                        className="w-10 h-10 rounded-full border border-gray-700"
                                    />
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-white">
                                                {member.full_name || member.name || member.email}
                                            </p>
                                            {(member.id === user.id || member.userId === user.id) && (
                                                <span className="text-xs bg-orange-500/20 text-orange-300 px-2 py-1 rounded border border-orange-500/30">
                                                    You
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-400">{member.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        {getRoleIcon(member.role)}
                                        <span className="text-sm font-medium text-gray-300">
                                            {getRoleDisplayName(member.role)}
                                        </span>
                                    </div>
                                    {isOwner && member.role !== 'owner' && (
                                        <button
                                            onClick={() => handleRemoveMember(member.id)}
                                            className="text-red-400 hover:text-red-300 text-sm font-medium hover:bg-red-900/20 px-2 py-1 rounded transition-colors"
                                            title="Remove member"
                                            disabled={member.id === user.id}
                                        >
                                            {member.id === user.id ? 'Cannot remove yourself' : 'Remove'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="text-sm text-gray-400 p-4 bg-gray-900 border border-gray-800 rounded-lg">
                <h4 className="font-medium text-white mb-2">Role Permissions:</h4>
                <ul className="space-y-3">
                    <li className="flex items-start gap-2">
                        <Shield className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                        <div>
                            <strong className="text-orange-400">Owner:</strong> Created the project. Full control including deletion
                        </div>
                    </li>
                    <li className="flex items-start gap-2">
                        <Shield className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                        <div>
                            <strong className="text-orange-300">Admin:</strong> Full project access, can manage members, edit all entries
                        </div>
                    </li>
                    <li className="flex items-start gap-2">
                        <User className="w-4 h-4 text-orange-300 mt-0.5 flex-shrink-0" />
                        <div>
                            <strong className="text-orange-200">Editor:</strong> Can create, edit, and delete their own entries
                        </div>
                    </li>
                    <li className="flex items-start gap-2">
                        <User className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div>
                            <strong className="text-gray-300">Member:</strong> View-only access to project entries
                        </div>
                    </li>
                </ul>
            </div>
        </div>
    );
};

export default ProjectMembers;