// web-app/src/AdminDashboardPage.tsx

import React, { useState, useEffect, FormEvent } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { UserData, AssignmentData } from './App'; // Import shared interfaces

// IMPORTANT: Replace with your actual backend URL
const BACKEND_URL = 'http://localhost:3000';

// Define the interface for the successful response when setting payout
interface SetPayoutResponse {
  message: string;
  assignment: AssignmentData; // Assuming the updated assignment data is returned
}

// Define the interface for the financial summary response
interface FinancialSummaryResponse {
  totalClientPayments: number;
  totalHelperPayouts: number;
  platformProfit: number;
}

// Define the interface for the helper registration status response
interface HelperRegistrationStatusResponse {
  isOpen: boolean;
  message: string;
}

// NEW: Define the interface for the delete user response
interface DeleteUserResponse {
  message: string;
}

const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [assignments, setAssignments] = useState<AssignmentData[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [payoutAmount, setPayoutAmount] = useState<number | ''>('');
  const [payoutMessage, setPayoutMessage] = useState<string | null>(null);
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const [isPayoutSubmitting, setIsPayoutSubmitting] = useState<boolean>(false);

  // State for financial summary
  const [financialSummary, setFinancialSummary] = useState<FinancialSummaryResponse | null>(null);
  const [loadingFinancialSummary, setLoadingFinancialSummary] = useState<boolean>(true);
  const [financialSummaryError, setFinancialSummaryError] = useState<string | null>(null);

  // NEW: State for helper registration status
  const [helperRegistrationOpen, setHelperRegistrationOpen] = useState<boolean>(false);
  const [loadingRegistrationStatus, setLoadingRegistrationStatus] = useState<boolean>(true);
  const [registrationStatusError, setRegistrationStatusError] = useState<string | null>(null);
  const [togglingRegistration, setTogglingRegistration] = useState<boolean>(false);

  // NEW: State for editing user roles/status
  const [showEditUserModal, setShowEditUserModal] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [isUserActive, setIsUserActive] = useState<boolean>(true);
  const [editUserMessage, setEditUserMessage] = useState<string | null>(null);
  const [editUserError, setEditUserError] = useState<string | null>(null);
  const [isUserUpdating, setIsUserUpdating] = useState<boolean>(false);

  // NEW: State for displaying detailed user/assignment info in modals
  const [selectedUserForDetails, setSelectedUserForDetails] = useState<UserData | null>(null);
  const [selectedAssignmentForDetails, setSelectedAssignmentForDetails] = useState<AssignmentData | null>(null);

  // NEW: State for user deletion confirmation
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState<boolean>(false);
  const [userToDelete, setUserToDelete] = useState<UserData | null>(null);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState<boolean>(false);


  useEffect(() => {
    const storedUserData = localStorage.getItem('userData');
    if (storedUserData) {
      const user: UserData = JSON.parse(storedUserData);
      if (!user.isAdmin) {
        navigate('/login'); // Redirect if not admin
        return;
      }
      setUserData(user);
      fetchAdminData();
      fetchFinancialSummary();
      fetchUsersData();
      fetchHelperRegistrationStatus(); // NEW: Fetch helper registration status
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const fetchAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get<{ assignments: AssignmentData[] }>(`${BACKEND_URL}/admin/assignments`);
      console.log("AdminDashboardPage: Raw assignments response data:", response.data);
      if (response.data && Array.isArray(response.data.assignments)) {
        setAssignments(response.data.assignments);
        console.log("AdminDashboardPage: Assignments set:", response.data.assignments);
      } else {
        console.warn("AdminDashboardPage: Fetched data for assignments is not an array or is missing 'assignments' property:", response.data);
        setAssignments([]);
      }
    } catch (err: any) {
      console.error('Error fetching admin assignments:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Failed to load assignments.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsersData = async () => {
    setLoadingUsers(true);
    setUsersError(null);
    try {
      const response = await axios.get<{ users: UserData[] }>(`${BACKEND_URL}/admin/users`); // Assuming this endpoint exists
      console.log("AdminDashboardPage: Raw users response data:", response.data);
      if (response.data && Array.isArray(response.data.users)) {
        setUsers(response.data.users);
        console.log("AdminDashboardPage: Users set:", response.data.users);
      } else {
        console.warn("AdminDashboardPage: Fetched data for users is not an array or is missing 'users' property:", response.data);
        setUsers([]);
      }
    } catch (err: any) {
      console.error('Error fetching users:', err.response?.data || err.message);
      setUsersError(err.response?.data?.message || 'Failed to load users.');
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchFinancialSummary = async () => {
    setLoadingFinancialSummary(true);
    setFinancialSummaryError(null);
    try {
      const response = await axios.get<FinancialSummaryResponse>(`${BACKEND_URL}/admin/financial-summary`);
      console.log("AdminDashboardPage: Fetched financial summary:", response.data);
      setFinancialSummary(response.data);
    } catch (err: any) {
      console.error('Error fetching financial summary:', err.response?.data || err.message);
      setFinancialSummaryError(err.response?.data?.message || 'Failed to load financial summary.');
    } finally {
      setLoadingFinancialSummary(false);
    }
  };

  // NEW: Function to fetch helper registration status
  const fetchHelperRegistrationStatus = async () => {
    setLoadingRegistrationStatus(true);
    setRegistrationStatusError(null);
    try {
      const response = await axios.get<HelperRegistrationStatusResponse>(`${BACKEND_URL}/admin/settings/helper-registration`);
      console.log("AdminDashboardPage: Helper registration status:", response.data);
      setHelperRegistrationOpen(response.data.isOpen);
    } catch (err: any) {
      console.error('Error fetching helper registration status:', err.response?.data || err.message);
      // It's crucial to set loading to false even on error to avoid perpetual loading screen
      setRegistrationStatusError(err.response?.data?.message || 'Failed to load registration status.');
    } finally {
      setLoadingRegistrationStatus(false); // Ensure loading state is turned off regardless of success/failure
      console.log("AdminDashboardPage: fetchHelperRegistrationStatus completed. loadingRegistrationStatus set to false.");
    }
  };

  // NEW: Function to toggle helper registration
  const handleToggleHelperRegistration = async () => {
    setTogglingRegistration(true);
    setRegistrationStatusError(null);
    try {
      const response = await axios.put<HelperRegistrationStatusResponse>(`${BACKEND_URL}/admin/settings/toggle-helper-registration`, {
        isOpen: !helperRegistrationOpen,
      });
      setHelperRegistrationOpen(response.data.isOpen);
      setPayoutMessage(response.data.message); // Re-using payoutMessage for general success messages
    } catch (err: any) {
      console.error('Error toggling helper registration:', err.response?.data || err.message);
      setRegistrationStatusError(err.response?.data?.message || 'Failed to toggle registration status.');
    } finally {
      setTogglingRegistration(false);
    }
  };

  const handleSetPayoutClick = (assignmentId: string, currentPayout: number | null | undefined) => {
    setSelectedAssignmentId(assignmentId);
    setPayoutAmount(currentPayout !== null && currentPayout !== undefined ? currentPayout : '');
    setPayoutMessage(null);
    setPayoutError(null);
  };

  const handleSetPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignmentId || payoutAmount === '') {
      setPayoutError('Assignment ID and payout amount are required.');
      return;
    }

    setIsPayoutSubmitting(true);
    setPayoutMessage(null);
    setPayoutError(null);

    try {
      const payoutValue = typeof payoutAmount === 'string' ? parseFloat(payoutAmount) : payoutAmount;
      const response = await axios.put<SetPayoutResponse>(`${BACKEND_URL}/admin/assignments/${selectedAssignmentId}/set-payout`, {
        helperPayoutAmount: payoutValue,
      });
      if (response.status === 200) {
        setPayoutMessage('Payout amount set successfully!');
        fetchAdminData(); // Refresh data
        setSelectedAssignmentId(null); // Close modal
        setPayoutAmount('');
      } else {
        setPayoutError(response.data.message || 'Failed to set payout amount.');
      }
    } catch (err: any) {
      console.error('Error setting payout:', err.response?.data || err.message);
      setPayoutError(err.response?.data?.message || 'An error occurred while setting payout.');
    } finally {
      setIsPayoutSubmitting(false);
    }
  };

  // NEW: Functions for user editing modal
  const handleEditUserClick = (user: UserData) => {
    setEditingUser(user);
    setSelectedRoles([...user.roles]); // Copy roles to local state for editing
    setIsUserActive(user.isActive);
    setShowEditUserModal(true);
    setEditUserMessage(null);
    setEditUserError(null);
  };

  const handleRoleChange = (role: string) => {
    setSelectedRoles(prevRoles =>
      prevRoles.includes(role)
        ? prevRoles.filter(r => r !== role)
        : [...prevRoles, role]
    );
  };

  const handleSaveUserChanges = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setIsUserUpdating(true);
    setEditUserMessage(null);
    setEditUserError(null);

    try {
      // Update roles
      await axios.put(`${BACKEND_URL}/admin/users/${editingUser._id}/roles`, { roles: selectedRoles });
      
      // Update active status
      await axios.put(`${BACKEND_URL}/admin/users/${editingUser._id}/status`, { isActive: isUserActive });

      setEditUserMessage('User updated successfully!');
      fetchUsersData(); // Refresh user data
      setShowEditUserModal(false);
      setEditingUser(null);
    } catch (err: any) {
      console.error('Error updating user:', err.response?.data || err.message);
      setEditUserError(err.response?.data?.message || 'Failed to update user.');
    } finally {
      setIsUserUpdating(false);
    }
  };

  // NEW: Function to handle user deletion confirmation
  const handleDeleteUserClick = (user: UserData) => {
    setUserToDelete(user);
    setShowDeleteConfirmModal(true);
    setDeleteMessage(null);
    setDeleteError(null);
  };

  // NEW: Function to execute user deletion
  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    setIsDeletingUser(true);
    setDeleteMessage(null);
    setDeleteError(null);

    try {
      const response = await axios.delete<DeleteUserResponse>(`${BACKEND_URL}/admin/users/${userToDelete._id}`);
      setDeleteMessage(response.data.message || 'User deleted successfully!');
      fetchUsersData(); // Refresh user list
      setShowDeleteConfirmModal(false);
      setUserToDelete(null);
    } catch (err: any) {
      console.error('Error deleting user:', err.response?.data || err.message);
      setDeleteError(err.response?.data?.message || 'Failed to delete user.');
    } finally {
      setIsDeletingUser(false);
    }
  };

  const getStatusColor = (status: AssignmentData['status']) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-500';
      case 'accepted':
        return 'text-blue-500';
      case 'due':
        return 'text-orange-500';
      case 'completed':
        return 'text-purple-500';
      case 'pending_client_review':
        return 'text-indigo-400';
      case 'ready_for_payout':
        return 'text-green-500';
      case 'paid':
        return 'text-discord_green';
      case 'cancelled':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  // NEW: Handlers for opening detail modals
  const handleUserRowClick = (user: UserData) => {
    setSelectedUserForDetails(user);
  };

  const handleAssignmentRowClick = (assignment: AssignmentData) => {
    setSelectedAssignmentForDetails(assignment);
  };

  // Debug log for loading states
  console.log("AdminDashboardPage: Current loading states:", {
    loading, // For assignments
    loadingUsers,
    loadingFinancialSummary,
    loadingRegistrationStatus // This is the one causing the 404
  });

  if (loading || loadingUsers || loadingFinancialSummary || loadingRegistrationStatus) { // Combined loading state
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-discord_dark to-discord_darkest">
        <p className="text-discord_white text-lg">Loading admin dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-discord_dark to-discord_darkest text-discord_white p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-discord_blurple mb-8 text-center drop-shadow-lg">
          Admin Dashboard
        </h1>

        {payoutMessage && ( // Re-using for general success messages
          <div className="bg-green-600 bg-opacity-20 border border-green-500 text-green-300 px-4 py-3 rounded-md text-center mb-4">
            <p className="font-bold">{payoutMessage}</p>
          </div>
        )}
        {deleteMessage && ( // Display delete success message
          <div className="bg-green-600 bg-opacity-20 border border-green-500 text-green-300 px-4 py-3 rounded-md text-center mb-4">
            <p className="font-bold">{deleteMessage}</p>
          </div>
        )}
        {deleteError && ( // Display delete error message
          <div className="bg-red-600 bg-opacity-20 border border-red-500 text-red-300 px-4 py-3 rounded-md text-center mb-4">
            <p className="font-bold">{deleteError}</p>
          </div>
        )}

        {/* Helper Registration Status Toggle */}
        <div className="bg-discord_darker p-6 rounded-lg shadow-xl border border-discord_dark mb-8 flex flex-col sm:flex-row justify-between items-center">
          <h2 className="text-xl font-bold text-discord_white mb-4 sm:mb-0">Helper Registration Status:</h2>
          {registrationStatusError ? (
            <p className="text-discord_red">{registrationStatusError}</p>
          ) : (
            <div className="flex items-center space-x-4">
              <span className={`text-lg font-bold ${helperRegistrationOpen ? 'text-discord_green' : 'text-red-500'}`}>
                {helperRegistrationOpen ? 'OPEN' : 'CLOSED'}
              </span>
              <button
                onClick={handleToggleHelperRegistration}
                className={`px-5 py-2 rounded-full font-bold transition duration-300 ${
                  helperRegistrationOpen
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-discord_green hover:bg-emerald-600'
                } text-white disabled:opacity-50 disabled:cursor-not-allowed`}
                disabled={togglingRegistration}
              >
                {togglingRegistration ? 'Toggling...' : helperRegistrationOpen ? 'Close Registration' : 'Open Registration'}
              </button>
            </div>
          )}
        </div>

        {/* Financial Summary Section */}
        <div className="bg-discord_darker p-6 rounded-lg shadow-xl border border-discord_dark mb-8">
          <h2 className="text-2xl font-bold text-discord_white mb-4">Financial Summary</h2>
          {financialSummaryError ? (
            <p className="text-discord_red">{financialSummaryError}</p>
          ) : financialSummary ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="bg-discord_dark p-4 rounded-md">
                <p className="text-discord_gray text-sm">Total Client Payments</p>
                <p className="text-discord_blurple text-2xl font-bold">${financialSummary.totalClientPayments.toFixed(2)}</p>
              </div>
              <div className="bg-discord_dark p-4 rounded-md">
                <p className="text-discord_gray text-sm">Total Helper Payouts</p>
                <p className="text-discord_green text-2xl font-bold">${financialSummary.totalHelperPayouts.toFixed(2)}</p>
              </div>
              <div className="bg-discord_dark p-4 rounded-md">
                <p className="text-discord_gray text-sm">Platform Profit</p>
                <p className={`text-2xl font-bold ${financialSummary.platformProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  ${financialSummary.platformProfit.toFixed(2)}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-discord_gray">No financial data available.</p>
          )}
        </div>

        {/* Assignments Section */}
        <h2 className="text-3xl font-bold text-discord_white mb-6 text-center">All Assignments</h2>
        {error && <p className="text-discord_red text-center mb-4">{error}</p>}

        {assignments.length === 0 ? (
          <p className="text-discord_gray text-center text-lg">No assignments found.</p>
        ) : (
          <div className="bg-discord_darker p-6 rounded-lg shadow-xl border border-discord_dark overflow-x-auto">
            <table className="min-w-full divide-y divide-discord_dark">
              <thead className="bg-discord_dark">
                <tr>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-discord_gray uppercase tracking-wider">
                    Title
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-discord_gray uppercase tracking-wider">
                    Client
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-discord_gray uppercase tracking-wider">
                    Helper
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-discord_gray uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-discord_gray uppercase tracking-wider">
                    Client Pays
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-discord_gray uppercase tracking-wider">
                    Helper Payout
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-discord_gray uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-discord_darker divide-y divide-discord_dark">
                {assignments.map((assignment) => (
                  <tr 
                    key={assignment._id} 
                    className="hover:bg-discord_light_dark/50 transition cursor-pointer"
                    onClick={() => handleAssignmentRowClick(assignment)} // Clickable row
                  >
                    <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-white">{assignment.title}</td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-discord_gray">
                      {assignment.ownerId?.username || 'N/A'}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-discord_gray">
                      {assignment.helperId?.username || 'Unassigned'}
                    </td>
                    <td className={`px-3 py-4 whitespace-nowrap text-sm font-bold ${getStatusColor(assignment.status)}`}>
                      {assignment.status.replace(/_/g, ' ').toUpperCase()}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-discord_blurple">
                      ${assignment.paymentAmount.toFixed(2)}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-discord_green">
                      ${assignment.adminDeterminedHelperPayout?.toFixed(2) || 'N/A'}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {assignment.status === 'pending' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSetPayoutClick(assignment._id, assignment.adminDeterminedHelperPayout); }}
                            className="bg-discord_blurple text-white px-3 py-1 rounded font-semibold text-sm hover:bg-opacity-90"
                          >
                            Set Payout
                          </button>
                        )}
                        {assignment.status === 'ready_for_payout' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/admin/pay-helper/${assignment._id}`); }}
                            className="bg-discord_green text-white px-3 py-1 rounded font-semibold text-sm hover:bg-opacity-90"
                          >
                            Process Payout
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* All Users Section */}
        <h2 className="text-3xl font-bold text-discord_white mb-6 mt-12 text-center">All Users</h2>
        {usersError && <p className="text-discord_red text-center mb-4">{usersError}</p>}

        {users.length === 0 ? (
          <p className="text-discord_gray text-center text-lg">No users found.</p>
        ) : (
          <div className="bg-discord_darker p-6 rounded-lg shadow-xl border border-discord_dark overflow-x-auto">
            <table className="min-w-full divide-y divide-discord_dark">
              <thead className="bg-discord_dark">
                <tr>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-discord_gray uppercase tracking-wider">
                    Username
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-discord_gray uppercase tracking-wider">
                    Roles
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-discord_gray uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-discord_gray uppercase tracking-wider">
                    Earnings
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-discord_gray uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-discord_darker divide-y divide-discord_dark">
                {users.map((user) => (
                  <tr 
                    key={user._id} 
                    className="hover:bg-discord_light_dark/50 transition cursor-pointer"
                    onClick={() => handleUserRowClick(user)} // Clickable row
                  >
                    <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-white">{user.username}</td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-discord_gray">
                      {user.roles.length > 0 ? user.roles.join(', ') : 'N/A'}
                    </td>
                    <td className={`px-3 py-4 whitespace-nowrap text-sm font-bold ${user.isActive ? 'text-discord_green' : 'text-red-500'}`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-discord_green">
                      ${user.totalEarnings?.toFixed(2) || '0.00'}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEditUserClick(user); }} // Stop propagation to prevent row click
                          className="bg-discord_blurple text-white px-3 py-1 rounded font-semibold text-sm hover:bg-opacity-90"
                        >
                          Edit
                        </button>
                        {userData?._id !== user._id && ( // Prevent admin from deleting themselves
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteUserClick(user); }} // Stop propagation
                            className="bg-red-600 text-white px-3 py-1 rounded font-semibold text-sm hover:bg-red-700"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payout Modal */}
      {selectedAssignmentId && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-discord_darker to-discord_darkest p-6 rounded-lg shadow-xl max-w-md w-full relative">
            <h3 className="text-2xl font-bold text-discord_blurple mb-4">Set Helper Payout</h3>
            {payoutError && <p className="text-discord_red text-center mb-4">{payoutError}</p>}
            {payoutMessage && <p className="text-discord_green text-center mb-4">{payoutMessage}</p>}
            <form onSubmit={handleSetPayout} className="space-y-4">
              <div>
                <label htmlFor="payoutAmount" className="block text-discord_gray text-sm font-semibold mb-2">
                  Payout Amount ($):
                </label>
                <input
                  type="number"
                  id="payoutAmount"
                  className="shadow-inner appearance-none border border-discord_darker rounded-md w-full py-2 px-3 text-discord_white leading-tight focus:outline-none focus:ring-2 focus:ring-discord_blurple focus:border-transparent bg-discord_darker placeholder-gray-850 transition duration-200 ease-in-out"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  required
                  min="0"
                  step="0.01"
                />
              </div>
              <button
                type="submit"
                className="bg-gradient-to-r from-discord_blurple to-indigo-600 text-discord_white px-6 py-3 rounded-md font-extrabold shadow-lg hover:from-indigo-600 hover:to-discord_blurple transition-all duration-300 w-full text-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isPayoutSubmitting || payoutAmount === '' || Number(payoutAmount) <= 0}
              >
                {isPayoutSubmitting ? 'Setting...' : 'Set Payout'}
              </button>
            </form>
            <button
              onClick={() => setSelectedAssignmentId(null)}
              className="absolute top-4 right-4 text-discord_gray hover:text-discord_white text-2xl"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {/* NEW: Edit User Modal */}
      {showEditUserModal && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-discord_darker to-discord_darkest p-6 rounded-lg shadow-xl max-w-md w-full relative">
            <h3 className="text-2xl font-bold text-discord_blurple mb-4">Edit User: {editingUser.username}</h3>
            {editUserError && <p className="text-discord_red text-center mb-4">{editUserError}</p>}
            {editUserMessage && <p className="text-discord_green text-center mb-4">{editUserMessage}</p>}
            
            <form onSubmit={handleSaveUserChanges} className="space-y-4">
              {/* Role Selector */}
              <div>
                <label className="block text-discord_gray text-sm font-semibold mb-2">Roles:</label>
                <div className="flex flex-wrap gap-2">
                  {['client', 'helper', 'admin', 'requester'].map(role => (
                    <label key={role} className="inline-flex items-center">
                      <input
                        type="checkbox"
                        className="form-checkbox text-discord_blurple rounded"
                        value={role}
                        checked={selectedRoles.includes(role)}
                        onChange={() => handleRoleChange(role)}
                        disabled={isUserUpdating}
                      />
                      <span className="ml-2 text-discord_white">{role}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* User Active Status Toggle */}
              <div>
                <label className="block text-discord_gray text-sm font-semibold mb-2">User Status:</label>
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    className="form-checkbox text-discord_green rounded"
                    checked={isUserActive}
                    onChange={(e) => setIsUserActive(e.target.checked)}
                    disabled={isUserUpdating}
                  />
                  <span className="ml-2 text-discord_white">{isUserActive ? 'Active' : 'Inactive'}</span>
                </label>
              </div>

              <button
                type="submit"
                className="bg-gradient-to-r from-discord_blurple to-indigo-600 text-discord_white px-6 py-3 rounded-md font-extrabold shadow-lg hover:from-indigo-600 hover:to-discord_blurple transition-all duration-300 w-full text-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isUserUpdating}
              >
                {isUserUpdating ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
            <button
              onClick={() => setShowEditUserModal(false)}
              className="absolute top-4 right-4 text-discord_gray hover:text-discord_white text-2xl"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {/* NEW: User Deletion Confirmation Modal */}
      {showDeleteConfirmModal && userToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-discord_darker to-discord_darkest p-6 rounded-lg shadow-xl max-w-md w-full relative">
            <h3 className="text-2xl font-bold text-red-500 mb-4">Confirm Deletion</h3>
            <p className="text-discord_white mb-6">
              Are you sure you want to delete user <span className="font-bold text-discord_blurple">{userToDelete.username}</span>?
              This action cannot be undone.
            </p>
            {deleteError && <p className="text-red-400 mb-4">{deleteError}</p>}
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowDeleteConfirmModal(false)}
                className="bg-discord_gray text-discord_white px-4 py-2 rounded-md font-semibold hover:bg-opacity-90 transition duration-300"
                disabled={isDeletingUser}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                className="bg-red-600 text-white px-4 py-2 rounded-md font-bold hover:bg-red-700 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isDeletingUser}
              >
                {isDeletingUser ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
            <button
              onClick={() => setShowDeleteConfirmModal(false)}
              className="absolute top-4 right-4 text-discord_gray hover:text-discord_white text-2xl"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {/* NEW: User Details Modal */}
      {selectedUserForDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-discord_darker to-discord_darkest p-6 rounded-lg shadow-xl max-w-md w-full relative">
            <h3 className="text-2xl font-bold text-discord_blurple mb-4">User Details: {selectedUserForDetails.username}</h3>
            <div className="space-y-3 text-discord_white">
              <p><strong>Username:</strong> {selectedUserForDetails.username}</p>
              <p><strong>Discord ID:</strong> {selectedUserForDetails.discordId || 'N/A'}</p>
              <p><strong>Email:</strong> {selectedUserForDetails.email || 'N/A'}</p>
              <p><strong>Roles:</strong> {selectedUserForDetails.roles.join(', ') || 'N/A'}</p>
              <p><strong>Status:</strong> <span className={selectedUserForDetails.isActive ? 'text-discord_green' : 'text-red-500'}>{selectedUserForDetails.isActive ? 'Active' : 'Inactive'}</span></p>
              <p><strong>Wallet Address:</strong> <span className="font-mono break-all">{selectedUserForDetails.walletAddress || 'N/A'}</span></p>
              <p><strong>Wallet Type:</strong> {selectedUserForDetails.walletType || 'N/A'}</p>
              <p><strong>Total Earnings:</strong> <span className="text-discord_green">${selectedUserForDetails.totalEarnings?.toFixed(2) || '0.00'}</span></p>
              {selectedUserForDetails.avatarUrl && (
                <div>
                  <strong>Avatar:</strong>
                  <img src={selectedUserForDetails.avatarUrl} alt="User Avatar" className="w-16 h-16 rounded-full mt-2" />
                </div>
              )}
            </div>
            <button
              onClick={() => setSelectedUserForDetails(null)}
              className="absolute top-4 right-4 text-discord_gray hover:text-discord_white text-2xl"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {/* NEW: Assignment Details Modal */}
      {selectedAssignmentForDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-discord_darker to-discord_darkest p-6 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto relative">
            <h3 className="text-2xl font-bold text-discord_blurple mb-4">Assignment Details: {selectedAssignmentForDetails.title}</h3>
            <div className="space-y-3 text-discord_white">
              <p><strong>Title:</strong> {selectedAssignmentForDetails.title}</p>
              <p><strong>Description:</strong> {selectedAssignmentForDetails.description}</p>
              <p><strong>Client:</strong> {selectedAssignmentForDetails.ownerId?.username || 'N/A'}</p>
              <p><strong>Helper:</strong> {selectedAssignmentForDetails.helperId?.username || 'Unassigned'}</p>
              <p><strong>Complexity:</strong> {selectedAssignmentForDetails.complexity}</p>
              <p><strong>Category:</strong> {selectedAssignmentForDetails.category}</p>
              <p><strong>Deadline:</strong> {new Date(selectedAssignmentForDetails.deadline).toLocaleString()}</p>
              <p><strong>Client Payment:</strong> <span className="text-discord_blurple">${selectedAssignmentForDetails.paymentAmount.toFixed(2)}</span></p>
              <p><strong>Helper Payout:</strong> <span className="text-discord_green">${selectedAssignmentForDetails.adminDeterminedHelperPayout?.toFixed(2) || 'N/A'}</span></p>
              <p><strong>Status:</strong> <span className={getStatusColor(selectedAssignmentForDetails.status)}>{selectedAssignmentForDetails.status.replace(/_/g, ' ').toUpperCase()}</span></p>
              {selectedAssignmentForDetails.attachments && selectedAssignmentForDetails.attachments.length > 0 && (
                <div>
                  <strong>Attachments:</strong>
                  <ul className="list-disc list-inside ml-4">
                    {selectedAssignmentForDetails.attachments.map((att, idx) => (
                      <li key={idx}>
                        <a href={`${BACKEND_URL}${att.url}`} target="_blank" rel="noopener noreferrer" className="text-discord_blurple hover:underline">
                          {att.filename}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {selectedAssignmentForDetails.completedWorkAttachments && selectedAssignmentForDetails.completedWorkAttachments.length > 0 && (
                <div>
                  <strong>Completed Work Attachments:</strong>
                  <ul className="list-disc list-inside ml-4">
                    {selectedAssignmentForDetails.completedWorkAttachments.map((att, idx) => (
                      <li key={idx}>
                        <a href={`${BACKEND_URL}${att.url}`} target="_blank" rel="noopener noreferrer" className="text-discord_green hover:underline">
                          {att.filename}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p><strong>Created At:</strong> {new Date(selectedAssignmentForDetails.createdAt).toLocaleString()}</p>
              {selectedAssignmentForDetails.completedAt && <p><strong>Completed At:</strong> {new Date(selectedAssignmentForDetails.completedAt).toLocaleString()}</p>}
              {selectedAssignmentForDetails.paidAt && <p><strong>Paid At:</strong> {new Date(selectedAssignmentForDetails.paidAt).toLocaleString()}</p>}
            </div>
            <button
              onClick={() => setSelectedAssignmentForDetails(null)}
              className="absolute top-4 right-4 text-discord_gray hover:text-discord_white text-2xl"
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboardPage;
