import React from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';

function isTokenExpired(token) {
  try {
    const { exp } = JSON.parse(atob(token.split('.')[1]));
    return !exp || exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

const AuthRoute = () => {
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  if (!token || isTokenExpired(token)) {
    const hadToken = !!token;
    // Only the token clears here - hs_onboarding_done is browser-level ("has
    // this category-picker step ever been completed/skipped here"), not
    // per-account state. Clearing it on every logout/expiry used to mean a
    // returning user hitting the back button to /onboarding after logging
    // back in would see it again as if brand new.
    if (token) {
      localStorage.removeItem('token');
    }
    return <Navigate to={hadToken ? '/login?expired=true' : '/login'} replace />;
  }

  return <Outlet context={{ logout: handleLogout }} />;
};

export default AuthRoute;
