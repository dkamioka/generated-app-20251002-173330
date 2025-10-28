/**
 * Admin Dashboard Page
 *
 * Comprehensive admin interface for:
 * - User management (list, search, edit, ban/unban)
 * - Analytics overview
 * - Audit log
 *
 * Related: FEATURE_SPEC_USER_MANAGEMENT.md - Phase 4
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '@/store/userStore';
import { useAdminStore } from '@/store/adminStore';
import type { User, UserRole, UserTier } from '@shared/types';
import * as adminApi from '@/lib/adminApi';

export function AdminPage() {
  const navigate = useNavigate();
  const { fullUser, isAdmin } = useUserStore();
  const {
    users,
    totalUsers,
    currentPage,
    totalPages,
    isLoadingUsers,
    usersError,
    analytics,
    isLoadingAnalytics,
    fetchUsers,
    fetchAnalytics,
    updateUserInList,
    removeUserFromList,
  } = useAdminStore();

  const [activeTab, setActiveTab] = useState<'users' | 'analytics'>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
  const [tierFilter, setTierFilter] = useState<UserTier | ''>('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Redirect if not admin
  useEffect(() => {
    if (fullUser && !isAdmin()) {
      navigate('/');
    }
  }, [fullUser, isAdmin, navigate]);

  // Load data on mount
  useEffect(() => {
    if (isAdmin()) {
      fetchUsers();
      fetchAnalytics();
    }
  }, [isAdmin]);

  const handleSearch = () => {
    fetchUsers({
      page: 1,
      search: searchQuery,
      role: roleFilter || undefined,
      tier: tierFilter || undefined,
    });
  };

  const handlePageChange = (page: number) => {
    fetchUsers({
      page,
      search: searchQuery,
      role: roleFilter || undefined,
      tier: tierFilter || undefined,
    });
  };

  const handleUserClick = (user: User) => {
    setSelectedUser(user);
    setShowUserModal(true);
    setBanReason('');
  };

  const handleRoleChange = async (role: UserRole) => {
    if (!selectedUser) return;

    setIsUpdating(true);
    try {
      const updated = await adminApi.updateUserRole(selectedUser.id, role);
      updateUserInList(selectedUser.id, updated);
      setSelectedUser(updated);
      alert(`User role updated to ${role}`);
    } catch (error: any) {
      alert(`Failed to update role: ${error.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBanUser = async () => {
    if (!selectedUser || !banReason.trim()) {
      alert('Please provide a ban reason');
      return;
    }

    setIsUpdating(true);
    try {
      const updated = await adminApi.banUser(selectedUser.id, banReason);
      updateUserInList(selectedUser.id, updated);
      setSelectedUser(updated);
      alert('User banned successfully');
    } catch (error: any) {
      alert(`Failed to ban user: ${error.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUnbanUser = async () => {
    if (!selectedUser) return;

    setIsUpdating(true);
    try {
      const updated = await adminApi.unbanUser(selectedUser.id);
      updateUserInList(selectedUser.id, updated);
      setSelectedUser(updated);
      alert('User unbanned successfully');
    } catch (error: any) {
      alert(`Failed to unban user: ${error.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    if (!confirm(`Are you sure you want to delete ${selectedUser.name}? This cannot be undone.`)) {
      return;
    }

    setIsUpdating(true);
    try {
      await adminApi.deleteUser(selectedUser.id);
      removeUserFromList(selectedUser.id);
      setShowUserModal(false);
      alert('User deleted successfully');
    } catch (error: any) {
      alert(`Failed to delete user: ${error.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  if (!fullUser || !isAdmin()) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You must be an admin to access this page.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go to Lobby
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Admin Dashboard
            </h1>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              Back to Lobby
            </button>
          </div>

          {/* Tabs */}
          <div className="mt-4 border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('users')}
                className={`${
                  activeTab === 'users'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                User Management
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`${
                  activeTab === 'analytics'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Analytics
              </button>
            </nav>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* User Management Tab */}
        {activeTab === 'users' && (
          <div>
            {/* Search and Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input
                  type="text"
                  placeholder="Search by email or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as any)}
                  className="px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="moderator">Moderator</option>
                  <option value="user">User</option>
                </select>
                <select
                  value={tierFilter}
                  onChange={(e) => setTierFilter(e.target.value as any)}
                  className="px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">All Tiers</option>
                  <option value="free">Free</option>
                  <option value="paid">Paid</option>
                  <option value="lifetime">Lifetime</option>
                  <option value="beta">Beta</option>
                </select>
                <button
                  onClick={handleSearch}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Search
                </button>
              </div>
            </div>

            {/* User Table */}
            {isLoadingUsers ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
                <p className="text-gray-600 dark:text-gray-400">Loading users...</p>
              </div>
            ) : usersError ? (
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                <p className="text-red-600 dark:text-red-400">{usersError}</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Tier
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Joined
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {users.map((user) => (
                      <tr
                        key={user.id}
                        onClick={() => handleUserClick(user)}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {user.picture && (
                              <img
                                src={user.picture}
                                alt={user.name}
                                className="h-10 w-10 rounded-full mr-3"
                              />
                            )}
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {user.name}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              user.role === 'admin'
                                ? 'bg-purple-100 text-purple-800'
                                : user.role === 'moderator'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              user.tier === 'lifetime'
                                ? 'bg-yellow-100 text-yellow-800'
                                : user.tier === 'paid'
                                ? 'bg-green-100 text-green-800'
                                : user.tier === 'beta'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {user.tier}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {user.isBanned ? (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                              Banned
                            </span>
                          ) : (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Showing page <span className="font-medium">{currentPage}</span> of{' '}
                        <span className="font-medium">{totalPages}</span> ({totalUsers} total users)
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div>
            {isLoadingAnalytics ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
                <p className="text-gray-600 dark:text-gray-400">Loading analytics...</p>
              </div>
            ) : analytics ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Users</h3>
                  <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                    {analytics.totalUsers}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Users</h3>
                  <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                    {analytics.activeUsers}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Paid Users</h3>
                  <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                    {analytics.paidUsers}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Games</h3>
                  <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                    {analytics.totalGames}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center">
                  {selectedUser.picture && (
                    <img
                      src={selectedUser.picture}
                      alt={selectedUser.name}
                      className="h-16 w-16 rounded-full mr-4"
                    />
                  )}
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {selectedUser.name}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">{selectedUser.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              {/* User Info */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Role
                  </label>
                  <div className="flex space-x-2">
                    {(['admin', 'moderator', 'user'] as UserRole[]).map((role) => (
                      <button
                        key={role}
                        onClick={() => handleRoleChange(role)}
                        disabled={isUpdating || selectedUser.role === role}
                        className={`px-4 py-2 rounded ${
                          selectedUser.role === role
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
                        } disabled:opacity-50`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tier
                  </label>
                  <p className="text-gray-900 dark:text-white capitalize">{selectedUser.tier}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {selectedUser.isBanned ? (
                      <span className="text-red-600">Banned: {selectedUser.banReason}</span>
                    ) : (
                      <span className="text-green-600">Active</span>
                    )}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Joined
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {new Date(selectedUser.createdAt).toLocaleString()}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Last Login
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {selectedUser.lastLogin
                      ? new Date(selectedUser.lastLogin).toLocaleString()
                      : 'Never'}
                  </p>
                </div>
              </div>

              {/* Ban/Unban Section */}
              {!selectedUser.isBanned ? (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Ban User
                  </label>
                  <textarea
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    placeholder="Enter ban reason..."
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white mb-2"
                    rows={3}
                  />
                  <button
                    onClick={handleBanUser}
                    disabled={isUpdating || !banReason.trim()}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                  >
                    {isUpdating ? 'Banning...' : 'Ban User'}
                  </button>
                </div>
              ) : (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <button
                    onClick={handleUnbanUser}
                    disabled={isUpdating}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    {isUpdating ? 'Unbanning...' : 'Unban User'}
                  </button>
                </div>
              )}

              {/* Delete User */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
                <button
                  onClick={handleDeleteUser}
                  disabled={isUpdating}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                >
                  {isUpdating ? 'Deleting...' : 'Delete User'}
                </button>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  This action cannot be undone.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
