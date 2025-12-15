import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, User, Home, Power, AlertCircle, CheckCircle, X, LogIn, UserCog } from 'lucide-react';

const Logout = () => {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [logoutSuccess, setLogoutSuccess] = useState(false);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await logout(user);
            setLogoutSuccess(true);
            
            // Show success message briefly before redirecting
            setTimeout(() => {
                navigate('/login', { 
                    replace: true,
                    state: { 
                        message: 'You have been logged out successfully',
                        type: 'success'
                    }
                });
            }, 1500);
        } catch (error) {
            console.error('Logout failed:', error);
            alert('Logout failed. Please try again.');
        } finally {
            setIsLoggingOut(false);
        }
    };

    const handleLogoutAllDevices = async () => {
        setIsLoggingOut(true);
        try {
            // This would call a different logout function for all devices
            await logout(true); // Assuming your logout function accepts a parameter
            setLogoutSuccess(true);
            
            setTimeout(() => {
                navigate('/login', { 
                    replace: true,
                    state: { 
                        message: 'Logged out from all devices',
                        type: 'info'
                    }
                });
            }, 1500);
        } catch (error) {
            console.error('Logout from all devices failed:', error);
            alert('Unable to logout from all devices. Please try again.');
        } finally {
            setIsLoggingOut(false);
            setShowConfirmModal(false);
        }
    };

    const openConfirmModal = () => {
        setShowConfirmModal(true);
    };

    const closeConfirmModal = () => {
        setShowConfirmModal(false);
    };

    const handleCancel = () => {
        navigate(-1); // Go back to previous page
    };

    const handleGoToDashboard = () => {
        navigate('/dashboard');
    };

    const handleGoToProfile = () => {
        navigate('/profile');
    };

    // If already logged out but component is still mounted
    if (!user && !logoutSuccess) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full">
                    <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <User className="w-10 h-10 text-slate-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 mb-3">Already Logged Out</h1>
                        <p className="text-slate-600 mb-8">You are not currently logged in.</p>
                        <div className="space-y-4">
                            <button
                                onClick={() => navigate('/login')}
                                className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                            >
                                <LogIn className="w-5 h-5" />
                                Go to Login
                            </button>
                            <button
                                onClick={() => navigate('/')}
                                className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors"
                            >
                                <Home className="w-5 h-5" />
                                Go to Homepage
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
            {/* Main Logout Card */}
            <div className="max-w-md w-full">
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-8 text-center">
                        <div className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-white/20">
                            <LogOut className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-2">Logout</h1>
                        <p className="text-slate-300">
                            {user?.email || user?.name ? (
                                <>Are you sure you want to logout, <strong>{user.name || user.email.split('@')[0]}</strong>?</>
                            ) : (
                                'Are you sure you want to logout?'
                            )}
                        </p>
                    </div>

                    {/* Current User Info */}
                    {user && (
                        <div className="p-6 border-b border-slate-100">
                            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                    {user.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-slate-900">
                                        {user.name || 'User'}
                                    </p>
                                    <p className="text-sm text-slate-600">
                                        {user.email || 'No email provided'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="p-8 space-y-4">
                        {logoutSuccess ? (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <CheckCircle className="w-8 h-8 text-green-600" />
                                </div>
                                <h2 className="text-xl font-semibold text-slate-900 mb-2">Logged Out Successfully</h2>
                                <p className="text-slate-600 mb-6">You are being redirected to the login page...</p>
                                <div className="inline-block">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <button
                                    onClick={handleLogout}
                                    disabled={isLoggingOut}
                                    className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {isLoggingOut ? (
                                        <>
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                            <span>Logging out...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Power className="w-5 h-5" />
                                            <span>Logout from this device</span>
                                        </>
                                    )}
                                </button>

                                <button
                                    onClick={openConfirmModal}
                                    disabled={isLoggingOut}
                                    className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    <AlertCircle className="w-5 h-5" />
                                    <span>Logout from all devices</span>
                                </button>

                                <div className="pt-6 border-t border-slate-100">
                                    <p className="text-center text-sm text-slate-500 mb-4">Changed your mind?</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={handleGoToDashboard}
                                            disabled={isLoggingOut}
                                            className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            <Home className="w-4 h-4" />
                                            Dashboard
                                        </button>
                                        <button
                                            onClick={handleGoToProfile}
                                            disabled={isLoggingOut}
                                            className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            <UserCog className="w-4 h-4" />
                                            Profile
                                        </button>
                                    </div>
                                    <button
                                        onClick={handleCancel}
                                        disabled={isLoggingOut}
                                        className="w-full mt-3 px-4 py-3 text-slate-600 hover:text-slate-800 font-medium rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Footer Note */}
                <div className="mt-6 text-center">
                    <p className="text-sm text-slate-500">
                        Having trouble logging out? <a href="/support" className="text-blue-600 hover:text-blue-700 font-medium">Contact support</a>
                    </p>
                </div>
            </div>

            {/* Confirm Logout All Devices Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                                        <AlertCircle className="w-6 h-6 text-red-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900">Logout All Devices</h3>
                                        <p className="text-sm text-slate-600">This will end all active sessions</p>
                                    </div>
                                </div>
                                <button
                                    onClick={closeConfirmModal}
                                    className="text-slate-400 hover:text-slate-600 p-1"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-sm text-red-700">
                                    <strong>Warning:</strong> This action will log you out from all devices where you're currently signed in, including:
                                </p>
                                <ul className="mt-2 text-sm text-red-700 list-disc list-inside space-y-1">
                                    <li>Other browsers on this computer</li>
                                    <li>Mobile devices</li>
                                    <li>Tablets</li>
                                    <li>Any other active sessions</li>
                                </ul>
                            </div>

                            <p className="text-slate-700 mb-6">
                                You'll need to sign in again on any device you want to use.
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={handleLogoutAllDevices}
                                    disabled={isLoggingOut}
                                    className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {isLoggingOut ? 'Processing...' : 'Yes, logout all devices'}
                                </button>
                                <button
                                    onClick={closeConfirmModal}
                                    disabled={isLoggingOut}
                                    className="flex-1 px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Session Info Tooltip (Optional) */}
            <div className="fixed bottom-6 right-6">
                <div className="group relative">
                    <button className="w-10 h-10 bg-slate-800 hover:bg-slate-900 text-white rounded-full flex items-center justify-center shadow-lg">
                        <User className="w-5 h-5" />
                    </button>
                    <div className="absolute bottom-full right-0 mb-2 w-64 p-4 bg-white rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                        <h4 className="font-semibold text-slate-900 mb-2">Active Session</h4>
                        <p className="text-sm text-slate-600">
                            Logged in as <strong>{user?.email}</strong>
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                            Device: {navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Logout;