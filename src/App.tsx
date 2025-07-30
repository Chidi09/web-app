// web-app/src/App.tsx

import React, { useState, useEffect, FormEvent } from 'react'; // Import FormEvent
import axios from 'axios';
import { useNavigate, Routes, Route, BrowserRouter } from 'react-router-dom';
import AcceptAssignmentPage from './AcceptAssignmentPage';
import ReviewAssignmentPage from './ReviewAssignmentPage'; // Corrected path
import HelperRegistrationPage from './HelperRegistrationPage';
import AdminDashboardPage from './AdminDashboardPage';
import HelperDashboardPage from './HelperDashboardPage';
import PayHelperPage from './PayHelperPage';
import AuthenticatedLayout from './AuthenticatedLayout'; // NEW: Import AuthenticatedLayout


// IMPORTANT: Replace with your actual backend URL
const BACKEND_URL = 'http://localhost:3000';

// Define the interface for the user data structure
export interface UserData {
  _id: string; // Changed from 'id' to '_id' for consistency with MongoDB
  discordId?: string; // Made optional for local users
  username: string;
  avatarUrl?: string | null; // Made optional for local users
  email?: string | null; // Made optional for local users
  roles: string[];
  isAdmin: boolean;
  authType: 'discord' | 'local'; // NEW: Authentication type
  walletAddress?: string; // Added walletAddress
  walletType?: string;   // Added walletType
  isActive: boolean; // NEW: Added isActive property for user status
  totalEarnings?: number; // NEW: Optional totalEarnings for users
  // Add new payment fields for helper registration
  region?: 'local' | 'foreign';
  accountNumber?: string;
  accountName?: string;
  paypalEmail?: string;
  cashAppTag?: string;
  cryptoWalletAddress?: string;
  cryptoNetwork?: string;
}

// Define the interface for the created assignment data structure (populated for display)
export interface AssignmentData { // Exported for use in other components
  _id: string; // MongoDB ID
  ownerId: UserData; // When populated by backend, this will be a UserData object
  helperId: UserData | null; // When populated, this will be a UserData object or null
  title: string;
  description: string;
  complexity: 'low' | 'medium' | 'high';
  category: string;
  deadline: string; // ISO string
  paymentAmount: number; // Student's total payment
  adminDeterminedHelperPayout?: number; // NEW: Admin-determined payout for helper (optional, as it's set later)
  attachments: { url: string; filename: string }[];
  completedWorkAttachments?: { url: string; filename: string }[]; // NEW: For helper's submitted work
  status: 'pending' | 'accepted' | 'due' | 'completed' | 'pending_client_review' | 'ready_for_payout' | 'paid' | 'cancelled'; // Corrected to match backend
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  completedAt: string | null;
  paidAt: string | null;
}

// Define a separate interface for assignment data *before* population (as sent by CreateAssignmentForm)
// This should match the `AssignmentInputData` in CreateAssignmentForm.tsx
export interface UnpopulatedAssignmentData { // Exported for use in other components
  _id: string;
  ownerId: string; // This is the ID of the owner, as sent by the form
  helperId: string | null; // helperId is a string or null before population
  title: string;
  description: string;
  complexity: 'low' | 'medium' | 'high';
  category: string;
  deadline: string;
  paymentAmount: number;
  attachments: { url: string; filename: string }[];
  status: 'pending' | 'accepted' | 'due' | 'completed' | 'pending_client_review' | 'ready_for_payout' | 'paid' | 'cancelled'; // Ensure this matches backend
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  paidAt: string | null;
}

// Define the interface for the API response containing assignments
interface AssignmentsApiResponse {
  message: string;
  assignments: AssignmentData[]; // This array will contain *populated* data
}

// Define the interface for the successful response from /auth/discord/exchange-code or /auth/local/login
interface AuthResponse {
  message: string;
  token: string; // JWT token
  user: UserData; // The user object returned by the backend
}

