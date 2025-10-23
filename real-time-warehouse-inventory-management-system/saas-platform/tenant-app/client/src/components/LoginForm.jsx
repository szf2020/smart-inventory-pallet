import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const LoginForm = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!username || !password) {
      setError("Please fill in all fields");
      return;
    }

    try {
      setIsLoading(true);
      setError("");

      const user = await login(username, password);

      // Function to check if user has permission for a specific tab
      const hasTabPermission = (tabKey) => {
        if (!user) return false;

        // Check if user has a role with tab permissions
        if (user.userRole && user.userRole.tab_permissions) {
          return user.userRole.tab_permissions[tabKey] === true;
        }

        // Legacy admin role fallback
        if (user.role === "admin" && !user.userRole) return true;

        return false;
      };

      // Navigate based on user's permissions
      if (hasTabPermission("dashboard")) {
        navigate("/dashboard");
      } else if (hasTabPermission("loading")) {
        navigate("/loading-management");
      } else if (hasTabPermission("stock")) {
        navigate("/inventory-management");
      } else if (hasTabPermission("credits")) {
        navigate("/finance");
      } else if (hasTabPermission("discounts")) {
        navigate("/discounts");
      } else if (hasTabPermission("expenses")) {
        navigate("/expenses");
      } else if (hasTabPermission("reports")) {
        navigate("/reports");
      } else if (hasTabPermission("manage")) {
        navigate("/manage");
      } else if (hasTabPermission("users_roles")) {
        navigate("/user-management");
      } else {
        // If user has no permissions for main pages, go to profile
        navigate("/profile");
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "Invalid credentials. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>
      )}

      <div className="mb-2">
        <input
          type="username"
          placeholder="Username"
          className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>

      <div className="mb-6">
        <input
          type="password"
          placeholder="Password"
          className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <button
        type="submit"
        className="w-full bg-blue-400 hover:bg-blue-500 text-white py-2 rounded transition duration-200 mt-2"
        disabled={isLoading}
      >
        {isLoading ? "Logging in..." : "Login"}
      </button>
    </form>
  );
};

export default LoginForm;
