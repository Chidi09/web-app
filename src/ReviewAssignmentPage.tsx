// web-app/src/ReviewAssignmentPage.tsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

// IMPORTANT: Replace with your actual backend URL
const BACKEND_URL = 'http://localhost:3000';

// Define the interface for the user data structure (simplified for this page)
interface UserData {
  _id: string;
  discordId?: string; // Made optional as local users don't have it
  username: string;
}

// Define the interface for the assignment data (populated for display)
interface AssignmentData {
  _id: string;
  ownerId: { _id: string; username: string; discordId: string }; // Populated owner info
  helperId: UserData | null; // Populated helper info, now includes wallet info
  title: string;
  description: string;
  complexity: 'low' | 'medium' | 'high';
  category: string;
  deadline: string;
  paymentAmount: number;
  adminDeterminedHelperPayout?: number;
  attachments: { url: string; filename: string }[];
  completedWorkAttachments?: { url: string; filename: string }[]; // NEW: For helper's submitted work
  status: 'pending' | 'accepted' | 'due' | 'completed' | 'pending_client_review' | 'ready_for_payout' | 'paid' | 'cancelled';
  completedAt: string | null;
}

// Interface for the response from the /assignments/:id/review endpoint
interface ReviewAssignmentResponse {
  message: string;
  assignment?: AssignmentData; // Backend returns assignment object on success
}

// NEW: Interface for summarization response
interface SummarizeResponse {
  message: string;
  summary: string;
}

