import React, { useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const ProtectedRoute = ({ requiredTabKey = null }) => {
  const { isAuthenticated, loading, currentUser } = useContext(AuthContext);

  // Show loading indicator while checking authentication
  console.log("user", currentUser);
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // Function to check if user has permission for a specific tab (same logic as Sidebar)
  const hasTabPermission = (tabKey) => {
    // If no user is logged in, deny access
    if (!currentUser) return false;

    // If no specific tab permission is required, allow access
    if (!tabKey) return true;

    // Priority 1: Check if user has a role with tab permissions (use actual role data)
    if (currentUser.userRole && currentUser.userRole.tab_permissions) {
      return currentUser.userRole.tab_permissions[tabKey] === true;
    }

    // Priority 2: If user has the legacy admin role and no userRole data, grant access to everything
    if (currentUser.role === "admin" && !currentUser.userRole) return true;

    // Fallback: allow dashboard and help for all users
    return tabKey === "dashboard" || tabKey === "help";
  };

  // Check if user has required tab permission
  if (requiredTabKey && !hasTabPermission(requiredTabKey)) {
    // Redirect to unauthorized page
    return <Navigate to="/unauthorized" />;
  }

  // User is authenticated and has required permission
  return <Outlet />;
};

export default ProtectedRoute;
