import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  UserPlus,
  Settings,
  Shield,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Lock,
  Unlock,
  Eye,
} from "lucide-react";
import UsersList from "../components/UserManagement/UsersList";
import RolesList from "../components/UserManagement/RolesList";
import CreateUserModal from "../components/UserManagement/CreateUserModal";
import CreateRoleModal from "../components/UserManagement/CreateRoleModal";
import EditUserModal from "../components/UserManagement/EditUserModal";
import EditRoleModal from "../components/UserManagement/EditRoleModal";
import UserDetailsModal from "../components/UserManagement/UserDetailsModal";
import PermissionsMatrix from "../components/UserManagement/PermissionsMatrix";

const getApiUrl = () => {
  if (window.location.hostname === "localhost") {
    return import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  }
  return `https://${window.location.hostname}/api`;
};

const UserManagementPage = () => {
  const [activeTab, setActiveTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [activeRoles, setActiveRoles] = useState([]); // For user creation dropdowns
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  // Modal states
  const [modals, setModals] = useState({
    createUser: false,
    createRole: false,
    editUser: false,
    editRole: false,
    userDetails: false,
    permissionsMatrix: false,
  });

  // Selected items
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);

  const tabs = [
    { id: "users", label: "Users", icon: Users },
    { id: "roles", label: "Roles", icon: Shield },
    { id: "permissions", label: "Permissions", icon: Settings },
  ];

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${getApiUrl()}/user-management?page=${pagination.page}&limit=${
          pagination.limit
        }&search=${searchTerm}&status=${statusFilter}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      const data = await response.json();
      if (data.success) {
        setUsers(data.data.users);
        setPagination((prev) => ({
          ...prev,
          total: data.data.pagination.total,
          totalPages: data.data.pagination.totalPages,
        }));
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
    setLoading(false);
  }, [pagination.page, pagination.limit, searchTerm, statusFilter]);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${getApiUrl()}/roles?page=${pagination.page}&limit=${pagination.limit}&search=${searchTerm}&status=${statusFilter}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      const data = await response.json();
      if (data.roles) {
        setRoles(data.roles);
        setPagination((prev) => ({
          ...prev,
          total: data.pagination?.total || data.roles.length,
          totalPages: data.pagination?.pages || 1,
        }));
      }
    } catch (error) {
      console.error("Error fetching roles:", error);
    }
    setLoading(false);
  }, [pagination.page, pagination.limit, searchTerm, statusFilter]);

  const fetchActiveRoles = useCallback(async () => {
    try {
      const response = await fetch(`${getApiUrl()}/roles/active/list`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await response.json();
      if (data.roles) {
        setActiveRoles(data.roles);
      }
    } catch (error) {
      console.error("Error fetching active roles:", error);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "users") {
      fetchUsers();
      fetchActiveRoles(); // Fetch active roles for user creation
    } else if (activeTab === "roles") {
      fetchRoles();
    }
  }, [activeTab, fetchUsers, fetchRoles, fetchActiveRoles]);

  // Separate effect for search and filter changes
  useEffect(() => {
    if (activeTab === "users") {
      fetchUsers();
    }
  }, [searchTerm, statusFilter, pagination.page, activeTab, fetchUsers]);

  const openModal = (modalName, item = null) => {
    if (modalName === "editUser" || modalName === "userDetails") {
      setSelectedUser(item);
    } else if (modalName === "editRole") {
      setSelectedRole(item);
    }
    setModals((prev) => ({ ...prev, [modalName]: true }));
  };

  const closeModal = (modalName) => {
    setModals((prev) => ({ ...prev, [modalName]: false }));
    setSelectedUser(null);
    setSelectedRole(null);
  };

  const handleUserAction = async (action, userId, data = {}) => {
    try {
      let response;
      const token = localStorage.getItem("token");

      switch (action) {
        case "delete":
          response = await fetch(`${getApiUrl()}/user-management/${userId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          break;
        case "toggleStatus":
          response = await fetch(
            `${getApiUrl()}/user-management/${userId}/status`,
            {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ status: data.status }),
            }
          );
          break;
        case "resetPassword":
          response = await fetch(
            `${getApiUrl()}/user-management/${userId}/password`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ newPassword: data.newPassword }),
            }
          );
          break;
      }

      if (response?.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error(`Error ${action} user:`, error);
    }
  };

  const handleRoleAction = async (action, roleId, data = {}) => {
    try {
      let response;
      const token = localStorage.getItem("token");

      switch (action) {
        case "delete":
          response = await fetch(`${getApiUrl()}/roles/${roleId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          break;
        case "updatePermissions":
          response = await fetch(`${getApiUrl()}/roles/${roleId}/permissions`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ tab_permissions: data.permissions }),
          });
          break;
      }

      if (response && response.ok) {
        await fetchRoles(); // Refresh the roles list
      }
    } catch (error) {
      console.error(`Error performing ${action} on role:`, error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            User & Role Management
          </h1>
          <p className="text-gray-600 mt-2">
            Manage users, roles, and permissions
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow">
          {activeTab === "users" && (
            <UsersList
              users={users}
              loading={loading}
              pagination={pagination}
              searchTerm={searchTerm}
              statusFilter={statusFilter}
              onSearch={setSearchTerm}
              onFilter={setStatusFilter}
              onPageChange={(page) =>
                setPagination((prev) => ({ ...prev, page }))
              }
              onCreateUser={() => openModal("createUser")}
              onEditUser={(user) => openModal("editUser", user)}
              onViewUser={(user) => openModal("userDetails", user)}
              onUserAction={handleUserAction}
            />
          )}

          {activeTab === "roles" && (
            <RolesList
              roles={roles}
              loading={loading}
              onCreateRole={() => openModal("createRole")}
              onEditRole={(role) => openModal("editRole", role)}
              onRoleAction={handleRoleAction}
            />
          )}

          {activeTab === "permissions" && (
            <PermissionsMatrix
              roles={roles}
              loading={loading}
            />
          )}
        </div>

        {/* Modals */}
        <CreateUserModal
          isOpen={modals.createUser}
          onClose={() => closeModal("createUser")}
          onSuccess={() => {
            closeModal("createUser");
            fetchUsers();
          }}
          roles={activeRoles}
        />

        <CreateRoleModal
          isOpen={modals.createRole}
          onClose={() => closeModal("createRole")}
          onSuccess={() => {
            closeModal("createRole");
            fetchRoles();
          }}
        />

        <EditUserModal
          isOpen={modals.editUser}
          onClose={() => closeModal("editUser")}
          onSuccess={() => {
            closeModal("editUser");
            fetchUsers();
          }}
          user={selectedUser}
          roles={activeRoles}
        />

        <EditRoleModal
          isOpen={modals.editRole}
          onClose={() => closeModal("editRole")}
          onSuccess={() => {
            closeModal("editRole");
            fetchRoles();
          }}
          role={selectedRole}
        />

        <UserDetailsModal
          isOpen={modals.userDetails}
          onClose={() => closeModal("userDetails")}
          user={selectedUser}
        />
      </div>
    </div>
  );
};

export default UserManagementPage;
