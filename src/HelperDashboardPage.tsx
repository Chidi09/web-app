// web-app/src/HelperDashboardPage.tsx

import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { UserData, AssignmentData } from './App'; // Import shared interfaces

// IMPORTANT: Ensure this matches your backend URL
const BACKEND_URL = 'http://localhost:3000';

// Define the interface for the successful response when fetching assignments
interface AssignmentsApiResponse {
  message: string;
  assignments: AssignmentData[];
}

// NEW: Define the interface for responses when updating an assignment (e.g., accept, complete)
interface AssignmentUpdateResponse {
  message: string;
  assignment: AssignmentData; // The updated assignment object
}

const HelperDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [availableAssignments, setAvailableAssignments] = useState<AssignmentData[]>([]);
  const [myAssignments, setMyAssignments] = useState<AssignmentData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [acceptMessage, setAcceptMessage] = useState<string | null>(null);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState<boolean>(false);

  // State for submitting completed work
  const [showSubmitWorkModal, setShowSubmitWorkModal] = useState<boolean>(false);
  const [selectedAssignmentToComplete, setSelectedAssignmentToComplete] = useState<AssignmentData | null>(null);
  const [completedWorkFiles, setCompletedWorkFiles] = useState<FileList | null>(null);
  const [isSubmittingWork, setIsSubmittingWork] = useState<boolean>(false);
  const [submitWorkMessage, setSubmitWorkMessage] = useState<string | null>(null);
  const [submitWorkError, setSubmitWorkError] = useState<string | null>(null);


  useEffect(() => {
    const storedUserData = localStorage.getItem('userData');
    if (storedUserData) {
      const user: UserData = JSON.parse(storedUserData);
      if (!user.roles.includes('helper') && !user.isAdmin) { // Admins can also view helper dashboard
        navigate('/login'); // Redirect if not a helper or admin
        return;
      }
      setUserData(user);
      fetchAssignments();
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const fetchAssignments = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch available assignments (pending, unassigned)
      // The backend now correctly filters for helperId: null when assignedToMe=false is sent.
      const availableResponse = await axios.get<AssignmentsApiResponse>(`${BACKEND_URL}/assignments?status=pending&assignedToMe=false`);
      // Frontend filter: ensure it's unassigned. The backend should already handle 'pending' status.
      setAvailableAssignments(availableResponse.data.assignments.filter(a => a.helperId === null));

      // Fetch assignments assigned to me (any status where helperId matches current user)
      const myAssignmentsResponse = await axios.get<AssignmentsApiResponse>(`${BACKEND_URL}/assignments?assignedToMe=true`);
      setMyAssignments(myAssignmentsResponse.data.assignments);

    } catch (err: any) {
      console.error('Error fetching assignments:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Failed to load assignments.');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptAssignment = async (assignmentId: string) => {
    setIsAccepting(true);
    setAcceptMessage(null);
    setAcceptError(null);
    try {
      // Explicitly type the response for axios.post
      const response = await axios.post<AssignmentUpdateResponse>(`${BACKEND_URL}/assignments/${assignmentId}/accept`);
      setAcceptMessage(response.data.message);
      fetchAssignments(); // Refresh lists
    } catch (err: any) {
      console.error('Error accepting assignment:', err.response?.data || err.message);
      setAcceptError(err.response?.data?.message || 'Failed to accept assignment.');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setCompletedWorkFiles(e.target.files);
    }
  };

  const handleOpenSubmitWorkModal = (assignment: AssignmentData) => {
    setSelectedAssignmentToComplete(assignment);
    setCompletedWorkFiles(null); // Clear previous files
    setSubmitWorkMessage(null);
    setSubmitWorkError(null);
    setShowSubmitWorkModal(true);
  };

  const handleSubmitWork = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedAssignmentToComplete || !completedWorkFiles || completedWorkFiles.length === 0) {
      setSubmitWorkError('Please select files to upload.');
      return;
    }

    setIsSubmittingWork(true);
    setSubmitWorkMessage(null);
    setSubmitWorkError(null);

    const formData = new FormData();
    for (let i = 0; i < completedWorkFiles.length; i++) {
      formData.append('completedWorkAttachments', completedWorkFiles[i]);
    }

    try {
      // Explicitly type the response for axios.post
      const response = await axios.post<AssignmentUpdateResponse>(`${BACKEND_URL}/assignments/${selectedAssignmentToComplete._id}/complete`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setSubmitWorkMessage(response.data.message);
      fetchAssignments(); // Refresh lists
      setShowSubmitWorkModal(false);
    } catch (err: any) {
      console.error('Error submitting work:', err.response?.data || err.message);
      setSubmitWorkError(err.response?.data?.message || 'Failed to submit work.');
    } finally {
      setIsSubmittingWork(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-discord_dark to-discord_darkest">
        <p className="text-discord_white text-lg">Loading helper dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-discord_dark to-discord_darkest text-discord_white p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-discord_green mb-8 text-center drop-shadow-lg">
          Helper Dashboard
        </h1>

        {error && <p className="text-discord_red text-center mb-4">{error}</p>}
        {acceptMessage && (
          <div className="bg-green-600 bg-opacity-20 border border-green-500 text-green-300 px-4 py-3 rounded-md text-center mb-4">
            <p className="font-bold">{acceptMessage}</p>
          </div>
        )}
        {acceptError && (
          <div className="bg-red-600 bg-opacity-20 border border-red-500 text-red-300 px-4 py-3 rounded-md text-center mb-4">
            <p className="font-bold">{acceptError}</p>
          </div>
        )}
        {submitWorkMessage && (
          <div className="bg-green-600 bg-opacity-20 border border-green-500 text-green-300 px-4 py-3 rounded-md text-center mb-4">
            <p className="font-bold">{submitWorkMessage}</p>
          </div>
        )}
        {submitWorkError && (
          <div className="bg-red-600 bg-opacity-20 border border-red-500 text-red-300 px-4 py-3 rounded-md text-center mb-4">
            <p className="font-bold">{submitWorkError}</p>
          </div>
        )}

        {/* Total Earnings Section */}
        <div className="bg-discord_darker p-6 rounded-lg shadow-xl border border-discord_dark mb-8 text-center">
          <h2 className="text-2xl font-bold text-discord_white mb-2">Your Total Earnings</h2>
          <p className="text-discord_green text-4xl font-extrabold">
            ${userData?.totalEarnings?.toFixed(2) || '0.00'}
          </p>
        </div>

        {/* Available Assignments Section */}
        <h2 className="text-3xl font-bold text-discord_white mb-6 text-center">Available Assignments</h2>
        {availableAssignments.length === 0 ? (
          <p className="text-discord_gray text-center text-lg mb-12">No new assignments matching your specializations are available at the moment. Check back later!</p>
        ) : (
          <div className="bg-discord_darker p-6 rounded-lg shadow-xl border border-discord_dark overflow-x-auto mb-12">
            <table className="min-w-full divide-y divide-discord_dark">
              <thead className="bg-discord_dark">
                <tr>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-discord_gray uppercase tracking-wider">
                    Title
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-discord_gray uppercase tracking-wider">
                    Category
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-discord_gray uppercase tracking-wider">
                    Client Pays
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-discord_gray uppercase tracking-wider">
                    Your Payout
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-discord_gray uppercase tracking-wider">
                    Deadline
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-discord_gray uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-discord_darker divide-y divide-discord_dark">
                {availableAssignments.map((assignment) => (
                  <tr key={assignment._id} className="hover:bg-discord_light_dark/50 transition">
                    <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-white">{assignment.title}</td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-discord_gray">{assignment.category}</td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-discord_blurple">
                      ${assignment.paymentAmount.toFixed(2)}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-discord_green">
                      {/* Display N/A if adminDeterminedHelperPayout is null or undefined */}
                      ${assignment.adminDeterminedHelperPayout?.toFixed(2) || 'N/A'}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-discord_gray">
                      {new Date(assignment.deadline).toLocaleString()}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleAcceptAssignment(assignment._id)}
                        className="bg-discord_green text-white px-3 py-1 rounded font-semibold text-sm hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isAccepting}
                      >
                        {isAccepting ? 'Accepting...' : 'Accept'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Your Assignments Section */}
        <h2 className="text-3xl font-bold text-discord_white mb-6 text-center">Your Active Assignments</h2>
        {myAssignments.length === 0 ? (
          <p className="text-discord_gray text-center text-lg">You currently have no active assignments.</p>
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
                    Status
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-discord_gray uppercase tracking-wider">
                    Your Payout
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-discord_gray uppercase tracking-wider">
                    Deadline
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-discord_gray uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-discord_darker divide-y divide-discord_dark">
                {myAssignments.map((assignment) => (
                  <tr key={assignment._id} className="hover:bg-discord_light_dark/50 transition">
                    <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-white">{assignment.title}</td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-discord_gray">
                      {assignment.ownerId?.username || 'N/A'}
                    </td>
                    <td className={`px-3 py-4 whitespace-nowrap text-sm font-bold ${getStatusColor(assignment.status)}`}>
                      {assignment.status.replace(/_/g, ' ').toUpperCase()}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-discord_green">
                      ${assignment.adminDeterminedHelperPayout?.toFixed(2) || 'N/A'}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-discord_gray">
                      {new Date(assignment.deadline).toLocaleString()}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {(assignment.status === 'accepted' || assignment.status === 'due') && (
                          <button
                            onClick={() => handleOpenSubmitWorkModal(assignment)}
                            className="bg-discord_blurple text-white px-3 py-1 rounded font-semibold text-sm hover:bg-opacity-90"
                          >
                            Submit Work
                          </button>
                        )}
                        {assignment.status === 'pending_client_review' && (
                          <span className="text-sm text-discord_gray italic">Awaiting Client Review</span>
                        )}
                        {assignment.status === 'ready_for_payout' && (
                          <span className="text-sm text-discord_green font-bold">Ready for Payout!</span>
                        )}
                        {assignment.status === 'paid' && (
                          <span className="text-sm text-discord_green font-bold">Paid!</span>
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

      {/* Submit Work Modal */}
      {showSubmitWorkModal && selectedAssignmentToComplete && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-discord_darker to-discord_darkest p-6 rounded-lg shadow-xl max-w-md w-full relative">
            <h3 className="text-2xl font-bold text-discord_blurple mb-4">Submit Work for: {selectedAssignmentToComplete.title}</h3>
            {submitWorkError && <p className="text-discord_red text-center mb-4">{submitWorkError}</p>}
            {submitWorkMessage && <p className="text-discord_green text-center mb-4">{submitWorkMessage}</p>}
            <form onSubmit={handleSubmitWork} className="space-y-4">
              <div>
                <label htmlFor="completedWorkFiles" className="block text-discord_gray text-sm font-semibold mb-2">
                  Upload Completed Work Files:
                </label>
                <input
                  type="file"
                  id="completedWorkFiles"
                  className="block w-full text-sm text-discord_white
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-discord_blurple file:text-white
                    hover:file:bg-indigo-600 cursor-pointer"
                  multiple
                  onChange={handleFileChange}
                  required
                />
                <p className="mt-1 text-sm text-discord_gray">Max file size: 8MB per file. Allowed types: PDF, DOCX, TXT, common image formats.</p>
              </div>
              <button
                type="submit"
                className="bg-gradient-to-r from-discord_blurple to-indigo-600 text-discord_white px-6 py-3 rounded-md font-extrabold shadow-lg hover:from-indigo-600 hover:to-discord_blurple transition-all duration-300 w-full text-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmittingWork || !completedWorkFiles || completedWorkFiles.length === 0}
              >
                {isSubmittingWork ? 'Submitting...' : 'Submit Work'}
              </button>
            </form>
            <button
              onClick={() => setShowSubmitWorkModal(false)}
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

export default HelperDashboardPage;
