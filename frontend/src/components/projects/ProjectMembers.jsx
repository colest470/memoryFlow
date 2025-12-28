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
                avatar: selectedUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUser.name || selectedUser.email.split('@')[0])}&background=random`
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
                return <Shield className="w-4 h-4 text-red-600" />;
            case 'admin':
                return <Shield className="w-4 h-4 text-orange-600" />;
            case 'editor':
                return <User className="w-4 h-4 text-blue-600" />;
            default:
                return <User className="w-4 h-4 text-slate-600" />;
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
                <div className="h-6 bg-slate-200 rounded w-1/4"></div>
                <div className="h-20 bg-slate-100 rounded"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-slate-900">Team Members</h2>
                    <p className="text-sm text-slate-600 mt-1">
                        {members.length} member{members.length !== 1 ? 's' : ''} • 
                        {isOwner ? ' You can add/remove members' : ' Only admins can add/remove members'}
                    </p>
                </div>
                {isOwner && (
                    <button
                        onClick={() => setShowAddMemberForm(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm"
                    >
                        <UserPlus className="w-4 h-4" />
                        Add Member
                    </button>
                )}
            </div>

            {showAddMemberForm && (
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900">Add Team Member</h3>
                            <p className="text-sm text-slate-600 mt-1">Search for users by name or email</p>
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
                            className="text-slate-500 hover:text-slate-700 p-1 hover:bg-slate-100 rounded"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    
                    <form onSubmit={handleAddMember} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Search Users
                            </label>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">
                                    <Search className="w-5 h-5" />
                                </div>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={handleSearchChange}
                                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Type name or email to search..."
                                    disabled={addingMember}
                                    autoFocus
                                />
                                {searching && (
                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                                    </div>
                                )}
                            </div>
                            
                            {searchError && (
                                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                                    <X className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                                    <p className="text-sm text-red-700">{searchError}</p>
                                </div>
                            )}
                            
                            {/* Search Results */}
                            {searchResults.length > 0 && (
                                <div className="mt-3 border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                                    <div className="max-h-60 overflow-y-auto">
                                        {searchResults.map((result) => (
                                            <button
                                                type="button"
                                                key={result.id}
                                                onClick={() => handleSelectUser(result)}
                                                className={`w-full p-3 flex items-center gap-3 hover:bg-slate-50 border-b border-slate-100 last:border-b-0 ${
                                                    selectedUser?.id === result.id ? 'bg-blue-50' : ''
                                                }`}
                                            >
                                                <img
                                                    src={result.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(result.full_name || result.email.split('@')[0])}&background=random`}
                                                    alt={result.full_name}
                                                    className="w-8 h-8 rounded-full"
                                                />
                                                <div className="flex-1 text-left">
                                                    <p className="font-medium text-slate-900">
                                                        {result.full_name}
                                                    </p>
                                                    <p className="text-sm text-slate-600">{result.email}</p>
                                                </div>
                                                {selectedUser?.id === result.id && (
                                                    <Check className="w-5 h-5 text-green-600" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        {selectedUser && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="font-semibold text-slate-900">Selected User</h4>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedUser(null);
                                            setSearchQuery('');
                                            setSearchResults([]);
                                        }}
                                        className="text-slate-500 hover:text-slate-700"
                                    >
                                        <UserX className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="flex items-center gap-3">
                                    <img
                                        src={selectedUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUser.name || selectedUser.email.split('@')[0])}&background=random`}
                                        alt={selectedUser.full_name}
                                        className="w-12 h-12 rounded-full"
                                    />
                                    <div>
                                        <p className="font-semibold text-slate-900">
                                            {selectedUser.full_name}
                                        </p>
                                        <p className="text-sm text-slate-600">{selectedUser.email}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Assign Role
                            </label>
                            <select
                                value={newMemberRole}
                                onChange={(e) => setNewMemberRole(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                disabled={addingMember}
                            >
                                <option value="owner">Owner (Full Control)</option>
                                <option value="editor">Editor (Can Create & Edit Entries)</option>
                                <option value="viewer">Member (View Only)</option>
                            </select>
                            <p className="text-xs text-slate-500 mt-2">
                                {newMemberRole === 'owner' && 'Admins have full control over the project including member management'}
                                {newMemberRole === 'editor' && 'Editors can create, edit, and delete entries'}
                                {newMemberRole === 'viewer' && 'Members can only view project entries'}
                            </p>
                        </div>
                        
                        <div className="flex gap-3 pt-4 border-t border-slate-200">
                            <button
                                type="submit"
                                disabled={addingMember || !selectedUser}
                                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
                                className="px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium"
                                disabled={addingMember}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="border border-slate-200 rounded-lg overflow-hidden">
                {members.length === 0 ? (
                    <div className="text-center py-12">
                        <User className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-600 mb-4">No team members added yet</p>
                        {isOwner && (
                            <button
                                onClick={() => setShowAddMemberForm(true)}
                                className="text-blue-600 hover:text-blue-700 font-medium"
                            >
                                Add your first team member
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="divide-y divide-slate-200">
                        {members.map((member) => (
                            <div 
                                key={member.id} 
                                className={`flex items-center justify-between p-4 hover:bg-slate-50 ${
                                    (member.id === user.id || member.userId === user.id) ? 'bg-blue-50' : ''
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <img
                                        src={member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.full_name)}&background=random`}
                                        alt={member.full_name || member.email}
                                        className="w-10 h-10 rounded-full"
                                    />
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-slate-900">
                                                {member.full_name || member.name || member.email}
                                            </p>
                                            {(member.id === user.id || member.userId === user.id) && (
                                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                                    You
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-600">{member.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        {getRoleIcon(member.role)}
                                        <span className="text-sm font-medium text-slate-700">
                                            {getRoleDisplayName(member.role)}
                                        </span>
                                    </div>
                                    {isOwner && member.role !== 'owner' && (
                                        <button
                                            onClick={() => handleRemoveMember(member.id)}
                                            className="text-red-600 hover:text-red-700 text-sm font-medium hover:bg-red-50 px-2 py-1 rounded"
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

            <div className="text-sm text-slate-500 p-4 bg-slate-50 rounded-lg">
                <h4 className="font-medium text-slate-700 mb-2">Role Permissions:</h4>
                <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                        <Shield className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <div>
                            <strong className="text-slate-700">Owner:</strong> Created the project. Full control including deletion
                        </div>
                    </li>
                    <li className="flex items-start gap-2">
                        <Shield className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                        <div>
                            <strong className="text-slate-700">Admin:</strong> Full project access, can manage members, edit all entries
                        </div>
                    </li>
                    <li className="flex items-start gap-2">
                        <User className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                            <strong className="text-slate-700">Editor:</strong> Can create, edit, and delete their own entries
                        </div>
                    </li>
                    <li className="flex items-start gap-2">
                        <User className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0" />
                        <div>
                            <strong className="text-slate-700">Member:</strong> View-only access to project entries
                        </div>
                    </li>
                </ul>
            </div>
        </div>
    );
};

export default ProjectMembers;