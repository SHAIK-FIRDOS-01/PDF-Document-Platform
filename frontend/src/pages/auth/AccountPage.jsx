import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../services/api';
import {
  User,
  Shield,
  KeyRound,
  History,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Globe,
  Monitor,
  LogOut,
  Calendar,
  Sparkles,
} from 'lucide-react';

export default function AccountPage() {
  const { user, setUser, logout } = useAuth();

  // Active Tab: 'profile' | 'security' | 'history'
  const [activeTab, setActiveTab] = useState('profile');

  // Profile Form State
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');
  const [profileErrorMsg, setProfileErrorMsg] = useState('');

  // Password Form State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState('');
  const [passwordErrorMsg, setPasswordErrorMsg] = useState('');

  // Login History State
  const [history, setHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Sync profile fields if user object loads or changes
  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
    }
  }, [user]);

  // Fetch Login History
  const fetchHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const data = await authApi.getLoginHistory();
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load login history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab, fetchHistory]);

  // Copy User ID helper
  const handleCopyId = () => {
    if (user?.id) {
      navigator.clipboard.writeText(user.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  // Handle Profile Update
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    setProfileSuccessMsg('');
    setProfileErrorMsg('');

    try {
      const updatedUser = await authApi.updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });
      setUser(updatedUser);
      setProfileSuccessMsg('Profile information updated successfully.');
      setTimeout(() => setProfileSuccessMsg(''), 3500);
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        'Failed to update profile. Please try again.';
      setProfileErrorMsg(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Handle Password Change
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordSuccessMsg('');
    setPasswordErrorMsg('');

    if (newPassword.length < 8) {
      setPasswordErrorMsg('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordErrorMsg('New passwords do not match.');
      return;
    }

    if (newPassword === oldPassword) {
      setPasswordErrorMsg('New password cannot be the same as your current password.');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await authApi.changePassword({
        old_password: oldPassword,
        new_password: newPassword,
      });
      setPasswordSuccessMsg('Your password has been securely updated.');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccessMsg(''), 4000);
    } catch (err) {
      const data = err.response?.data;
      let errorText = 'Failed to update password. Please verify current password.';
      if (data?.new_password) {
        errorText = Array.isArray(data.new_password) ? data.new_password[0] : data.new_password;
      } else if (data?.old_password) {
        errorText = Array.isArray(data.old_password) ? data.old_password[0] : data.old_password;
      } else if (data?.detail) {
        errorText = data.detail;
      }
      setPasswordErrorMsg(errorText);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Password Strength Calculation
  const passwordStrength = {
    length: newPassword.length >= 8,
    hasUpper: /[A-Z]/.test(newPassword),
    hasLower: /[a-z]/.test(newPassword),
    hasNumber: /[0-9]/.test(newPassword),
    hasSpecial: /[^A-Za-z0-9]/.test(newPassword),
  };

  const strengthScore = Object.values(passwordStrength).filter(Boolean).length;

  const getInitials = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  // Format timestamp helper
  const formatDateTime = (ts) => {
    if (!ts) return 'N/A';
    const date = new Date(ts);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // Parse User Agent to readable browser / OS
  const parseUserAgent = (ua) => {
    if (!ua) return 'Web Browser';
    let browser = 'Browser';
    let os = 'Device';

    if (ua.includes('Chrome')) browser = 'Google Chrome';
    else if (ua.includes('Firefox')) browser = 'Mozilla Firefox';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Apple Safari';
    else if (ua.includes('Edge')) browser = 'Microsoft Edge';

    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Macintosh') || ua.includes('Mac OS')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

    return `${browser} on ${os}`;
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50 text-slate-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Page Title & Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">
              <Shield className="w-4 h-4" />
              <span>Authentication & Security</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Account Management
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage your personal credentials, profile settings, and review security audit logs.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={logout}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 bg-white hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors shadow-2xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Top Hero / User Profile Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center space-x-4 min-w-0">
              {/* User Avatar Initials */}
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-md shadow-blue-500/10 flex-shrink-0">
                {getInitials()}
              </div>

              <div className="min-w-0">
                <div className="flex items-center space-x-2.5">
                  <h2 className="text-lg font-bold text-slate-900 truncate">
                    {user?.first_name || user?.last_name
                      ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                      : user?.email?.split('@')[0]}
                  </h2>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-blue-50 text-blue-700 border border-blue-200/80 uppercase">
                    {user?.role || 'AUDITOR'}
                  </span>
                  <span className="flex items-center space-x-1 px-2 py-0.5 text-[10px] font-semibold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Active</span>
                  </span>
                </div>

                <p className="text-xs text-slate-500 font-mono mt-0.5 truncate">
                  {user?.email}
                </p>

                <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-slate-400">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      Member since{' '}
                      {user?.date_joined
                        ? new Date(user.date_joined).toLocaleDateString(undefined, {
                            month: 'short',
                            year: 'numeric',
                          })
                        : 'Recently'}
                    </span>
                  </div>

                  {user?.id && (
                    <div className="flex items-center space-x-1.5">
                      <span className="font-mono text-[10px] text-slate-400">
                        ID: {user.id.slice(0, 8)}...
                      </span>
                      <button
                        onClick={handleCopyId}
                        className="text-slate-400 hover:text-slate-700 transition-colors"
                        title="Copy User UUID"
                      >
                        {copiedId ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Security Badges */}
            <div className="flex items-center md:flex-col md:items-end justify-between md:justify-center border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6 text-xs text-slate-500 space-y-1">
              <div className="flex items-center space-x-1.5 text-emerald-700 font-medium bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                <span>JWT HttpOnly Protected</span>
              </div>
              <span className="text-[11px] text-slate-400">Automatic credential rotation</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-2 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all -mb-px ${
              activeTab === 'profile'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Profile Details</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all -mb-px ${
              activeTab === 'security'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Change Password</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all -mb-px ${
              activeTab === 'history'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Login Audit History</span>
          </button>
        </div>

        {/* TAB 1: Profile Information */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Personal Information</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Update your display name and review account privileges.
              </p>
            </div>

            {profileSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{profileSuccessMsg}</span>
              </div>
            )}

            {profileErrorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>{profileErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleProfileSubmit} className="space-y-4 max-w-xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. John"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Doe"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-500 cursor-not-allowed font-mono shadow-2xs"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                    Primary
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Email address is used as your unique login identifier.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Security Role
                </label>
                <input
                  type="text"
                  value={user?.role || 'AUDITOR'}
                  disabled
                  className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-500 cursor-not-allowed font-mono shadow-2xs"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Roles and permission tiers are controlled by the system administrator.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isUpdatingProfile}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center space-x-2"
                >
                  {isUpdatingProfile ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>Save Profile Changes</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: Change Password */}
        {activeTab === 'security' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Change Authentication Password</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Update your login password. We recommend choosing a strong password with at least 8 characters.
              </p>
            </div>

            {passwordSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{passwordSuccessMsg}</span>
              </div>
            )}

            {passwordErrorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>{passwordErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-xl">
              {/* Current Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showOldPassword ? 'text' : 'password'}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    required
                    placeholder="Enter current password"
                    className="w-full bg-white border border-slate-300 rounded-lg pl-3 pr-10 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="At least 8 characters"
                    className="w-full bg-white border border-slate-300 rounded-lg pl-3 pr-10 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Strength Meter */}
                {newPassword && (
                  <div className="mt-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-semibold">
                      <span className="text-slate-600">Password Strength:</span>
                      <span
                        className={
                          strengthScore <= 2
                            ? 'text-red-600'
                            : strengthScore <= 4
                            ? 'text-amber-600'
                            : 'text-emerald-600'
                        }
                      >
                        {strengthScore <= 2 ? 'Weak' : strengthScore <= 4 ? 'Good' : 'Strong'}
                      </span>
                    </div>

                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden flex">
                      <div
                        className={`h-full transition-all duration-300 ${
                          strengthScore <= 2
                            ? 'w-1/3 bg-red-500'
                            : strengthScore <= 4
                            ? 'w-2/3 bg-amber-500'
                            : 'w-full bg-emerald-500'
                        }`}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-500 pt-1">
                      <span className={passwordStrength.length ? 'text-emerald-600' : ''}>
                        {passwordStrength.length ? '✓' : '•'} At least 8 characters
                      </span>
                      <span className={passwordStrength.hasUpper ? 'text-emerald-600' : ''}>
                        {passwordStrength.hasUpper ? '✓' : '•'} Uppercase letter
                      </span>
                      <span className={passwordStrength.hasNumber ? 'text-emerald-600' : ''}>
                        {passwordStrength.hasNumber ? '✓' : '•'} Contains number
                      </span>
                      <span className={passwordStrength.hasSpecial ? 'text-emerald-600' : ''}>
                        {passwordStrength.hasSpecial ? '✓' : '•'} Special character
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Re-type new password"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center space-x-2"
                >
                  {isUpdatingPassword ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <KeyRound className="w-3.5 h-3.5" />
                  )}
                  <span>Update Password</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 3: Login History & Security Audit Logs */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Auditable Login History</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Every authentication attempt is logged with IP address, user-agent, and status.
                </p>
              </div>

              <button
                onClick={fetchHistory}
                disabled={isLoadingHistory}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs self-start sm:self-auto"
              >
                {isLoadingHistory ? 'Refreshing...' : 'Refresh Logs'}
              </button>
            </div>

            {isLoadingHistory ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-xs">
                <Loader2 className="w-6 h-6 text-blue-600 animate-spin mb-2" />
                <span>Loading security audit records...</span>
              </div>
            ) : history.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                No login history entries recorded yet for this session.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs divide-y divide-slate-200">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Client IP</th>
                      <th className="px-4 py-3">Device / Browser</th>
                      <th className="px-4 py-3">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {history.map((entry, idx) => (
                      <tr key={entry.id || idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3">
                          {entry.is_success ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Success</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                              <AlertCircle className="w-3 h-3 text-red-600" />
                              <span>Failed</span>
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3 font-mono text-slate-700">
                          <div className="flex items-center space-x-1.5">
                            <Globe className="w-3.5 h-3.5 text-slate-400" />
                            <span>{entry.ip_address || '127.0.0.1'}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3 text-slate-600">
                          <div className="flex items-center space-x-1.5">
                            <Monitor className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span className="truncate max-w-xs">
                              {parseUserAgent(entry.user_agent)}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                          {formatDateTime(entry.timestamp)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
