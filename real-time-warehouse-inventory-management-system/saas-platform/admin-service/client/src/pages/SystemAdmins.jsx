import React, { useState, useEffect } from "react";
import { adminsAPI } from "../services/api";
import toast from "react-hot-toast";
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  UserIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

const SystemAdmins = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchAdmins();
  }, [currentPage, searchQuery]);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 10,
        ...(searchQuery && { search: searchQuery }),
      };
      const response = await adminsAPI.getAll(params);
      setAdmins(response.admins);
      setTotalPages(response.pagination.totalPages);
    } catch (error) {
      toast.error("Failed to fetch admins");
      console.error("Error fetching admins:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async (adminData) => {
    try {
      await adminsAPI.create(adminData);
      toast.success("Admin created successfully");
      setShowCreateModal(false);
      fetchAdmins();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create admin");
    }
  };

  const handleDeleteAdmin = async (adminId) => {
    if (window.confirm("Are you sure you want to delete this admin?")) {
      try {
        await adminsAPI.delete(adminId);
        toast.success("Admin deleted successfully");
        fetchAdmins();
      } catch (error) {
        toast.error("Failed to delete admin");
      }
    }
  };

  const getRoleBadge = (role) => {
    const roleClasses = {
      super_admin: "status-badge bg-purple-100 text-purple-800",
      admin: "status-badge bg-blue-100 text-blue-800",
      moderator: "status-badge bg-green-100 text-green-800",
    };
    return roleClasses[role] || "status-badge bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Admins</h1>
          <p className="text-gray-600">Manage administrative users</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <PlusIcon className="h-4 w-4" />
          <span>Add Admin</span>
        </button>
      </div>

      {/* Search */}
      <div className="card">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search admins..."
              className="form-input pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select className="form-input w-auto">
            <option value="">All Roles</option>
            <option value="super_admin">Super Admin</option>
            <option value="admin">Admin</option>
            <option value="moderator">Moderator</option>
          </select>
        </div>
      </div>

      {/* Admins Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Admin</th>
                <th className="table-header">Username</th>
                <th className="table-header">Role</th>
                <th className="table-header">Status</th>
                <th className="table-header">Last Login</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {admins.map((admin) => (
                <tr key={admin.id} className="hover:bg-gray-50">
                  <td className="table-cell">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center mr-3">
                        {admin.role === "super_admin" ? (
                          <ShieldCheckIcon className="h-5 w-5 text-white" />
                        ) : (
                          <UserIcon className="h-5 w-5 text-white" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {admin.fullName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {admin.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                      {admin.username}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className={getRoleBadge(admin.role)}>
                      {admin.role.replace("_", " ")}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span
                      className={
                        admin.isActive
                          ? "status-badge status-active"
                          : "status-badge status-inactive"
                      }
                    >
                      {admin.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className="text-sm text-gray-500">
                      {admin.lastLoginAt
                        ? new Date(admin.lastLoginAt).toLocaleDateString()
                        : "Never"}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedAdmin(admin)}
                        className="p-1 text-blue-600 hover:text-blue-800"
                        title="View Details"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setSelectedAdmin(admin)}
                        className="p-1 text-teal-600 hover:text-teal-800"
                        title="Edit"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteAdmin(admin.id)}
                        className="p-1 text-red-600 hover:text-red-800"
                        title="Delete"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className="btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <AdminModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateAdmin}
        />
      )}

      {/* Details Modal */}
      {selectedAdmin && (
        <AdminDetailsModal
          admin={selectedAdmin}
          onClose={() => setSelectedAdmin(null)}
        />
      )}
    </div>
  );
};

// Create Admin Modal
const AdminModal = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    fullName: "",
    role: "admin",
    permissions: [],
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit(formData);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Create New Admin
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">Full Name</label>
            <input
              type="text"
              required
              className="form-input"
              value={formData.fullName}
              onChange={(e) =>
                setFormData({ ...formData, fullName: e.target.value })
              }
            />
          </div>
          <div>
            <label className="form-label">Username</label>
            <input
              type="text"
              required
              className="form-input"
              value={formData.username}
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value })
              }
            />
          </div>
          <div>
            <label className="form-label">Email</label>
            <input
              type="email"
              required
              className="form-input"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
          </div>
          <div>
            <label className="form-label">Password</label>
            <input
              type="password"
              required
              className="form-input"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
            />
          </div>
          <div>
            <label className="form-label">Role</label>
            <select
              className="form-input"
              value={formData.role}
              onChange={(e) =>
                setFormData({ ...formData, role: e.target.value })
              }
            >
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
              <option value="moderator">Moderator</option>
            </select>
          </div>
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-outline flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1"
            >
              {loading ? "Creating..." : "Create Admin"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Admin Details Modal
const AdminDetailsModal = ({ admin, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Admin Details
        </h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-500">
              Full Name
            </label>
            <p className="text-gray-900">{admin.fullName}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">
              Username
            </label>
            <p className="text-gray-900">{admin.username}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Email</label>
            <p className="text-gray-900">{admin.email}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Role</label>
            <p className="text-gray-900">{admin.role.replace("_", " ")}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Status</label>
            <span
              className={
                admin.isActive
                  ? "status-badge status-active"
                  : "status-badge status-inactive"
              }
            >
              {admin.isActive ? "Active" : "Inactive"}
            </span>
          </div>
          <div className="flex space-x-3 pt-4">
            <button onClick={onClose} className="btn-outline flex-1">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemAdmins;
