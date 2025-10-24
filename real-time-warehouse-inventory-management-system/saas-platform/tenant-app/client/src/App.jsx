import React, { useContext, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { NotificationProvider } from "./components/Notification/NotificationContext";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Dashboard from "./pages/Dashboard";
import { AuthContext, AuthProvider } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import ProtectedRoute from "./components/ProtectedRoute";
import NotFound from "./pages/NotFound";
import InventoryManagementPage from "./pages/InventoryManagementPage";
import LoadingManagementPage from "./pages/LoadingManagementPage";
import InventoryReportsPage from "./pages/InventoryReportsPage";
import ManagementPage from "./pages/ManagementPage";
import DiscountManagementPage from "./pages/DiscountManagementPage";
import UnauthorizedPage from "./pages/UnauthorizedPage";
import LoadingComponent from "./components/LoadingComponent";
import CreditManagementPage from "./pages/CreditManagementPage";
import UserManagementPage from "./pages/UserManagementPage";
import RepManagementPage from "./pages/RepManagementPage";
import ExpenseManagementPage from "./pages/ExpenseManagementPage";
import ProfilePage from "./pages/ProfilePage";
import ProfileSettingsPage from "./pages/ProfileSettingsPage";
import BottleDashboardPage from "./pages/BottleDashboardPage";
import AboutPage from "./pages/AboutPage";

const AppLayout = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { currentUser, logout } = useContext(AuthContext);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  // Check if user should see sidebar (has any permissions or is legacy admin)
  const shouldShowSidebar =
    currentUser &&
    ((currentUser.userRole && currentUser.userRole.tab_permissions) ||
      (currentUser.role === "admin" && !currentUser.userRole));

  return (
    <div className="flex h-screen bg-blue-1 relative">
      <LoadingComponent />
      {shouldShowSidebar && (
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          toggleSidebar={toggleSidebar}
        />
      )}
      <div
        className={`flex-1 flex flex-col overflow-hidden transition-all duration-300`}
      >
        <div className="absolute inset-0 max-h-min">
          <Header
            isSidebarCollapsed={isSidebarCollapsed}
            onLogout={logout}
            currentUser={currentUser}
          />
        </div>
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 mt-[76px]">
          {children}
        </main>
      </div>
    </div>
  );
};

const App = () => {
  return (
    <NotificationProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected routes with layout */}
            <Route>
              <Route element={<ProtectedRoute requiredTabKey="dashboard" />}>
                <Route
                  path="/dashboard"
                  element={
                    <AppLayout>
                      <Dashboard />
                    </AppLayout>
                  }
                />
              </Route>
              <Route element={<ProtectedRoute requiredTabKey="stock" />}>
                <Route
                  path="/inventory-management"
                  element={
                    <AppLayout>
                      <InventoryManagementPage />
                    </AppLayout>
                  }
                />
              </Route>
              <Route element={<ProtectedRoute requiredTabKey="loading" />}>
                <Route
                  path="/loading-management"
                  element={
                    <AppLayout>
                      <LoadingManagementPage />
                    </AppLayout>
                  }
                />
              </Route>
              <Route element={<ProtectedRoute requiredTabKey="credits" />}>
                <Route
                  path="/finance"
                  element={
                    <AppLayout>
                      <CreditManagementPage />
                    </AppLayout>
                  }
                />
              </Route>
              <Route element={<ProtectedRoute requiredTabKey="discounts" />}>
                <Route
                  path="/discounts"
                  element={
                    <AppLayout>
                      <DiscountManagementPage />
                    </AppLayout>
                  }
                />
              </Route>
              <Route element={<ProtectedRoute requiredTabKey="expenses" />}>
                <Route
                  path="/expenses"
                  element={
                    <AppLayout>
                      <ExpenseManagementPage />
                    </AppLayout>
                  }
                />
              </Route>
              <Route element={<ProtectedRoute requiredTabKey="reports" />}>
                <Route
                  path="/reports"
                  element={
                    <AppLayout>
                      <InventoryReportsPage />
                    </AppLayout>
                  }
                />
              </Route>
              <Route element={<ProtectedRoute requiredTabKey="manage" />}>
                <Route
                  path="/manage"
                  element={
                    <AppLayout>
                      <ManagementPage />
                    </AppLayout>
                  }
                />
              </Route>
              <Route element={<ProtectedRoute requiredTabKey="users_roles" />}>
                <Route
                  path="/user-management"
                  element={
                    <AppLayout>
                      <UserManagementPage />
                    </AppLayout>
                  }
                />
              </Route>
              <Route element={<ProtectedRoute />}>
                <Route
                  path="/bottle-scale"
                  element={
                    <AppLayout>
                      <BottleDashboardPage />
                    </AppLayout>
                  }
                />
              </Route>
              <Route element={<ProtectedRoute requiredTabKey="expenses" />}>
                <Route
                  path="/expense-management"
                  element={
                    <AppLayout>
                      <ExpenseManagementPage />
                    </AppLayout>
                  }
                />
              </Route>
              <Route element={<ProtectedRoute />}>
                <Route
                  path="/profile"
                  element={
                    <AppLayout>
                      <ProfilePage />
                    </AppLayout>
                  }
                />
              </Route>
              <Route element={<ProtectedRoute />}>
                <Route
                  path="/profile-settings"
                  element={
                    <AppLayout>
                      <ProfileSettingsPage />
                    </AppLayout>
                  }
                />
              </Route>
              <Route
                path="/unauthorized"
                element={
                  <AppLayout>
                    <UnauthorizedPage />
                  </AppLayout>
                }
              />
              {/* Add more protected routes here */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Route>

            {/* Public About page */}
            <Route path="/about" element={<AboutPage />} />

            {/* Not found route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </NotificationProvider>
  );
};

export default App;
