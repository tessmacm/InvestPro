import React, { ReactNode } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "./store";
import { Role } from "./types";
import { Layout } from "./components/Layout";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ResetPassword } from "./pages/ResetPassword";
import { Dashboard } from "./pages/Dashboard";
import { AdminPanel } from "./pages/AdminPanel";
import { Investors } from "./pages/Investors";
import { Projects } from "./pages/Projects";
import { Documents } from "./pages/Documents";
import { Payments } from "./pages/Payments";
import { Notifications } from "./pages/Notifications";
import { Reports } from "./pages/Reports";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: Role[];
}

import { useDispatch } from "react-redux";
import { logout } from "./store/authSlice";
import { API_BASE_URL, authHeaders } from "./config/api";

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const dispatch = useDispatch();
  const { isAuthenticated, user, token } = useSelector((state: RootState) => state.auth);
  const location = useLocation();

  React.useEffect(() => {
    if (token && isAuthenticated) {
      fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: authHeaders()
      })
        .then((res) => {
          if (!res.ok && (res.status === 401 || res.status === 403 || res.status === 404)) {
            // User does not exist in database or token has expired
            dispatch(logout());
          }
        })
        .catch(() => {
          // If backend cannot be reached, do not abruptly logout
        });
    }
  }, [token, isAuthenticated, dispatch, location.pathname]);

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route 
          path="investors" 
          element={
            <ProtectedRoute allowedRoles={["admin", "manager"]}>
              <Investors />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="investors/:id" 
          element={
            <ProtectedRoute allowedRoles={["admin", "manager"]}>
              <Investors />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="projects" 
          element={
            <ProtectedRoute allowedRoles={["admin", "manager"]}>
              <Projects />
            </ProtectedRoute>
          } 
        />
        <Route path="documents" element={<Documents />} />
        <Route path="payments" element={<Payments />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="reports" element={<Reports />} />
        <Route 
          path="admin" 
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminPanel />
            </ProtectedRoute>
          } 
        />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
