import React, { useState } from 'react';
import { Settings, Eye, Info, Check, X, Shield } from 'lucide-react';

const PermissionsMatrix = ({ roles, loading }) => {
  const [selectedRole, setSelectedRole] = useState('');

  const tabLabels = {
    dashboard: 'Dashboard',
    stock: 'Stock Management',
    loading: 'Loading Management',
    discounts: 'Discount Management',
    credits: 'Credit Management',
    expenses: 'Expense Management',
    reports: 'Reports',
    manage: 'Management',
    representatives: 'Representatives',
    users_roles: 'User & Role Management',
    help: 'Help'
  };

  const selectedRoleData = selectedRole ? roles.find(r => r.role_id.toString() === selectedRole) : null;

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
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
          <h2 className="text-xl font-semibold text-gray-900">Tab Permissions Matrix</h2>
          <p className="text-gray-600">View tab access permissions across all roles</p>
        </div>
        
        {/* Role Filter */}
        <div className="flex items-center space-x-2">
          <Eye className="w-4 h-4 text-gray-400" />
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Roles</option>
            {roles.map((role) => (
              <option key={role.role_id} value={role.role_id}>
                {role.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedRoleData && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-500 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900">
                Viewing permissions for: {selectedRoleData.name}
              </h3>
              {selectedRoleData.description && (
                <p className="text-blue-700 text-sm mt-1">{selectedRoleData.description}</p>
              )}
              <p className="text-blue-600 text-sm mt-1">
                Tab access permissions: {Object.values(selectedRoleData.tab_permissions || {}).filter(Boolean).length} of {Object.keys(tabLabels).length}
              </p>
              {selectedRoleData.is_system_role && (
                <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 mt-2">
                  <Shield className="w-3 h-3 mr-1" />
                  System Role
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Permissions Matrix */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {selectedRole ? (
          /* Single Role View */
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tab
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Access
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.entries(tabLabels).map(([tabKey, tabLabel]) => {
                  const hasAccess = selectedRoleData.tab_permissions?.[tabKey] || false;
                  
                  return (
                    <tr key={tabKey} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {tabLabel}
                        </div>
                        <div className="text-xs text-gray-500">
                          {tabKey}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600">
                          Access to {tabLabel.toLowerCase()} functionality
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {hasAccess ? (
                          <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <Check className="w-3 h-3 mr-1" />
                            Granted
                          </div>
                        ) : (
                          <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <X className="w-3 h-3 mr-1" />
                            Denied
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* All Roles Overview */
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tab
                  </th>
                  {roles.map((role) => (
                    <th key={role.role_id} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="flex flex-col items-center">
                        <span className="truncate max-w-24">{role.name}</span>
                        {role.is_system_role && (
                          <Shield className="w-3 h-3 text-purple-500 mt-1" />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.entries(tabLabels).map(([tabKey, tabLabel]) => (
                  <tr key={tabKey} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {tabLabel}
                      </div>
                      <div className="text-xs text-gray-500">
                        {tabKey}
                      </div>
                    </td>
                    {roles.map((role) => {
                      const hasAccess = role.tab_permissions?.[tabKey] || false;
                      return (
                        <td key={role.role_id} className="px-3 py-4 whitespace-nowrap text-center">
                          {hasAccess ? (
                            <Check className="w-4 h-4 text-green-600 mx-auto" />
                          ) : (
                            <X className="w-4 h-4 text-red-600 mx-auto" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary */}
      {!selectedRole && roles.length > 0 && (
        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{roles.length}</div>
              <div className="text-xs text-gray-600">Total Roles</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {roles.filter(r => r.is_system_role).length}
              </div>
              <div className="text-xs text-gray-600">System Roles</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Object.keys(tabLabels).length}
              </div>
              <div className="text-xs text-gray-600">Available Tabs</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {roles.reduce((acc, role) => {
                  return acc + Object.values(role.tab_permissions || {}).filter(Boolean).length;
                }, 0)}
              </div>
              <div className="text-xs text-gray-600">Total Permissions</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PermissionsMatrix;