const ReviewAssignmentPage: React.FC = () => {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState<AssignmentData | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // NEW: State for summarization modal
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);
  const [summaryContent, setSummaryContent] = useState<string>('');
  const [summaryLoading, setSummaryLoading] = useState<boolean>(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);


  useEffect(() => {
    const fetchAssignmentAndUser = async () => {
      setLoading(true);
      setError(null);
      setMessage(null);

      const storedUserData = localStorage.getItem('userData');
      let currentUser: UserData | null = null;

      if (storedUserData) {
        try {
          currentUser = JSON.parse(storedUserData);
          setUserData(currentUser);
        } catch (e) {
          console.error("Error parsing stored user data", e);
          localStorage.removeItem('userData');
          setError('Authentication error. Please log in again.');
          setLoading(false);
          return;
        }
      }

      if (!currentUser || !currentUser._id) {
        setError('You must be logged in to review assignments. Redirecting to login...');
        setTimeout(() => navigate('/login'), 3000); // Redirect to the main login page
        setLoading(false);
        return; // IMPORTANT: Exit early if no valid user
      }

      try {
        const response = await axios.get<{ assignment: AssignmentData }>(`${BACKEND_URL}/assignments/${assignmentId}`, {
          headers: { 'x-user-id': currentUser._id }
        });
        const fetchedAssignment = response.data.assignment;

        // Ensure the logged-in user is the owner of this assignment
        if (fetchedAssignment.ownerId._id.toString() !== currentUser._id.toString()) {
          setError('Forbidden: You are not the owner of this assignment.');
          setLoading(false);
          return;
        }

        // Ensure the assignment is in the correct status for review
        if (fetchedAssignment.status !== 'pending_client_review') {
          setError(`This assignment is currently in "${fetchedAssignment.status.replace(/_/g, ' ').toUpperCase()}" status and cannot be reviewed.`);
          setLoading(false);
          return;
        }

        setAssignment(fetchedAssignment);
      } catch (err: any) {
        console.error('Error fetching assignment details:', err.response?.data || err.message);
        setError(err.response?.data?.message || 'Failed to load assignment details.');
      } finally {
        setLoading(false);
      }
    };

    fetchAssignmentAndUser();
  }, [assignmentId, navigate]); // Added navigate to dependency array

  const handleReview = async (approved: boolean) => {
    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    if (!userData || !assignmentId) {
      setError('User data or assignment ID missing.');
      setIsSubmitting(false);
      return;
    }

    try {
      // Explicitly define the expected response type for axios.post
      const response = await axios.post<ReviewAssignmentResponse>(`${BACKEND_URL}/assignments/${assignmentId}/review`, {
        approved,
        notes,
      }, {
        headers: { 'x-user-id': userData._id }
      });

      setMessage(response.data.message);
      // After successful review, redirect to the main dashboard
      setTimeout(() => {
        navigate('/');
      }, 2000);

    } catch (err: any) {
      console.error('Error submitting review:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Failed to submit review.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // NEW: Summarization functions (copied from App.tsx)
  const handleSummarizeDescription = async (assignmentId: string) => {
    setSummaryLoading(true);
    setSummaryError(null);
    setSummaryContent('');
    setShowSummaryModal(true); // Open modal immediately

    try {
      const response = await axios.post<SummarizeResponse>(`${BACKEND_URL}/assignments/${assignmentId}/summarize-description`);
      setSummaryContent(response.data.summary);
    } catch (err: any) {
      console.error('Error summarizing description:', err.response?.data || err.message);
      setSummaryError(err.response?.data?.message || 'Failed to summarize description.');
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleSummarizeDocument = async (assignmentId: string, attachmentUrl: string) => {
    setSummaryLoading(true);
    setSummaryError(null);
    setSummaryContent('');
    setShowSummaryModal(true); // Open modal immediately

    try {
      // Changed to send fileUrl as the key in the request body
      const response = await axios.post<SummarizeResponse>(`${BACKEND_URL}/assignments/${assignmentId}/summarize-document`, { fileUrl: attachmentUrl });
      setSummaryContent(response.data.summary);
    } catch (err: any) {
      console.error('Error summarizing document:', err.response?.data || err.message);
      setSummaryError(err.response?.data?.message || 'Failed to summarize document. Ensure it is a supported file type (.txt, .pdf, .doc, .docx).');
    } finally {
      setSummaryLoading(false);
    }
  };

  // Helper to check if a file extension is supported for summarization (copied from App.tsx)
  const isSummarizable = (filename: string): boolean => {
    const ext = filename.split('.').pop()?.toLowerCase();
    return ext === 'txt' || ext === 'pdf' || ext === 'doc' || ext === 'docx';
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-discord_dark to-discord_darkest">
        <p className="text-discord_white text-lg">Loading assignment for review...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-discord_dark to-discord_darkest p-4">
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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-discord_dark to-discord_darkest">
        <p className="text-discord_red text-lg">Assignment not found or not available for review.</p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center justify-start min-h-screen bg-gradient-to-br from-discord_dark to-discord_darkest text-discord_white p-4 sm:p-6 lg:p-8 overflow-y-auto"
      // Basic client-side copy prevention
      onCopy={(e) => { e.preventDefault(); /* alert('Copying is not allowed during review.'); */ }} // Changed alert to comment for non-blocking behavior
      onContextMenu={(e) => { e.preventDefault(); }}
      style={{ userSelect: 'none' }} // Disable text selection
    >
      <h1 className="text-4xl sm:text-5xl font-extrabold text-discord_blurple mb-6 text-center drop-shadow-lg">
        Review Assignment
      </h1>

      <div className="bg-gradient-to-br from-discord_darker to-discord_darkest p-6 sm:p-8 rounded-2xl shadow-2xl border border-discord_darker max-w-3xl w-full mb-8 transform transition-all duration-300">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-discord_white mb-4">{assignment.title}</h2>
        <p className="text-discord_gray text-lg mb-4">
          {assignment.description}
          <button
            onClick={() => handleSummarizeDescription(assignment._id)}
            className="ml-2 px-2 py-1 bg-gray-700 text-gray-300 rounded-md text-xs hover:bg-gray-600 transition-colors duration-200"
            title="Summarize Description"
          >
            Summarize
          </button>
        </p>

        <div className="text-discord_light_gray text-base mb-6 space-y-2">
          <p><span className="font-semibold">Category:</span> {assignment.category}</p>
          <p><span className="font-semibold">Complexity:</span> <span className={`font-bold ${assignment.complexity === 'low' ? 'text-green-400' : assignment.complexity === 'medium' ? 'text-yellow-400' : 'text-red-400'}`}>{assignment.complexity.toUpperCase()}</span></p>
          <p><span className="font-semibold">Deadline:</span> {new Date(assignment.deadline).toLocaleString()}</p>
          <p><span className="font-semibold">Student's Budget:</span> ${assignment.paymentAmount.toFixed(2)}</p>
          {assignment.adminDeterminedHelperPayout !== undefined && (
            <p><span className="font-semibold">Helper Payout:</span> ${assignment.adminDeterminedHelperPayout.toFixed(2)}</p>
          )}
          <p><span className="font-semibold">Status:</span> <span className="font-bold text-discord_green">{assignment.status.replace(/_/g, ' ').toUpperCase()}</span></p>
          <p><span className="font-semibold">Owner:</span> {assignment.ownerId.username} ({assignment.ownerId.discordId ? `Discord ID: ${assignment.ownerId.discordId}` : 'Local User'})</p>
          {assignment.helperId && (
            <p><span className="font-semibold">Helper:</span> {assignment.helperId.username} ({assignment.helperId.discordId ? `Discord ID: ${assignment.helperId.discordId}` : 'Local User'})</p>
          )}
          {assignment.completedAt && (
            <p><span className="font-semibold">Completed On:</span> {new Date(assignment.completedAt).toLocaleString()}</p>
          )}
        </div>

        {assignment.attachments && assignment.attachments.length > 0 && (
          <div className="mt-3 mb-6">
            <p className="text-discord_gray text-sm font-semibold mb-1">
              Attachments (View Only - Copying Disabled):
            </p>
            <ul className="list-disc list-inside text-discord_light_gray text-xs">
              {assignment.attachments.map((attachment, idx) => (
                <li key={idx} className="flex items-center justify-between">
                  <a
                    href={`${BACKEND_URL}${attachment.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-discord_blurple hover:underline break-all mr-2"
                  >
                    {attachment.filename}
                  </a>
                  {isSummarizable(attachment.filename) && (
                    <button
                      onClick={() => handleSummarizeDocument(assignment._id, attachment.url)}
                      className="px-2 py-1 bg-gray-700 text-gray-300 rounded-md text-xs hover:bg-gray-600 transition-colors duration-200"
                      title="Summarize Document"
                    >
                      Summarize
                    </button>
                  )}
                </li>
              ))}
            </ul>
            <p className="text-discord_red text-xs mt-2">
              Note: For Google Docs, ensure the shared link provides view-only access. For PDFs, they will open in your browser's default reader.
              Direct in-document commenting for Google Docs via API is a complex feature not yet implemented.
            </p>
          </div>
        )}

        {/* NEW: Display Completed Work Attachments with Summarize Buttons */}
        {assignment.completedWorkAttachments && assignment.completedWorkAttachments.length > 0 && (
          <div className="mt-3 mb-6">
            <p className="text-discord_gray text-sm font-semibold mb-1">
              Completed Work Attachments (View Only - Copying Disabled):
            </p>
            <ul className="list-disc list-inside text-discord_light_gray text-xs">
              {assignment.completedWorkAttachments.map((attachment, idx) => (
                <li key={idx} className="flex items-center justify-between">
                  <a
                    href={`${BACKEND_URL}${attachment.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-discord_green hover:underline break-all mr-2"
                  >
                    {attachment.filename}
                  </a>
                  {isSummarizable(attachment.filename) && (
                    <button
                      onClick={() => handleSummarizeDocument(assignment._id, attachment.url)}
                      className="px-2 py-1 bg-gray-700 text-gray-300 rounded-md text-xs hover:bg-gray-600 transition-colors duration-200"
                      title="Summarize Document"
                    >
                      Summarize
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}


        {message && (
          <div className={`p-3 mb-4 rounded-md text-center ${error ? 'bg-red-600 bg-opacity-20 border border-red-500 text-red-300' : 'bg-green-600 bg-opacity-20 border border-green-500 text-green-300'}`}>
            <p className="font-bold">{message}</p>
          </div>
        )}

        <div className="mt-6 space-y-4">
          <label htmlFor="notes" className="block text-discord_gray text-sm font-semibold mb-2">
            Notes for Helper (Optional - will be sent via Discord DM):
          </label>
          <textarea
            id="notes"
            className="shadow-inner appearance-none border border-discord_darker rounded-md w-full py-2 px-3 text-discord_white leading-tight focus:outline-none focus:ring-2 focus:ring-discord_blurple focus:border-transparent bg-discord_darker placeholder-gray-850 h-28 resize-none transition duration-200 ease-in-out"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Provide feedback or request revisions..."
          ></textarea>

          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            <button
              onClick={() => handleReview(true)}
              className="bg-discord_green text-discord_white px-6 py-3 rounded-md font-bold hover:bg-opacity-90 transition duration-300 w-full sm:w-1/2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Approving...' : 'Approve Assignment'}
            </button>
            <button
              onClick={() => handleReview(false)}
              className="bg-discord_red text-discord_white px-6 py-3 rounded-md font-bold hover:bg-opacity-90 transition duration-300 w-full sm:w-1/2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Rejecting...' : 'Reject & Request Revisions'}
            </button>
          </div>
        </div>
      </div>

      {/* Summary Modal (copied from App.tsx) */}
      {showSummaryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-discord_darker to-discord_darkest p-6 rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto relative">
            <h3 className="text-2xl font-bold text-discord_blurple mb-4">Summary</h3>
            {summaryLoading ? (
              <p className="text-discord_gray">Generating summary, please wait...</p>
            ) : summaryError ? (
              <p className="text-discord_red">{summaryError}</p>
            ) : (
              <p className="text-discord_white whitespace-pre-wrap">{summaryContent}</p>
            )}
            <button
              onClick={() => setShowSummaryModal(false)}
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

export default ReviewAssignmentPage;
