import React from 'react';
import { X, User, Mail, Phone, Shield, Calendar, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const UserDetailsModal = ({ isOpen, onClose, user }) => {
  if (!isOpen || !user) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'inactive':
        return <XCircle className="w-5 h-5 text-gray-500" />;
      case 'suspended':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <XCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-100 text-green-800 border-green-200',
      inactive: 'bg-gray-100 text-gray-800 border-gray-200',
      suspended: 'bg-red-100 text-red-800 border-red-200'
    };

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${styles[status]}`}>
        {getStatusIcon(status)}
        <span className="ml-2">{status.charAt(0).toUpperCase() + status.slice(1)}</span>
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-blue-600 font-semibold text-lg">
                {(user.full_name || user.username).charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {user.full_name || user.username}
              </h2>
              <p className="text-gray-600">@{user.username}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Status</span>
            {getStatusBadge(user.status)}
          </div>

          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
              Personal Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <User className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-sm font-medium text-gray-700">Full Name</div>
                  <div className="text-sm text-gray-900">{user.full_name || 'Not provided'}</div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-sm font-medium text-gray-700">Email</div>
                  <div className="text-sm text-gray-900">{user.email || 'Not provided'}</div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-sm font-medium text-gray-700">Phone</div>
                  <div className="text-sm text-gray-900">{user.phone || 'Not provided'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Role Information */}
          {user.userRole && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
                Role & Tab Permissions
              </h3>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <Shield className="w-5 h-5 text-blue-500" />
                  <div>
                    <div className="text-sm font-medium text-gray-700">Role</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {user.userRole.name}
                    </div>
                  </div>
                </div>
                
                {user.userRole.description && (
                  <div className="mb-3">
                    <div className="text-sm font-medium text-gray-700 mb-1">Description</div>
                    <div className="text-sm text-gray-600">{user.userRole.description}</div>
                  </div>
                )}

                {user.userRole.tab_permissions && (
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      Tab Access ({Object.values(user.userRole.tab_permissions).filter(Boolean).length} tabs)
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(user.userRole.tab_permissions)
                        .filter(([, hasAccess]) => hasAccess)
                        .map(([tabKey]) => (
                          <span
                            key={tabKey}
                            className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded"
                          >
                            {tabKey.replace('_', ' ')}
                          </span>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Activity Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
              Activity Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <Clock className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-sm font-medium text-gray-700">Last Login</div>
                  <div className="text-sm text-gray-900">{formatDate(user.last_login)}</div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-sm font-medium text-gray-700">Created</div>
                  <div className="text-sm text-gray-900">{formatDate(user.created_at)}</div>
                </div>
              </div>

              {user.creator && (
                <div className="flex items-center space-x-3">
                  <User className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="text-sm font-medium text-gray-700">Created By</div>
                    <div className="text-sm text-gray-900">
                      {user.creator.full_name || user.creator.username}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-sm font-medium text-gray-700">Last Updated</div>
                  <div className="text-sm text-gray-900">{formatDate(user.updated_at)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* System Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
              System Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">User ID:</span>
                <span className="ml-2 text-gray-600">{user.user_id}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Legacy Role:</span>
                <span className="ml-2 text-gray-600">{user.role || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserDetailsModal;
