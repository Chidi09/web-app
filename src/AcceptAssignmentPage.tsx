// web-app/src/AcceptAssignmentPage.tsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

// IMPORTANT: Ensure this matches your backend URL
const BACKEND_URL = 'http://localhost:3000';

// Define the interface for the user data structure (simplified for this context)
interface UserData {
  _id: string;
  discordId: string;
  username: string;
  avatarUrl: string | null;
  roles: string[]; // Include roles to check if the user is a helper
}

// Define the interface for the assignment data structure
interface AssignmentData {
  _id: string;
  ownerId: UserData;
  helperId: UserData | null;
  title: string;
  description: string;
  complexity: 'low' | 'medium' | 'high';
  category: string;
  deadline: string;
  paymentAmount: number;
  adminDeterminedHelperPayout?: number;
  attachments: { url: string; filename: string }[];
  status: 'pending' | 'accepted' | 'due' | 'completed' | 'pending_client_review' | 'ready_for_payout' | 'paid' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  paidAt: string | null;
}

// Interface for the response from the /assignments/:id/accept endpoint
interface AcceptAssignmentResponse {
  message: string;
  assignment: AssignmentData;
}

const AcceptAssignmentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>(); // Get assignment ID from URL params
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState<AssignmentData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [userData, setUserData] = useState<UserData | null>(null); // To get authenticated user's ID and roles

  useEffect(() => {
    const fetchAssignment = async () => {
      setLoading(true);
      setError(null);
      setMessage(null);

      const storedUserData = localStorage.getItem('userData');
      if (storedUserData) {
        try {
          const parsedUserData: UserData = JSON.parse(storedUserData);
          setUserData(parsedUserData);

          if (!id) {
            setError('Assignment ID is missing.');
            setLoading(false);
            return;
          }

          // Fetch assignment details
          const response = await axios.get<{ message: string; assignment: AssignmentData }>(
            `${BACKEND_URL}/assignments/${id}`,
            { headers: { 'x-user-id': parsedUserData._id } } // Pass user ID for authentication
          );
          setAssignment(response.data.assignment);

          // Basic authorization/status check on frontend (backend also enforces this)
          if (!parsedUserData.roles.includes('helper')) {
            setError('Access Denied: You must be a helper to accept assignments.');
            setAssignment(null);
          } else if (response.data.assignment.status !== 'pending') {
            setError(`Assignment cannot be accepted. Current status: ${response.data.assignment.status.replace(/_/g, ' ').toUpperCase()}.`);
            setAssignment(null);
          } else if (response.data.assignment.helperId) {
            setError('This assignment has already been accepted by another helper.');
            setAssignment(null);
          } else if (response.data.assignment.adminDeterminedHelperPayout === undefined || response.data.assignment.adminDeterminedHelperPayout === null || response.data.assignment.adminDeterminedHelperPayout <= 0) {
            setError('This assignment is not yet ready for acceptance. Admin needs to set the helper payout.');
            setAssignment(null);
          }

        } catch (err: any) {
          console.error('Error fetching assignment for acceptance:', err.response?.data || err.message);
          setError(err.response?.data?.message || 'Failed to load assignment for acceptance.');
        } finally {
          setLoading(false);
        }
      } else {
        setError('User not authenticated. Please log in.');
        setLoading(false);
        navigate('/'); // Redirect to login if not authenticated
      }
    };

    fetchAssignment();
  }, [id, navigate]); // Re-fetch if ID changes or navigate function changes

  const handleAcceptAssignment = async () => {
    setIsSubmitting(true);
    setMessage(null);
    setError(null);

    if (!userData || !assignment) {
      setError('Authentication or assignment data missing.');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await axios.post<AcceptAssignmentResponse>(
        `${BACKEND_URL}/assignments/${assignment._id}/accept`,
        {}, // No body needed for this endpoint as helperId is from auth
        { headers: { 'x-user-id': userData._id } }
      );
      setMessage(response.data.message);
      // After accepting, redirect back to the main app dashboard
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err: any) {
      console.error('Error accepting assignment:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Failed to accept assignment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-discord_dark to-discord_darkest text-discord_white">
        <p className="text-lg">Loading assignment details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-discord_dark to-discord_darkest p-4 text-discord_white">
        <p className="text-discord_red text-lg mb-4">Error: {error}</p>
        <button
          onClick={() => navigate('/')}
          className="bg-discord_blurple text-discord_white px-6 py-3 rounded-md font-bold hover:bg-opacity-90 transition duration-300"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-discord_dark to-discord_darkest text-discord_white">
        <p className="text-lg">No assignment data available or not eligible for acceptance.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-discord_dark to-discord_darkest text-discord_white flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="bg-gradient-to-br from-discord_darker to-discord_darkest p-6 sm:p-8 rounded-2xl shadow-2xl border border-discord_darker max-w-4xl w-full">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-discord_blurple mb-6 text-center">
          Accept Assignment: "{assignment.title}"
        </h1>

        {message && (
          <div className="p-3 mb-4 rounded-md text-center bg-discord_green text-white">
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Assignment Details Column */}
          <div className="bg-discord_light_dark p-5 rounded-lg shadow-md border border-discord_dark">
            <h3 className="text-xl font-bold text-discord_white mb-3">Details</h3>
            <p className="text-discord_gray text-sm mb-2"><span className="font-semibold">Description:</span> {assignment.description}</p>
            <p className="text-discord_gray text-sm mb-2"><span className="font-semibold">Category:</span> {assignment.category}</p>
            <p className="text-discord_gray text-sm mb-2"><span className="font-semibold">Complexity:</span> {assignment.complexity.toUpperCase()}</p>
            <p className="text-discord_gray text-sm mb-2"><span className="font-semibold">Deadline:</span> {new Date(assignment.deadline).toLocaleString()}</p>
            <p className="text-discord_gray text-sm mb-2"><span className="font-semibold">Student's Budget:</span> ${assignment.paymentAmount.toFixed(2)}</p>
            {assignment.adminDeterminedHelperPayout !== undefined && assignment.adminDeterminedHelperPayout !== null && (
              <p className="text-discord_gray text-sm mb-2"><span className="font-semibold">Your Payout:</span> <span className="font-bold text-discord_green">${assignment.adminDeterminedHelperPayout.toFixed(2)}</span></p>
            )}
            <p className="text-discord_gray text-sm mb-2"><span className="font-semibold">Status:</span> <span className="font-bold text-discord_green">{assignment.status.replace(/_/g, ' ').toUpperCase()}</span></p>
            <p className="text-discord_gray text-sm mb-2"><span className="font-semibold">Owner:</span> {assignment.ownerId ? `${assignment.ownerId.username} (${assignment.ownerId.discordId})` : 'N/A'}</p>

            {assignment.attachments && assignment.attachments.length > 0 && (
              <div className="mt-4 pt-4 border-t border-discord_dark">
                <p className="text-discord_gray text-sm font-semibold mb-2">Attachments:</p>
                <ul className="list-disc list-inside text-discord_light_gray text-xs">
                  {assignment.attachments.map((attachment, idx) => (
                    <li key={idx}>
                      <a
                        href={`${BACKEND_URL}${attachment.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-discord_blurple hover:underline break-all"
                      >
                        {attachment.filename}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Acceptance Action Column */}
          <div className="bg-discord_light_dark p-5 rounded-lg shadow-md border border-discord_dark flex flex-col justify-center items-center">
            <p className="text-lg text-center mb-6">
              Ready to take on this assignment?
            </p>
            <button
              onClick={handleAcceptAssignment}
              className="bg-discord_blurple text-discord_white px-8 py-4 rounded-md font-bold hover:bg-opacity-90 transition duration-300 w-full max-w-xs text-xl"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Accepting...' : `Accept Assignment ($${assignment.adminDeterminedHelperPayout?.toFixed(2) || 'N/A'})`}
            </button>
          </div>
        </div>

        <button
          onClick={() => navigate('/')}
          className="bg-discord_gray text-discord_white px-6 py-3 rounded-full font-bold hover:bg-opacity-90 transition duration-300 w-full mt-8 shadow-lg transform hover:-translate-y-0.5"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default AcceptAssignmentPage;
