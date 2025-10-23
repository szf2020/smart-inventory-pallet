import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import logo from "../assets/logo_icon.png";
import NotificationDropdown from "./Notification/NotificationDropdown";
import { useNotifications } from "./Notification/NotificationContext";
import {
  BellIcon,
  PencilIcon,
  UserIcon,
  TruckIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ArchiveBoxIcon,
  TagIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

const Header = ({ currentUser, onLogout }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const menuRef = useRef(null);
  const notificationRef = useRef(null);
  const userMenuRef = useRef(null);
  const { notifications } = useNotifications();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Count unread notifications
  const unreadCount = notifications
    ? notifications.filter((n) => !n.read).length
    : 0;

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setIsNotificationOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuRef, notificationRef, userMenuRef]);

  const navItems = [
    {
      title: "Loading Transaction",
      icon: <ArrowUpTrayIcon className="h-5 w-5" />,
      path: "/loading-management?tab=loading",
      color: "bg-blue-100 text-blue-600",
      hoverColor: "bg-blue-200",
    },
    {
      title: "Unloading Transaction",
      icon: <ArrowDownTrayIcon className="h-5 w-5" />,
      path: "/loading-management?tab=unloading",
      color: "bg-purple-100 text-purple-600",
      hoverColor: "bg-purple-200",
    },
    {
      title: "Add New Stock",
      icon: <ArchiveBoxIcon className="h-5 w-5" />,
      path: "/inventory-management?tab=add-new-stock",
      color: "bg-green-100 text-green-600",
      hoverColor: "bg-green-200",
    },
    {
      title: "Manage Lorry",
      icon: <TruckIcon className="h-5 w-5" />,
      path: "/manage?tab=lorry",
      color: "bg-amber-100 text-amber-600",
      hoverColor: "bg-amber-200",
    },
    {
      title: "Manage Product",
      icon: <TagIcon className="h-5 w-5" />,
      path: "/manage?tab=product",
      color: "bg-pink-100 text-pink-600",
      hoverColor: "bg-pink-200",
    },
  ];

  return (
    <header className="bg-white py-3 px-6 shadow-md sticky top-0 z-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 hover:opacity-90 transition-opacity duration-200">
          <Link to="/" className="flex items-center gap-3">
            <div className="relative">
              <img
                src={logo}
                alt="ZENDEN Logo"
                className="h-12 w-12 object-contain"
              />
              <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
            <div>
              <h1 className="text-2xl font-extrabold bg-gradient-to-r from-[#0d8ed6] to-[#0fb493] text-transparent bg-clip-text">
                ZENDEN
              </h1>
              <p className="text-xs bg-gradient-to-r from-[#0d8ed6] to-[#0fb493] text-transparent bg-clip-text tracking-widest">
                DIGITAL SOLUTIONS
              </p>
            </div>
          </Link>
        </div>

        <div className="relative flex-1 max-w-md mx-auto">
          <div
            className={`relative flex items-center transition-all duration-300 ${
              searchFocused ? "ring-2 ring-blue-400" : "ring-1 ring-gray-200"
            } rounded-full bg-gray-50 px-2`}
          >
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-500 ml-2" />
            <input
              type="text"
              className="block w-full pl-2 pr-4 py-2.5 bg-transparent focus:outline-none text-sm"
              placeholder="Search for anything"
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
          </div>
        </div>

        <div className="flex items-center space-x-5 ml-4">
          <div className="relative" ref={menuRef}>
            <button
              className="flex items-center px-4 py-2 bg-gradient-to-r from-[#0fb493] to-[#036c57] text-white rounded-full text-sm font-medium shadow hover:shadow-md transition-all duration-200 hover:translate-y-[1px]"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <PlusIcon className="h-5 w-5 mr-1" />
              <span>Create</span>
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-3 w-80 bg-white rounded-xl shadow-2xl z-10 overflow-hidden border border-gray-100 transform transition-all duration-200">
                <div className="px-5 py-4 flex justify-between items-center bg-gradient-to-r from-[#0fb493] to-[#036c57]">
                  <h3 className="text-base font-bold text-white">
                    Quick Navigation
                  </h3>
                  <button
                    onClick={() => setIsMenuOpen(false)}
                    className="text-white hover:bg-white/20 p-1 rounded-full transition-colors"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                <div className="p-3 grid grid-cols-1 gap-2">
                  {navItems.map((item, index) => (
                    <Link
                      key={index}
                      to={item.path}
                      className="group flex items-center p-3 rounded-lg hover:bg-gray-50 transition-all duration-150"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <span
                        className={`mr-4 rounded-full p-2.5 ${item.color} transition-all duration-200 group-hover:scale-110`}
                      >
                        {item.icon}
                      </span>
                      <div>
                        <span className="text-gray-800 font-medium block">
                          {item.title}
                        </span>
                        <span className="text-xs text-gray-500">
                          Manage your {item.title.toLowerCase()}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* <div ref={notificationRef} className="relative">
            <button
              className="relative p-1 rounded-full transition-all duration-200 focus:outline-none group"
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              aria-label={`Notifications${
                unreadCount > 0 ? ` (${unreadCount} unread)` : ""
              }`}
            >
              <div
                className={`w-10 h-10 flex items-center justify-center rounded-full ${
                  isNotificationOpen
                    ? "bg-blue-100"
                    : "bg-gray-100 group-hover:bg-blue-50"
                }`}
              >
                <BellIcon
                  className={`h-5 w-5 ${
                    isNotificationOpen
                      ? "text-blue-600"
                      : "text-gray-600 group-hover:text-blue-500"
                  }`}
                />
              </div>

              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white ring-2 ring-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {isNotificationOpen && (
              <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl z-10 overflow-hidden border border-gray-100 animate-fade-in-down">
                <NotificationDropdown
                  onClose={() => setIsNotificationOpen(false)}
                />
              </div>
            )}
          </div>

          <button className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-blue-50 transition-colors duration-150">
            <PencilIcon className="h-5 w-5 text-gray-600 hover:text-blue-500" />
          </button> */}

          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 text-white flex items-center justify-center ring-2 ring-blue-100 hover:ring-blue-200 transition-all duration-200 hover:scale-105"
            >
              {currentUser?.username ? (
                <span className="text-sm font-semibold">
                  {currentUser.username.charAt(0).toUpperCase()}
                </span>
              ) : (
                <UserIcon className="h-5 w-5" />
              )}
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl z-50 overflow-hidden border border-gray-100 transform transition-all duration-200">
                {/* User Profile Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700">
                  <div className="flex items-center space-x-3">
                    <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                      {currentUser?.username ? (
                        <span className="text-lg font-bold text-white">
                          {currentUser.username.charAt(0).toUpperCase()}
                        </span>
                      ) : (
                        <UserIcon className="h-6 w-6 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {currentUser?.username || "User"}
                      </p>
                      <p className="text-xs text-blue-100 truncate">
                        {currentUser?.email || "user@example.com"}
                      </p>
                      {currentUser?.role && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white mt-1">
                          {currentUser.role.charAt(0).toUpperCase() +
                            currentUser.role.slice(1)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* User Details */}
                <div className="px-6 py-4 border-b border-gray-100">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-500">
                        User ID
                      </span>
                      <span className="text-sm text-gray-900">
                        {currentUser?.user_id || "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-500">
                        Status
                      </span>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Active
                      </span>
                    </div>
                    {currentUser?.phone && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-500">
                          Phone
                        </span>
                        <span className="text-sm text-gray-900">
                          {currentUser.phone}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Menu Actions */}
                <div className="px-2 py-2">
                  <Link
                    to="/profile"
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors duration-150 flex items-center space-x-3"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    <span>View Profile</span>
                  </Link>

                  <Link
                    to="/profile-settings"
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors duration-150 flex items-center space-x-3"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <span>Settings</span>
                  </Link>

                  <div className="border-t border-gray-100 mt-2 pt-2">
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-150 flex items-center space-x-3"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                      </svg>
                      <span>Sign Out</span>
                    </button>
                  </div>
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
