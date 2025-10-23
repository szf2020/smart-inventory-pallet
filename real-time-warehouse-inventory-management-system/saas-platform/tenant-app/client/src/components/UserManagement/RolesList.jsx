import React, { useState } from "react";
import {
  Shield,
  ShieldCheck,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Users,
  Eye,
  Crown,
} from "lucide-react";

const RolesList = ({
  roles,
  loading,
  onCreateRole,
  onEditRole,
  onRoleAction,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(null);

  const getSystemRoleBadge = (isSystemRole) => {
    if (isSystemRole) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          <Crown className="w-3 h-3 mr-1" />
          System Role
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        Custom Role
      </span>
    );
  };

  const getPermissionCount = (tab_permissions) => {
    if (!tab_permissions || typeof tab_permissions !== 'object') return 0;
    return Object.values(tab_permissions).filter(Boolean).length;
  };

  const getTabsWithAccess = (tab_permissions) => {
    if (!tab_permissions || typeof tab_permissions !== 'object') return [];
    return Object.keys(tab_permissions).filter(key => tab_permissions[key]);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleDropdownAction = (action, role) => {
    setDropdownOpen(null);

    switch (action) {
      case "edit":
        onEditRole(role);
        break;
      case "delete":
        if (
          window.confirm(
            `Are you sure you want to delete the role "${
              role.display_name || role.name
            }"?`
          )
        ) {
          onRoleAction("delete", role.role_id);
        }
        break;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Roles</h2>
          <p className="text-gray-600">Manage user roles and permissions</p>
        </div>
        <button
          onClick={onCreateRole}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Role
        </button>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map((role) => (
          <div
            key={role.role_id}
            className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
          >
            {/* Role Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div
                  className={`p-2 rounded-lg ${
                    role.is_system_role ? "bg-purple-100" : "bg-blue-100"
                  }`}
                >
                  {role.is_system_role ? (
                    <ShieldCheck
                      className={`w-5 h-5 ${
                        role.is_system_role
                          ? "text-purple-600"
                          : "text-blue-600"
                      }`}
                    />
                  ) : (
                    <Shield className="w-5 h-5 text-blue-600" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {role.display_name || role.name}
                  </h3>
                  <div className="mt-1">
                    {getSystemRoleBadge(role.is_system_role)}
                  </div>
                </div>
              </div>

              {!role.is_system_role && (
                <div className="relative">
                  <button
                    onClick={() =>
                      setDropdownOpen(
                        dropdownOpen === role.role_id ? null : role.role_id
                      )
                    }
                    className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {dropdownOpen === role.role_id && (
                    <div className="absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                      <div className="py-1">
                        <button
                          onClick={() => handleDropdownAction("edit", role)}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Role
                        </button>
                        <button
                          onClick={() => handleDropdownAction("delete", role)}
                          className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Role
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Role Description */}
            {role.description && (
              <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                {role.description}
              </p>
            )}

            {/* Role Stats */}
            <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
              <div className="flex items-center space-x-1">
                <Users className="w-4 h-4" />
                <span>{role.user_count || 0} users</span>
              </div>
              <div className="flex items-center space-x-1">
                <Eye className="w-4 h-4" />
                <span>
                  {getPermissionCount(role.tab_permissions)} tab permissions
                </span>
              </div>
            </div>

            {/* Tab Permissions Preview */}
            <div className="mb-4">
              <h4 className="text-xs font-medium text-gray-700 mb-2">Tab Access:</h4>
              <div className="flex flex-wrap gap-1">
                {getTabsWithAccess(role.tab_permissions).slice(0, 4).map((tab) => (
                  <span
                    key={tab}
                    className="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full"
                  >
                    {tab.replace('_', ' ')}
                  </span>
                ))}
                {getTabsWithAccess(role.tab_permissions).length > 4 && (
                  <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                    +{getTabsWithAccess(role.tab_permissions).length - 4} more
                  </span>
                )}
              </div>
            </div>

            {/* Permissions Preview */}
            {role.rolePermissions && role.rolePermissions.length > 0 && (
              <div className="mb-4">
                <div className="text-xs font-medium text-gray-700 mb-2">
                  Permissions:
                </div>
                <div className="flex flex-wrap gap-1">
                  {role.rolePermissions.slice(0, 3).map((permission, index) => (
                    <span
                      key={index}
                      className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                    >
                      {permission.module}.{permission.action}
                    </span>
                  ))}
                  {role.rolePermissions.length > 3 && (
                    <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                      +{role.rolePermissions.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Role Footer */}
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Created {formatDate(role.created_at)}</span>
                {role.creator && (
                  <span>
                    by {role.creator.full_name || role.creator.username}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {roles.length === 0 && (
        <div className="text-center py-12">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <div className="text-gray-500 mb-2">No roles found</div>
          <button
            onClick={onCreateRole}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Create your first role
          </button>
        </div>
      )}

      {/* Click outside to close dropdown */}
      {dropdownOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setDropdownOpen(null)}
        />
      )}
    </div>
  );
};

export default RolesList;
