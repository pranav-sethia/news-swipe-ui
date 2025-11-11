import React from 'react';
// --- NEW: Import Outlet and useNavigate ---
import { Navigate, Outlet, useNavigate } from 'react-router-dom';

const AuthRoute = () => {
  const token = localStorage.getItem('token');
  // --- NEW: Get the navigate function ---
  const navigate = useNavigate();

  // --- NEW: Create a logout function ---
  const handleLogout = () => {
    localStorage.removeItem('token'); // Clear the token
    navigate('/login'); // Send user back to the login page
  };

  if (!token) {
    // If no token, redirect to login
    return <Navigate to="/login" replace />;
  }

  // If token exists, show the child component (App.jsx)
  // and pass the handleLogout function to it via context.
  return <Outlet context={{ logout: handleLogout }} />;
};

export default AuthRoute;