// Axios interceptor for JWT
axios.interceptors.request.use(
  (config) => {
    config.headers = config.headers || {}; // Initialize headers if undefined
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Removed x-user-id header as JWT is the primary authentication method
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);


// Main App component wrapped in BrowserRouter
function AppWrapper() {
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}

function App() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Function to handle local login
  const handleLocalLogin = async (usernameInput: string, passwordInput: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post<AuthResponse>(`${BACKEND_URL}/auth/local/login`, {
        username: usernameInput,
        password: passwordInput
      });

      if (response.status === 200 && response.data.user) {
        const parsedUserData: UserData = response.data.user;
        setUserData(parsedUserData);
        setIsLoggedIn(true);
        localStorage.setItem('token', response.data.token); // Store JWT
        localStorage.setItem('userData', JSON.stringify(parsedUserData));
        console.log('Logged in user locally:', parsedUserData.username);
        // Redirect to main dashboard based on roles
        if (parsedUserData.isAdmin) {
          navigate('/admin-dashboard');
        } else if (parsedUserData.roles.includes('helper')) {
          navigate('/helper-dashboard');
        } else { // If client, or no specific dashboard, redirect to login as client frontend is removed
          navigate('/login'); 
        }
      } else {
        setError(response.data.message || 'Local login failed.');
      }
    } catch (err: any) {
      console.error('Error during local login:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'An error occurred during local login.');
    } finally {
      setLoading(false);
    }
  };


  // Authentication effect
  useEffect(() => {
    const authenticate = async () => {
      // Check for the logout flag first from localStorage
      const loggingOutFlag = localStorage.getItem('isLoggingOutFlag');
      if (loggingOutFlag === 'true') {
          // If the flag is true, it means we just logged out.
          // Clear the flag and prevent re-authentication.
          localStorage.removeItem('isLoggingOutFlag'); // Clear the flag immediately
          setLoading(false);
          console.log('Logout flag detected. Bypassing re-authentication.');
          return; // Do not proceed with authentication
      }

      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const storedUserData = localStorage.getItem('userData');
      let currentUser: UserData | null = null;

      if (token && storedUserData) {
        try {
          currentUser = JSON.parse(storedUserData);
          if (currentUser && currentUser._id) {
            setUserData(currentUser);
            setIsLoggedIn(true);
            console.log('User authenticated via stored JWT and data:', currentUser.username);
            // No navigation here. Let the individual route components handle redirects.
            setLoading(false);
            return;
          }
        } catch (e) {
          console.error("Error parsing stored user data or token invalid", e);
          localStorage.removeItem('token');
          localStorage.removeItem('userData');
        }
      }

      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');

      if (code) {
        window.history.replaceState({}, document.title, window.location.pathname); // Clear code immediately
        try {
          const response = await axios.post<AuthResponse>(`${BACKEND_URL}/auth/discord/exchange-code`, { code });

          if (response.status === 200 && response.data.user) {
            const parsedUserData: UserData = response.data.user;
            setUserData(parsedUserData);
            setIsLoggedIn(true);
            localStorage.setItem('token', response.data.token); // Store JWT
            localStorage.setItem('userData', JSON.stringify(parsedUserData));
            console.log('Logged in user via Discord OAuth:', parsedUserData.username);
            // Redirect to main dashboard based on roles
            if (parsedUserData.isAdmin) {
              navigate('/admin-dashboard');
            } else if (parsedUserData.roles.includes('helper')) {
              navigate('/helper-dashboard');
            } else { // If client, or no specific dashboard, redirect to login as client frontend is removed
              navigate('/login'); 
            }
          } else {
            setError(response.data.message || 'Failed to exchange code for user data.');
          }
        } catch (err: any) {
          console.error('Error during Discord code exchange:', err.response?.data || err.message);
          setError(err.response?.data?.message || 'An error occurred during Discord authentication.');
        } finally {
            setLoading(false);
        }
      } else {
          setLoading(false);
      }
    };

    authenticate();
  }, [navigate]); // No external state in dependency array for this effect

  const handleDiscordLogin = () => {
    setError(null);
    window.location.href = `${BACKEND_URL}/auth/discord`;
  };

  const handleLogout = () => {
    // Set a flag in localStorage to indicate an explicit logout is happening
    localStorage.setItem('isLoggingOutFlag', 'true');

    // Clear all authentication-related data
    setUserData(null);
    setIsLoggedIn(false);
    setError(null);
    localStorage.removeItem('userData');
    localStorage.removeItem('token');
    
    console.log('User logged out. Redirecting to login page...');
    // Perform a full page reload to ensure a clean state and clear any Discord OAuth codes
    window.location.replace('/login');
  };

  // Component to render a loading message
  const LoadingPage: React.FC = () => (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-discord_dark to-discord_darkest">
      <p className="text-discord_white text-lg">Loading...</p>
    </div>
  );

  // A simple Login Page component
  const LoginPage: React.FC = () => {
    const [usernameInput, setUsernameInput] = useState('');
    const [passwordInput, setPasswordInput] = useState('');

    const handleLoginSubmit = (e: FormEvent) => {
      e.preventDefault();
      handleLocalLogin(usernameInput, passwordInput);
    };

    // NEW: Redirect if already logged in (only for helper/admin)
    useEffect(() => {
      const storedUserData = localStorage.getItem('userData');
      if (storedUserData) {
        try {
          const user: UserData = JSON.parse(storedUserData);
          if (user.isAdmin) {
            navigate('/admin-dashboard');
          } else if (user.roles.includes('helper')) {
            navigate('/helper-dashboard');
          }
          // No redirect for client role, as their frontend is removed
        } catch (e) {
          console.error("Error parsing stored user data in LoginPage useEffect:", e);
        }
      }
    }, [navigate]); // Depend on navigate to avoid stale closures

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-discord_dark to-discord_darkest p-4">
        <div className="flex flex-col items-center bg-gradient-to-br from-discord_darker to-discord_darkest p-8 rounded-2xl shadow-2xl border border-discord_darker max-w-md w-full animate-fade-in">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-discord_blurple mb-6 text-center drop-shadow-lg">
            Assignment Hub
          </h1>
          <p className="text-lg mb-8 text-center text-discord_white">Choose your login method:</p>
          {error && <p className="text-discord_red text-center mb-4">{error}</p>}
          <button
            onClick={handleDiscordLogin}
            className="bg-gradient-to-r from-discord_blurple to-indigo-600 text-discord_white px-6 py-3 rounded-full font-extrabold shadow-lg hover:from-indigo-600 hover:to-discord_blurple transition-all duration-300 w-full text-lg transform hover:-translate-y-0.5 active:scale-95 mb-4"
          >
            Login with Discord (Admins Only)
          </button>
          <button
            onClick={() => navigate('/local-login')}
            className="bg-gradient-to-r from-gray-700 to-gray-800 text-discord_white px-6 py-3 rounded-full font-extrabold shadow-lg hover:from-gray-800 hover:to-gray-700 transition-all duration-300 w-full text-lg transform hover:-translate-y-0.5 active:scale-95 mb-4"
          >
            Login as Helper (Username/Password)
          </button>
          <p className="text-center text-discord_gray text-sm mt-4">
            New helper?{' '}
            <button
              onClick={() => navigate('/register-helper')}
              className="text-discord_green hover:underline font-bold"
            >
              Register here
            </button>
          </p>
        </div>
      </div>
    );
  };

  // A simple Local Login Page component
  const LocalLoginPage: React.FC = () => {
    const [usernameInput, setUsernameInput] = useState('');
    const [passwordInput, setPasswordInput] = useState('');

    const handleLoginSubmit = (e: FormEvent) => {
      e.preventDefault();
      handleLocalLogin(usernameInput, passwordInput);
    };

    // NEW: Redirect if already logged in (only for helper/admin)
    useEffect(() => {
      const storedUserData = localStorage.getItem('userData');
      if (storedUserData) {
        try {
          const user: UserData = JSON.parse(storedUserData);
          if (user.isAdmin) {
            navigate('/admin-dashboard');
          } else if (user.roles.includes('helper')) {
            navigate('/helper-dashboard');
          }
          // No redirect for client role, as their frontend is removed
        } catch (e) {
          console.error("Error parsing stored user data in LocalLoginPage useEffect:", e);
        }
      }
    }, [navigate]);

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-discord_dark to-discord_darkest text-discord_white p-4 sm:p-6 lg:p-8">
        <div className="bg-gradient-to-br from-discord_darker to-discord_darkest p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-md mx-auto border border-discord_darker transform transition-all duration-300 hover:scale-[1.01]">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-discord_blurple mb-6 text-center tracking-wide">
            Helper Login
          </h2>

          {error && (
            <div className="bg-red-600 bg-opacity-20 border border-red-500 text-red-300 px-4 py-3 rounded-md text-center mb-4">
              <p className="font-bold">{error}</p>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-discord_gray text-sm font-semibold mb-2">
                Username:
              </label>
              <input
                type="text"
                id="username"
                className="shadow-inner appearance-none border border-discord_darker rounded-md w-full py-2 px-3 text-discord_white leading-tight focus:outline-none focus:ring-2 focus:ring-discord_blurple focus:border-transparent bg-discord_darker placeholder-gray-850 transition duration-200 ease-in-out"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                required
                placeholder="Your helper username"
                autoComplete="username" // Added autocomplete
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-discord_gray text-sm font-semibold mb-2">
                Password:
              </label>
              <input
                type="password"
                id="password"
                className="shadow-inner appearance-none border border-discord_darker rounded-md w-full py-2 px-3 text-discord_white leading-tight focus:outline-none focus:ring-2 focus:ring-discord_blurple focus:border-transparent bg-discord_darker placeholder-gray-850 transition duration-200 ease-in-out"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                required
                placeholder="Your password"
                autoComplete="current-password" // Added autocomplete
              />
            </div>
            <button
              type="submit"
              className="bg-gradient-to-r from-discord_blurple to-indigo-600 text-discord_white px-6 py-3 rounded-md font-extrabold shadow-lg hover:from-indigo-600 hover:to-discord_blurple transition-all duration-300 w-full text-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Logging In...' : 'Login'}
            </button>
          </form>
          <p className="text-center text-discord_gray text-sm mt-6">
            New helper?{' '}
            <button
              onClick={() => navigate('/register-helper')}
              className="text-discord_green hover:underline font-bold"
            >
              Register here
            </button>
          </p>
          <p className="text-center text-discord_gray text-sm mt-2">
            Are you an admin or client?{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-discord_blurple hover:underline font-bold"
            >
              Go back to main login
            </button>
          </p>
        </div>
      </div>
    );
  };


  return (
    <Routes>
      {/* Public routes that should redirect if user is already logged in */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/local-login" element={<LocalLoginPage />} />
      <Route path="/register-helper" element={<HelperRegistrationPage />} />

      {/* Protected routes wrapped in AuthenticatedLayout */}
      <Route path="/accept-assignment/:assignmentId" element={
        isLoggedIn && userData ? (
          <AuthenticatedLayout userData={userData} handleLogout={handleLogout}>
            <AcceptAssignmentPage />
          </AuthenticatedLayout>
        ) : (
          <LoginPage />
        )
      } />
      <Route path="/review-assignment/:assignmentId" element={
        isLoggedIn && userData ? (
          <AuthenticatedLayout userData={userData} handleLogout={handleLogout}>
            <ReviewAssignmentPage />
          </AuthenticatedLayout>
        ) : (
          <LoginPage />
        )
      } />
      <Route path="/admin/pay-helper/:assignmentId" element={
        isLoggedIn && userData ? (
          <AuthenticatedLayout userData={userData} handleLogout={handleLogout}>
            <PayHelperPage />
          </AuthenticatedLayout>
        ) : (
          <LoginPage />
        )
      } />

      {/* Admin Dashboard Route */}
      <Route path="/admin-dashboard" element={
        isLoggedIn && userData?.isAdmin ? (
          <AuthenticatedLayout userData={userData} handleLogout={handleLogout}>
            <AdminDashboardPage />
          </AuthenticatedLayout>
        ) : (
          <LoginPage />
        )
      } />
      {/* Client Dashboard Route - REMOVED */}
      {/* <Route path="/client-dashboard" element={
        isLoggedIn && userData?.roles.includes('client') ? (
          <AuthenticatedLayout userData={userData} handleLogout={handleLogout}>
            <ClientDashboardPage />
          </AuthenticatedLayout>
        ) : (
          <LoginPage />
        )
      } /> */}
      {/* Helper Dashboard Route */}
      <Route path="/helper-dashboard" element={
        isLoggedIn && userData?.roles.includes('helper') ? (
          <AuthenticatedLayout userData={userData} handleLogout={handleLogout}>
            <HelperDashboardPage />
          </AuthenticatedLayout>
        ) : (
          <LoginPage />
        )
      } />
      
      {/* Default route: If logged in, redirect to appropriate dashboard. Otherwise, go to login. */}
      <Route path="/" element={
        loading ? (
          <LoadingPage />
        ) : isLoggedIn && userData ? (
          userData.isAdmin ? (
            <AuthenticatedLayout userData={userData} handleLogout={handleLogout}>
              <AdminDashboardPage />
            </AuthenticatedLayout>
          ) : userData.roles.includes('helper') ? (
            <AuthenticatedLayout userData={userData} handleLogout={handleLogout}>
              <HelperDashboardPage />
            </AuthenticatedLayout>
          ) : ( // If client or no specific role, redirect to login
            <LoginPage />
          )
        ) : (
          <LoginPage />
        )
      } />

      {/* Fallback for any unmatched routes */}
      <Route path="*" element={<LoginPage />} />
    </Routes>
  );
}

export default AppWrapper;
