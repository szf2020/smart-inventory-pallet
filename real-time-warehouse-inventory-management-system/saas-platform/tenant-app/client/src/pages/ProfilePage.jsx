import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import {
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarIcon,
  IdentificationIcon,
  ShieldCheckIcon,
  PencilIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";
import { fetchUserProfile } from "../services/api";

const ProfilePage = () => {
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        const response = await fetchUserProfile();
        setProfileData(response.data);
      } catch (err) {
        setError("Failed to load profile data");
        console.error("Profile load error:", err);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser?.user_id) {
      loadProfile();
    } else {
      setLoading(false);
    }
  }, [currentUser]);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <div className="text-red-500 mb-4">
            <svg
              className="h-12 w-12 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Error Loading Profile
          </h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate("/")}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const user = profileData || currentUser;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
              </button>
              <h1 className="text-xl font-semibold text-gray-900">
                My Profile
              </h1>
            </div>
            <button
              onClick={() => navigate("/profile-settings")}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-[#0fb493] to-[#036c57] text-white rounded-lg hover:bg-[#036c57] transition-colors"
            >
              <PencilIcon className="h-4 w-4 mr-2" />
              Edit Profile
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
          {/* Profile Header */}
          <div className="bg-gradient-to-r from-[#0fb493] to-[#036c57] px-8 py-12">
            <div className="flex items-center space-x-6">
              <div className="h-24 w-24 rounded-full bg-white/20 flex items-center justify-center border-4 border-white/30">
                <span className="text-2xl font-bold text-white">
                  {getInitials(user?.username)}
                </span>
              </div>
              <div className="text-white">
                <h2 className="text-3xl font-bold">
                  {user?.username || "User"}
                </h2>
                <p className="text-blue-100 text-lg">{user?.email}</p>
                {user?.role && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white/20 text-white mt-2">
                    <ShieldCheckIcon className="h-4 w-4 mr-1" />
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Profile Details */}
          <div className="px-8 py-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Personal Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                  <UserIcon className="h-5 w-5 mr-2 text-blue-600" />
                  Personal Information
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                    <IdentificationIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500">User ID</p>
                      <p className="font-medium text-gray-900">
                        {user?.user_id || "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                    <UserIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500">Full Name</p>
                      <p className="font-medium text-gray-900">
                        {user?.username || "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                    <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500">Email Address</p>
                      <p className="font-medium text-gray-900">
                        {user?.username || "N/A"}
                      </p>
                    </div>
                  </div>

                  {user?.phone && (
                    <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                      <PhoneIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm text-gray-500">Phone Number</p>
                        <p className="font-medium text-gray-900">
                          {user.phone}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Account Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                  <ShieldCheckIcon className="h-5 w-5 mr-2 text-blue-600" />
                  Account Information
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                    <ShieldCheckIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500">Role</p>
                      <p className="font-medium text-gray-900">
                        {user?.role
                          ? user.role.charAt(0).toUpperCase() +
                            user.role.slice(1)
                          : "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                    <div className="h-5 w-5 mr-3 flex items-center justify-center">
                      <div
                        className={`h-3 w-3 rounded-full ${
                          user?.status === "active"
                            ? "bg-green-500"
                            : "bg-red-500"
                        }`}
                      ></div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      <p className="font-medium text-gray-900">
                        {user?.status
                          ? user.status.charAt(0).toUpperCase() +
                            user.status.slice(1)
                          : "Active"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                    <CalendarIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500">Member Since</p>
                      <p className="font-medium text-gray-900">
                        {formatDate(user?.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                    <CalendarIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500">Last Updated</p>
                      <p className="font-medium text-gray-900">
                        {formatDate(user?.updatedAt)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Role Permissions (if available) */}
            {user?.userRole?.tab_permissions && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  Permissions
                </h3>
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {Object.entries(user.userRole.tab_permissions).map(
                      ([permission, allowed]) => (
                        <div key={permission} className="flex items-center">
                          <div
                            className={`h-3 w-3 rounded-full mr-2 ${
                              allowed ? "bg-green-500" : "bg-red-500"
                            }`}
                          ></div>
                          <span className="text-sm capitalize text-gray-700">
                            {permission.replace("_", " ")}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
