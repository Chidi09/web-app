// web-app/src/PayHelperPage.tsx

import React, { useState, useEffect, FormEvent } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { AssignmentData } from './App'; // Import shared interfaces

// IMPORTANT: Ensure this matches your backend URL
const BACKEND_URL = 'http://localhost:3000';

// Define the interface for the successful response when processing payout
interface PayoutResponse {
  message: string;
  assignment: AssignmentData; // Assuming the updated assignment data is returned
}

const PayHelperPage: React.FC = () => {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState<AssignmentData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchAssignmentDetails = async () => {
      if (!assignmentId) {
        setError('Assignment ID is missing.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const response = await axios.get<{ assignment: AssignmentData }>(`${BACKEND_URL}/assignments/${assignmentId}`);
        if (response.data.assignment) {
          setAssignment(response.data.assignment);
          // Check if the assignment is in the correct status for payout
          if (response.data.assignment.status !== 'ready_for_payout') {
            setError(`This assignment is not ready for payout. Current status: ${response.data.assignment.status.replace(/_/g, ' ').toUpperCase()}.`);
          }
        } else {
          setError('Assignment not found.');
        }
      } catch (err: any) {
        console.error('Error fetching assignment details:', err.response?.data || err.message);
        setError(err.response?.data?.message || 'Failed to load assignment details.');
      } finally {
        setLoading(false);
      }
    };

    fetchAssignmentDetails();
  }, [assignmentId]);

  const handlePayout = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage(null);
    setError(null);

    if (!assignmentId) {
      setError('Assignment ID is missing for payout.');
      setIsSubmitting(false);
      return;
    }
    if (!transactionId.trim()) {
      setError('Transaction ID is required.');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await axios.post<PayoutResponse>(`${BACKEND_URL}/admin/assignments/${assignmentId}/pay`, {
        transactionId,
        notes,
      });

      if (response.status === 200) {
        setSuccessMessage('Payout recorded successfully! Assignment marked as paid.');
        // Optionally, update the assignment status locally or refetch
        setAssignment(prev => prev ? { ...prev, status: 'paid', paidAt: new Date().toISOString() } : null);
        // Clear form fields after successful submission
        setTransactionId('');
        setNotes('');
      } else {
        setError(response.data.message || 'Failed to record payout.');
      }
    } catch (err: any) {
      console.error('Error processing payout:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'An error occurred while processing payout.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-discord_dark to-discord_darkest">
        <p className="text-discord_white text-lg">Loading assignment details...</p>
      </div>
    );
  }

  if (error && !assignment) { // Only show full error if no assignment data could be loaded
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-discord_dark to-discord_darkest p-4">
        <div className="bg-discord_darker p-8 rounded-lg shadow-xl text-center">
          <p className="text-discord_red text-lg mb-4">{error}</p>
          <button
            onClick={() => navigate('/admin-dashboard')}
            className="bg-discord_gray text-discord_white px-6 py-3 rounded-full font-bold hover:bg-opacity-90 transition duration-300"
          >
            Back to Admin Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Render the page even if there's an error, but with the error message displayed
  return (
    <div className="min-h-screen bg-gradient-to-br from-discord_dark to-discord_darkest text-discord_white p-4 sm:p-6 lg:p-8 flex flex-col items-center">
      <div className="bg-gradient-to-br from-discord_darker to-discord_darkest p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-2xl mx-auto border border-discord_darker animate-fade-in">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-discord_blurple mb-6 text-center drop-shadow-lg">
          Process Payout
        </h1>

        {error && (
          <div className="bg-red-600 bg-opacity-20 border border-red-500 text-red-300 px-4 py-3 rounded-md text-center mb-4">
            <p className="font-bold">{error}</p>
          </div>
        )}
        {successMessage && (
          <div className="bg-green-600 bg-opacity-20 border border-green-500 text-green-300 px-4 py-3 rounded-md text-center mb-4">
            <p className="font-bold">{successMessage}</p>
          </div>
        )}

        {assignment && (
          <div className="mb-8 space-y-4">
            <h2 className="text-2xl font-bold text-discord_white">Assignment: {assignment.title}</h2>
            <p className="text-discord_gray">Description: {assignment.description}</p>
            <p className="text-discord_gray">Category: {assignment.category}</p>
            <p className="text-discord_gray">Complexity: {assignment.complexity}</p>
            <p className="text-discord_gray">Client: {assignment.ownerId.username}</p>
            
            {assignment.helperId ? (
              <>
                <p className="text-discord_gray">Helper: {assignment.helperId.username}</p>
                <p className="text-discord_green font-bold text-xl">
                  Payout Amount: ${assignment.adminDeterminedHelperPayout?.toFixed(2) || 'N/A'}
                </p>
                <p className="text-discord_gray">
                  Helper Wallet Address: <span className="font-mono break-all">{assignment.helperId.walletAddress || 'N/A'}</span>
                </p>
                <p className="text-discord_gray">
                  Helper Wallet Type: <span className="font-semibold">{assignment.helperId.walletType || 'N/A'}</span>
                </p>
              </>
            ) : (
              <p className="text-discord_red">No helper assigned for this assignment.</p>
            )}

            <p className={`text-lg font-bold ${assignment.status === 'paid' ? 'text-discord_green' : 'text-yellow-400'}`}>
              Current Status: {assignment.status.replace(/_/g, ' ').toUpperCase()}
            </p>
          </div>
        )}

        {assignment && assignment.status === 'ready_for_payout' && (
          <form onSubmit={handlePayout} className="space-y-4">
            <div>
              <label htmlFor="transactionId" className="block text-discord_gray text-sm font-semibold mb-2">
                Transaction ID:
              </label>
              <input
                type="text"
                id="transactionId"
                className="shadow-inner appearance-none border border-discord_darker rounded-md w-full py-2 px-3 text-discord_white leading-tight focus:outline-none focus:ring-2 focus:ring-discord_blurple focus:border-transparent bg-discord_darker placeholder-gray-850 transition duration-200 ease-in-out"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                required
                placeholder="Enter transaction ID from payment gateway"
              />
            </div>
            <div>
              <label htmlFor="notes" className="block text-discord_gray text-sm font-semibold mb-2">
                Notes (Optional):
              </label>
              <textarea
                id="notes"
                className="shadow-inner appearance-none border border-discord_darker rounded-md w-full py-2 px-3 text-discord_white leading-tight focus:outline-none focus:ring-2 focus:ring-discord_blurple focus:border-transparent bg-discord_darker placeholder-gray-850 transition duration-200 ease-in-out h-24"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes for this payout"
              />
            </div>
            <button
              type="submit"
              className="bg-gradient-to-r from-discord_green to-emerald-600 text-discord_white px-6 py-3 rounded-md font-extrabold shadow-lg hover:from-emerald-600 hover:to-discord_green transition-all duration-300 w-full text-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting || !transactionId.trim()}
            >
              {isSubmitting ? 'Processing Payout...' : 'Mark as Paid'}
            </button>
          </form>
        )}

        {assignment && assignment.status === 'paid' && (
            <p className="text-discord_green text-center text-xl font-bold mt-4">
                This assignment has already been paid on {assignment.paidAt ? new Date(assignment.paidAt).toLocaleString() : 'N/A'}.
            </p>
        )}

        <button
          onClick={() => navigate('/admin-dashboard')}
          className="bg-discord_gray text-discord_white px-6 py-3 rounded-full font-bold hover:bg-opacity-90 transition duration-300 w-full mt-8 shadow-lg transform hover:-translate-y-0.5"
        >
          Back to Admin Dashboard
        </button>
      </div>
    </div>
  );
};

export default PayHelperPage;
