// web-app/src/ClientDashboardPage.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import CreateAssignmentForm from './CreateAssignmentForm'; // Assuming this component is in the same directory
import { UserData, AssignmentData } from './App'; // Import shared interfaces

const BACKEND_URL = 'http://localhost:3000';

// NEW: Interface for summarization response
interface SummarizeResponse {
    message: string;
    summary: string;
}

const ClientDashboardPage: React.FC = () => {
    const navigate = useNavigate();
    const [userData, setUserData] = useState<UserData | null>(null);
    const [assignments, setAssignments] = useState<AssignmentData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null); // For success messages

    // NEW: State for summarization modal
    const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);
    const [summaryContent, setSummaryContent] = useState<string>('');
    const [summaryLoading, setSummaryLoading] = useState<boolean>(false);
    const [summaryError, setSummaryError] = useState<string | null>(null);


    useEffect(() => {
        const storedUserData = localStorage.getItem('userData');
        if (storedUserData) {
            const user: UserData = JSON.parse(storedUserData);
            if (!user.roles.includes('client')) {
                navigate('/'); // Redirect if not a client
                return;
            }
            setUserData(user);
            fetchAssignments(user._id);
        } else {
            navigate('/login');
        }
    }, [navigate]);

    const fetchAssignments = async (userId: string) => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get<{ assignments: AssignmentData[] }>(`${BACKEND_URL}/assignments/user`);
            // Filter assignments to only show those created by the client
            setAssignments(response.data.assignments.filter((a: AssignmentData) => a.ownerId._id === userId));
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to load assignments.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('userData');
        localStorage.removeItem('token');
        navigate('/login');
    };

    const handleAssignmentCreated = () => {
        if (userData) {
            fetchAssignments(userData._id); // Re-fetch assignments after a new one is created
            setMessage('Assignment created successfully!');
            setTimeout(() => setMessage(null), 3000); // Clear message after 3 seconds
        }
    };

    const handleReviewAssignment = (assignmentId: string) => {
        navigate(`/review-assignment/${assignmentId}`);
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
            const response = await axios.post<SummarizeResponse>(`${BACKEND_URL}/assignments/${assignmentId}/summarize-document`, { attachmentUrl });
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


    if (!userData || loading) {
        return <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-discord_dark to-discord_darkest"><p className="text-discord_white text-lg">Loading Client Dashboard...</p></div>;
    }

    return (
        <div className="flex flex-col items-center justify-start min-h-screen bg-gradient-to-br from-discord_dark to-discord_darkest text-discord_white p-4 sm:p-6 lg:p-8 overflow-y-auto">
            <div className="w-full max-w-6xl">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-4xl font-extrabold text-discord_blurple">Client Dashboard</h1>
                    <button
                        onClick={handleLogout}
                        className="bg-discord_red text-white px-4 py-2 rounded-lg font-bold hover:bg-opacity-90 transition"
                    >
                        Logout
                    </button>
                </div>

                {message && (
                    <div className="p-3 mb-4 rounded-md text-center w-full bg-green-600 bg-opacity-20 border border-green-500 text-green-300">
                        <p className="font-bold">{message}</p>
                    </div>
                )}
                {error && (
                    <div className="p-3 mb-4 rounded-md text-center w-full bg-red-600 bg-opacity-20 border border-red-500 text-red-300">
                        <p className="font-bold">{error}</p>
                    </div>
                )}

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Create Assignment */}
                    <div className="lg:col-span-1">
                         <CreateAssignmentForm userId={userData._id} onAssignmentCreated={handleAssignmentCreated} />
                    </div>

                    {/* Right Column: My Assignments */}
                    <div className="lg:col-span-2">
                        <div className="bg-gradient-to-br from-discord_darker to-discord_darkest p-6 rounded-2xl shadow-2xl border border-discord_darker">
                            <h2 className="text-3xl font-extrabold text-discord_blurple mb-6">My Assignments</h2>
                            {assignments.length === 0 ? (
                                <p className="text-discord_gray">You haven't created any assignments yet.</p>
                            ) : (
                                <div className="space-y-4">
                                    {assignments.map(assignment => (
                                        <div key={assignment._id} className="bg-discord_light_dark p-4 rounded-lg border border-discord_dark hover:border-discord_blurple transition">
                                            <h3 className="font-bold text-xl text-white">{assignment.title}</h3>
                                            <p className="text-sm text-discord_gray mb-2">Category: {assignment.category}</p>
                                            <p className={`text-sm font-bold ${assignment.status === 'paid' ? 'text-discord_green' : 'text-yellow-400'}`}>
                                                Status: {assignment.status.replace(/_/g, ' ').toUpperCase()}
                                            </p>
                                            {assignment.attachments && assignment.attachments.length > 0 && (
                                                <div className="mt-3">
                                                    <p className="text-discord_gray text-sm font-semibold mb-1">Attachments:</p>
                                                    <ul className="list-disc list-inside text-discord_light_gray text-xs">
                                                        {assignment.attachments.map((attachment: { url: string; filename: string }, idx: number) => (
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
                                                </div>
                                            )}
                                            {assignment.completedWorkAttachments && assignment.completedWorkAttachments.length > 0 && (
                                                <div className="mt-3">
                                                    <p className="text-discord_gray text-sm font-semibold mb-1">Completed Work:</p>
                                                    <ul className="list-disc list-inside text-discord_light_gray text-xs">
                                                        {assignment.completedWorkAttachments.map((attachment: { url: string; filename: string }, idx: number) => (
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
                                            {assignment.status === 'pending_client_review' && (
                                                <button
                                                    onClick={() => handleReviewAssignment(assignment._id)}
                                                    className="mt-2 bg-discord_green text-white px-3 py-1 rounded font-semibold text-sm hover:bg-opacity-90"
                                                >
                                                    Review Work
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
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

export default ClientDashboardPage;
