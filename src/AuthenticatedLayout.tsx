// web-app/src/AuthenticatedLayout.tsx

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserData } from './App'; // Import UserData interface

interface AuthenticatedLayoutProps {
  userData: UserData | null;
  handleLogout: () => void;
  children: React.ReactNode;
}

const AuthenticatedLayout: React.FC<AuthenticatedLayoutProps> = ({ userData, handleLogout, children }) => {
  const navigate = useNavigate();

  // Determine which dashboard link to show in the header, if any
  const getDashboardLink = () => {
    if (!userData) return null;

    if (userData.isAdmin) {
      return { text: 'Admin Dashboard', path: '/admin-dashboard' };
    } else if (userData.roles.includes('helper')) {
      return { text: 'Helper Dashboard', path: '/helper-dashboard' };
    } else if (userData.roles.includes('client')) {
      return { text: 'Client Dashboard', path: '/client-dashboard' };
    }
    return null;
  };

  const dashboardLink = getDashboardLink();

  return (
    <div className="flex flex-col min-h-screen bg-discord_darkest text-discord_white">
      {/* Header */}
      <header className="bg-discord_darker p-4 shadow-md flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-discord_blurple">Assignment Hub</h1>
          {dashboardLink && (
            <button
              onClick={() => navigate(dashboardLink.path)}
              className="bg-discord_blurple text-discord_white px-4 py-2 rounded-md font-semibold hover:bg-opacity-90 transition duration-300"
            >
              {dashboardLink.text}
            </button>
          )}
        </div>
        <div className="flex items-center space-x-4">
          {userData && (
            <span className="text-lg font-semibold">
              Welcome, {userData.username} ({userData.roles.join(', ')})
            </span>
          )}
          <button
            onClick={handleLogout}
            className="bg-discord_red text-discord_white px-6 py-2 rounded-md font-bold hover:bg-opacity-90 transition duration-300"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow p-4">
        {children} {/* This is where the dashboard components (Admin, Client, Helper) will be rendered */}
      </main>

      {/* Footer (Optional) */}
      <footer className="bg-discord_darker p-4 text-center text-discord_gray text-sm shadow-inner">
        &copy; {new Date().getFullYear()} Assignment Hub. All rights reserved.
      </footer>
    </div>
  );
};

export default AuthenticatedLayout;
