import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  UserPlus,
  MapPin,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  TrendingUp,
  Award,
  Clock,
} from "lucide-react";
import CreateRepModal from "../components/RepManagement/CreateRepModal";

const getApiUrl = () => {
  if (window.location.hostname === "localhost") {
    return import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  }
  return `https://${window.location.hostname}/api`;
};

const RepManagementPage = () => {
  const [reps, setReps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [territoryFilter, setTerritoryFilter] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  // Modal states
  const [modals, setModals] = useState({
    create: false,
    edit: false,
    view: false,
    performance: false,
  });

  const [selectedRep, setSelectedRep] = useState(null);

  const fetchReps = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm,
        status: statusFilter,
        territory: territoryFilter,
      });

      const response = await fetch(`${getApiUrl()}/reps?${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setReps(data.data.reps);
        setPagination((prev) => ({
          ...prev,
          total: data.data.pagination.totalItems,
          totalPages: data.data.pagination.totalPages,
        }));
      }
    } catch (error) {
      console.error("Error fetching reps:", error);
    }
    setLoading(false);
  }, [
    pagination.page,
    pagination.limit,
    searchTerm,
    statusFilter,
    territoryFilter,
  ]);

  useEffect(() => {
    fetchReps();
  }, [fetchReps]);

  const openModal = (modalName, rep = null) => {
    setSelectedRep(rep);
    setModals((prev) => ({ ...prev, [modalName]: true }));
  };

  const closeModal = (modalName) => {
    setModals((prev) => ({ ...prev, [modalName]: false }));
    setSelectedRep(null);
  };

  const handleRepAction = async (action, repId) => {
    try {
      const token = localStorage.getItem("token");
      let response;

      switch (action) {
        case "delete":
          if (
            window.confirm(
              "Are you sure you want to delete this representative?"
            )
          ) {
            response = await fetch(`${getApiUrl()}/reps/${repId}`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
              fetchReps();
            }
          }
          break;
      }
    } catch (error) {
      console.error(`Error ${action} rep:`, error);
    }
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      active: "bg-green-100 text-green-800",
      inactive: "bg-gray-100 text-gray-800",
      suspended: "bg-red-100 text-red-800",
    };
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status]}`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Representative Management
          </h1>
          <p className="text-gray-600 mt-2">
            Manage sales representatives and track their performance
          </p>
        </div>

        {/* Action Bar */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search representatives..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-64"
                />
              </div>

              {/* Status Filter */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              {/* Territory Filter */}
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Filter by territory..."
                  value={territoryFilter}
                  onChange={(e) => setTerritoryFilter(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-48"
                />
              </div>
            </div>

            {/* Add Rep Button */}
            <button
              onClick={() => openModal("create")}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors duration-200"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Representative</span>
            </button>
          </div>
        </div>

        {/* Reps Grid */}
        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-4">Loading representatives...</p>
            </div>
          ) : reps.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No representatives found
              </h3>
              <p className="text-gray-500 mb-4">
                Get started by adding your first sales representative.
              </p>
              <button
                onClick={() => openModal("create")}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 mx-auto"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add Representative</span>
              </button>
            </div>
          ) : (
            <>
              {/* Desktop View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Representative
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Territory
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Commission
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Hire Date
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reps.map((rep) => (
                      <tr key={rep.rep_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {rep.rep_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {rep.rep_code}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            <div className="flex items-center space-x-1">
                              <Phone className="w-3 h-3 text-gray-400" />
                              <span>{rep.phone || "N/A"}</span>
                            </div>
                            {rep.email && (
                              <div className="flex items-center space-x-1 mt-1">
                                <Mail className="w-3 h-3 text-gray-400" />
                                <span className="text-xs">{rep.email}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {rep.territory || "Not assigned"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {rep.commission_rate}%
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(rep.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {rep.hire_date
                            ? new Date(rep.hire_date).toLocaleDateString()
                            : "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => openModal("view", rep)}
                              className="text-blue-600 hover:text-blue-900 p-1"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openModal("performance", rep)}
                              className="text-green-600 hover:text-green-900 p-1"
                            >
                              <TrendingUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openModal("edit", rep)}
                              className="text-gray-600 hover:text-gray-900 p-1"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                handleRepAction("delete", rep.rep_id)
                              }
                              className="text-red-600 hover:text-red-900 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile View */}
              <div className="md:hidden">
                {reps.map((rep) => (
                  <div
                    key={rep.rep_id}
                    className="p-4 border-b border-gray-200 last:border-b-0"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">
                          {rep.rep_name}
                        </h3>
                        <p className="text-xs text-gray-500">{rep.rep_code}</p>
                      </div>
                      {getStatusBadge(rep.status)}
                    </div>

                    <div className="space-y-1 mb-3">
                      {rep.phone && (
                        <div className="flex items-center space-x-2 text-xs text-gray-600">
                          <Phone className="w-3 h-3" />
                          <span>{rep.phone}</span>
                        </div>
                      )}
                      {rep.territory && (
                        <div className="flex items-center space-x-2 text-xs text-gray-600">
                          <MapPin className="w-3 h-3" />
                          <span>{rep.territory}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-2 text-xs text-gray-600">
                        <DollarSign className="w-3 h-3" />
                        <span>{rep.commission_rate}% commission</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1 text-xs text-gray-500">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {rep.hire_date
                            ? `Hired ${new Date(
                                rep.hire_date
                              ).toLocaleDateString()}`
                            : "Hire date not set"}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openModal("view", rep)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openModal("performance", rep)}
                          className="text-green-600 hover:text-green-900 p-1"
                        >
                          <TrendingUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openModal("edit", rep)}
                          className="text-gray-600 hover:text-gray-900 p-1"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRepAction("delete", rep.rep_id)}
                          className="text-red-600 hover:text-red-900 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                      {Math.min(
                        pagination.page * pagination.limit,
                        pagination.total
                      )}{" "}
                      of {pagination.total} results
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() =>
                          setPagination((prev) => ({
                            ...prev,
                            page: prev.page - 1,
                          }))
                        }
                        disabled={pagination.page === 1}
                        className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <span className="text-sm text-gray-700">
                        Page {pagination.page} of {pagination.totalPages}
                      </span>
                      <button
                        onClick={() =>
                          setPagination((prev) => ({
                            ...prev,
                            page: prev.page + 1,
                          }))
                        }
                        disabled={pagination.page === pagination.totalPages}
                        className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      <CreateRepModal
        isOpen={modals.create}
        onClose={() => closeModal("create")}
        onSuccess={() => {
          closeModal("create");
          fetchReps();
        }}
      />
    </div>
  );
};

export default RepManagementPage;
