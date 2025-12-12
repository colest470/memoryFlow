import React from "react";
import { useState, useEffect } from 'react';
import { useParams } from "react-router-dom";
import { getProjectMembers, addProjectMember, removeProjectMember } from "../../lib/api/projects";
import { Plus, X, User, Shield, UserPlus } from 'lucide-react';

const ProjectMembers = ({ projectId, isOwner }) => {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddMemberForm, setShowAddMemberForm] = useState(false);
    const [newMemberEmail, setNewMemberEmail] = useState('');
    const [newMemberRole, setNewMemberRole] = useState('member');
    const [addingMember, setAddingMember] = useState(false);

    useEffect(() => {
        fetchMembers();
    }, [projectId]);

    const fetchMembers = async () => {
        try {
            setLoading(true);
            const data = await getProjectMembers(projectId);
            setMembers(data);
        } catch (error) {
            console.error('Error fetching project members:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddMember = async (e) => {
        e.preventDefault();
        if (!newMemberEmail.trim()) return;
        
        try {
            setAddingMember(true);
            // In a real app, you'd first search for user by email
            // For now, we'll create a mock member
            const mockMember = {
                id: Date.now(),
                userId: Date.now(),
                email: newMemberEmail,
                name: newMemberEmail.split('@')[0],
                role: newMemberRole,
                avatar: `https://ui-avatars.com/api/?name=${newMemberEmail.split('@')[0]}&background=random`
            };
            
            await addProjectMember(projectId, mockMember.userId, mockMember.role);
            setMembers([...members, mockMember]);
            setNewMemberEmail('');
            setShowAddMemberForm(false);
        } catch (error) {
            console.error('Error adding project member:', error);
            alert('Failed to add member');
        } finally {
            setAddingMember(false);
        }
    };

    const handleRemoveMember = async (memberId) => {
        if (!window.confirm('Are you sure you want to remove this member?')) return;
        
        try {
            await removeProjectMember(projectId, memberId);
            setMembers(members.filter(member => member.id !== memberId));
        } catch (error) {
            console.error('Error removing project member:', error);
            alert('Failed to remove member');
        }
    };

    const getRoleIcon = (role) => {
        switch (role) {
            case 'admin':
                return <Shield className="w-4 h-4 text-red-600" />;
            case 'editor':
                return <User className="w-4 h-4 text-blue-600" />;
            default:
                return <User className="w-4 h-4 text-slate-600" />;
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
                        {members.length} member{members.length !== 1 ? 's' : ''} • Only admins can add/remove members
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
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-slate-900">Add New Member</h3>
                        <button
                            onClick={() => setShowAddMemberForm(false)}
                            className="text-slate-500 hover:text-slate-700"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <form onSubmit={handleAddMember} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={newMemberEmail}
                                onChange={(e) => setNewMemberEmail(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="member@example.com"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Role
                            </label>
                            <select
                                value={newMemberRole}
                                onChange={(e) => setNewMemberRole(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="member">Member (View Only)</option>
                                <option value="editor">Editor (Can Edit)</option>
                                <option value="admin">Admin (Full Access)</option>
                            </select>
                        </div>
                        <div className="flex gap-3">
                            <button
                                type="submit"
                                disabled={addingMember}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {addingMember ? 'Adding...' : 'Add Member'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowAddMemberForm(false)}
                                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium"
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
                        <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
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
                            <div key={member.id} className="flex items-center justify-between p-4 hover:bg-slate-50">
                                <div className="flex items-center gap-3">
                                    <img
                                        src={member.avatar || `https://ui-avatars.com/api/?name=${member.name}&background=random`}
                                        alt={member.name}
                                        className="w-10 h-10 rounded-full"
                                    />
                                    <div>
                                        <p className="font-medium text-slate-900">{member.name}</p>
                                        <p className="text-sm text-slate-600">{member.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        {getRoleIcon(member.role)}
                                        <span className="text-sm font-medium text-slate-700 capitalize">
                                            {member.role}
                                        </span>
                                    </div>
                                    {isOwner && member.role !== 'owner' && (
                                        <button
                                            onClick={() => handleRemoveMember(member.id)}
                                            className="text-red-600 hover:text-red-700 text-sm font-medium"
                                        >
                                            Remove
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
                <ul className="space-y-1">
                    <li className="flex items-center gap-2">
                        <Shield className="w-3 h-3 text-red-600" />
                        <span><strong>Admin:</strong> Full project access, can manage members</span>
                    </li>
                    <li className="flex items-center gap-2">
                        <User className="w-3 h-3 text-blue-600" />
                        <span><strong>Editor:</strong> Can create and edit entries</span>
                    </li>
                    <li className="flex items-center gap-2">
                        <User className="w-3 h-3 text-slate-600" />
                        <span><strong>Member:</strong> View-only access to entries</span>
                    </li>
                </ul>
            </div>
        </div>
    );
};

export default ProjectMembers;