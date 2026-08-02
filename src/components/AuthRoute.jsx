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
    if (token) localStorage.removeItem('token');
    return <Navigate to="/login" replace />;
  }

  return <Outlet context={{ logout: handleLogout }} />;
};

export default AuthRoute;
