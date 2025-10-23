import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  BellIcon,
  UserIcon,
  MagnifyingGlassIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";

const Header = () => {
  const { user, logout } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const userMenuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    setIsUserMenuOpen(false);
    logout();
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-40">
      <div className="flex items-center justify-between">
        {/* Logo and Title */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-r from-teal-500 to-teal-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-teal-600 to-blue-600 text-transparent bg-clip-text">
                Admin Portal
              </h1>
              <p className="text-xs text-gray-500">SaaS Management</p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-lg mx-8">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              placeholder="Search tenants, admins, billing..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Right Side - Notifications and User Menu */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <button className="relative p-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500 rounded-lg">
            <BellIcon className="h-6 w-6" />
            <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white"></span>
          </button>

          {/* User Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center space-x-3 p-2 text-gray-700 hover:bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <div className="h-8 w-8 rounded-full bg-gradient-to-r from-teal-500 to-blue-600 flex items-center justify-center">
                {user?.fullName ? (
                  <span className="text-white text-sm font-medium">
                    {user.fullName.charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <UserIcon className="h-4 w-4 text-white" />
                )}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-gray-900">
                  {user?.fullName || user?.username || "Admin"}
                </p>
                <p className="text-xs text-gray-500">
                  {user?.role || "Administrator"}
                </p>
              </div>
            </button>

            {/* User Dropdown Menu */}
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 focus:outline-none z-50">
                {/* User Info */}
                <div className="px-4 py-3">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.fullName || user?.username}
                  </p>
                  <p className="text-sm text-gray-500">{user?.email}</p>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-teal-100 text-teal-800 mt-1">
                    {user?.role || "Admin"}
                  </span>
                </div>

                {/* Menu Items */}
                <div className="py-1">
                  <button
                    onClick={() => setIsUserMenuOpen(false)}
                    className="group flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left"
                  >
                    <UserIcon className="mr-3 h-4 w-4 text-gray-400 group-hover:text-gray-500" />
                    Profile Settings
                  </button>
                  <button
                    onClick={() => setIsUserMenuOpen(false)}
                    className="group flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left"
                  >
                    <Cog6ToothIcon className="mr-3 h-4 w-4 text-gray-400 group-hover:text-gray-500" />
                    Preferences
                  </button>
                </div>

                {/* Logout */}
                <div className="py-1">
                  <button
                    onClick={handleLogout}
                    className="group flex items-center px-4 py-2 text-sm text-red-700 hover:bg-red-50 w-full text-left"
                  >
                    <ArrowRightOnRectangleIcon className="mr-3 h-4 w-4 text-red-400 group-hover:text-red-500" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
