import React, { useState, useEffect } from "react";
import {
  Eye,
  Edit,
  Trash2,
  Plus,
  Search,
  Filter,
  Download,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Clock,
  X,
  Save,
  Phone,
  Mail,
  MapPin,
  User,
  Building,
  DollarSign,
} from "lucide-react";
import { fetchCustomers, fetchSuppliers } from "../../services/api";
import AddAccountModal from "./AddAccountModal";

const CreditAccountsTable = ({ refreshTrigger, onAccountSelect }) => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [sortField, setSortField] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [showAddModal, setShowAddModal] = useState(false);

  // Modal states
  const [viewingAccount, setViewingAccount] = useState(null);
  const [editingAccount, setEditingAccount] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Edit form state
  const [editFormData, setEditFormData] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadAccountsData = async () => {
    try {
      setLoading(true);
      const [customersResponse, suppliersResponse] = await Promise.all([
        fetchCustomers(),
        fetchSuppliers(),
      ]);

      const customersData = Array.isArray(customersResponse)
        ? customersResponse
        : customersResponse.data || [];
      const suppliersData = Array.isArray(suppliersResponse)
        ? suppliersResponse
        : suppliersResponse.data || [];

      const customers = customersData.map((customer) => ({
        ...customer,
        type: "customer",
        account_name: customer.name,
        balance: customer.outstanding_balance || 0,
        credit_limit: customer.credit_limit || 0,
        status: getAccountStatus(
          customer.outstanding_balance,
          customer.credit_limit
        ),
      }));

      const suppliers = suppliersData.map((supplier) => ({
        ...supplier,
        type: "supplier",
        account_name: supplier.name,
        balance: supplier.outstanding_balance || 0,
        credit_limit: 0,
        status: supplier.outstanding_balance > 0 ? "has_balance" : "clear",
      }));

      setAccounts([...customers, ...suppliers]);
      setError(null);
    } catch (err) {
      setError(
        "Failed to load accounts: " +
          (err.response?.data?.message || err.message)
      );
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccountsData();
  }, [refreshTrigger]);

  // Handle view account
  const handleViewAccount = (account) => {
    setViewingAccount(account);
  };

  // Handle edit account
  const handleEditAccount = (account) => {
    setEditingAccount(account);
    setEditFormData({
      name: account.name || account.account_name,
      email: account.email || "",
      phone: account.phone || "",
      address: account.address || "",
      contact_person: account.contact_person || "",
      credit_limit: account.credit_limit || 0,
    });
  };

  // Handle edit form input change
  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle edit form submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);

    try {
      // TODO: Connect to your backend API
      // Example:
      // const response = await updateAccount(editingAccount.type, editingAccount.customer_id || editingAccount.supplier_id, editFormData);

      console.log("Updating account:", {
        type: editingAccount.type,
        id: editingAccount.customer_id || editingAccount.supplier_id,
        data: editFormData,
      });

      // For now, simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // After successful update, refresh the accounts list
      await loadAccountsData();

      setEditingAccount(null);
      setEditFormData({});
    } catch (error) {
      console.error("Error updating account:", error);
      setError("Failed to update account. Please try again.");
    } finally {
      setEditLoading(false);
    }
  };

  // Handle delete confirmation
  const handleDeleteClick = (account) => {
    setDeleteConfirm(account);
  };

  // Handle delete confirm
  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;

    setDeleteLoading(true);
    try {
      // TODO: Connect to your backend API
      // Example:
      // const response = await deleteAccount(deleteConfirm.type, deleteConfirm.customer_id || deleteConfirm.supplier_id);

      console.log("Deleting account:", {
        type: deleteConfirm.type,
        id: deleteConfirm.customer_id || deleteConfirm.supplier_id,
      });

      // For now, simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // After successful deletion, refresh the accounts list
      await loadAccountsData();

      setDeleteConfirm(null);
    } catch (error) {
      console.error("Error deleting account:", error);
      setError("Failed to delete account. Please try again.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleAccountAdded = () => {
    setShowAddModal(false);
    loadAccountsData();
  };

  const handleExport = () => {
    try {
      if (filteredAndSortedAccounts.length === 0) {
        setError("No data to export. Please check your filters.");
        return;
      }

      const exportData = filteredAndSortedAccounts.map((account) => ({
        "Account ID": account.customer_id || account.supplier_id || "",
        "Account Name": account.account_name || "",
        Type: account.type
          ? account.type.charAt(0).toUpperCase() + account.type.slice(1)
          : "",
        Phone: account.phone || "",
        Email: account.email || "",
        Address: (account.address || "").replace(/\n/g, " ").replace(/\r/g, ""),
        "Contact Person": account.contact_person || "",
        "Outstanding Balance": parseFloat(account.balance || 0).toFixed(2),
        "Credit Limit":
          account.type === "customer"
            ? parseFloat(account.credit_limit || 0).toFixed(2)
            : "",
        Status: account.status
          ? account.status
              .replace("_", " ")
              .replace(/\b\w/g, (l) => l.toUpperCase())
          : "",
        "Created Date": account.created_at
          ? new Date(account.created_at).toLocaleDateString("en-CA")
          : "",
        "Updated Date": account.updated_at
          ? new Date(account.updated_at).toLocaleDateString("en-CA")
          : "",
      }));

      const headers = Object.keys(exportData[0]);

      const escapeCSVValue = (value) => {
        if (value === null || value === undefined) return "";

        const stringValue = String(value);

        if (
          stringValue.includes(",") ||
          stringValue.includes('"') ||
          stringValue.includes("\n") ||
          stringValue.includes("\r")
        ) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }

        return stringValue;
      };

      const BOM = "\uFEFF";
      const csvContent =
        BOM +
        [
          headers.join(","),
          ...exportData.map((row) =>
            headers.map((header) => escapeCSVValue(row[header])).join(",")
          ),
        ].join("\r\n");

      const blob = new Blob([csvContent], {
        type: "text/csv;charset=utf-8;",
      });

      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      const timestamp = new Date().toISOString().split("T")[0];
      const filename = `credit_accounts_${timestamp}.csv`;

      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);

      console.log(`Exported ${exportData.length} accounts to ${filename}`);
    } catch (error) {
      console.error("Error exporting data:", error);
      setError("Failed to export data. Please try again.");
    }
  };

  const getAccountStatus = (balance, creditLimit) => {
    if (balance <= 0) return "clear";
    if (creditLimit && balance > creditLimit) return "over_limit";
    if (creditLimit && balance > creditLimit * 0.8) return "near_limit";
    return "has_balance";
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "clear":
        return "bg-green-100 text-green-800";
      case "has_balance":
        return "bg-yellow-100 text-yellow-800";
      case "near_limit":
        return "bg-orange-100 text-orange-800";
      case "over_limit":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "clear":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "has_balance":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "near_limit":
      case "over_limit":
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <CreditCard className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount || 0);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const filteredAndSortedAccounts = accounts
    .filter((account) => {
      const matchesSearch =
        account.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (account.email &&
          account.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (account.phone && account.phone.includes(searchTerm));

      const matchesType =
        filterType === "all" ||
        (filterType === "customers" && account.type === "customer") ||
        (filterType === "suppliers" && account.type === "supplier");

      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading accounts...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex-1 flex gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search accounts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="border rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Accounts</option>
                <option value="customers">Customers Only</option>
                <option value="suppliers">Suppliers Only</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="flex items-center px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Account
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Accounts Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">
            Credit Accounts ({filteredAndSortedAccounts.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("account_name")}
                >
                  <div className="flex items-center">
                    Account Name
                    {sortField === "account_name" && (
                      <span className="ml-1">
                        {sortOrder === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("balance")}
                >
                  <div className="flex items-center justify-end">
                    Balance
                    {sortField === "balance" && (
                      <span className="ml-1">
                        {sortOrder === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Credit Limit
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedAccounts.map((account) => (
                <tr
                  key={`${account.type}-${
                    account.customer_id || account.supplier_id
                  }`}
                  className="hover:bg-gray-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">
                            {account.account_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {account.account_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {account.customer_id || account.supplier_id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        account.type === "customer"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-purple-100 text-purple-800"
                      }`}
                    >
                      {account.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>
                      {account.phone && (
                        <div className="flex items-center">
                          <span>{account.phone}</span>
                        </div>
                      )}
                      {account.email && (
                        <div className="text-xs text-gray-400">
                          {account.email}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    <span
                      className={`font-medium ${
                        account.balance > 0 ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {formatCurrency(account.balance)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                    {account.type === "customer" && account.credit_limit > 0
                      ? formatCurrency(account.credit_limit)
                      : "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center">
                      {getStatusIcon(account.status)}
                      <span
                        className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          account.status
                        )}`}
                      >
                        {account.status.replace("_", " ")}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <div className="flex items-center justify-center space-x-2">
                      <button
                        onClick={() => handleViewAccount(account)}
                        className="text-blue-600 hover:text-blue-900"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEditAccount(account)}
                        className="text-green-600 hover:text-green-900"
                        title="Edit Account"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(account)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete Account"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredAndSortedAccounts.length === 0 && !loading && (
            <div className="text-center py-12">
              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No accounts found</p>
              <p className="text-sm text-gray-400">
                Try adjusting your search or filters
              </p>
            </div>
          )}
        </div>
      </div>

      {/* View Account Modal */}
      {viewingAccount && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Eye className="h-5 w-5 text-blue-600" />
                Account Details
              </h2>
              <button
                onClick={() => setViewingAccount(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Account Name
                    </label>
                    <p className="text-sm text-gray-900">
                      {viewingAccount.account_name}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Account Type
                    </label>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        viewingAccount.type === "customer"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-purple-100 text-purple-800"
                      }`}
                    >
                      {viewingAccount.type}
                    </span>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Account ID
                    </label>
                    <p className="text-sm text-gray-900">
                      {viewingAccount.customer_id || viewingAccount.supplier_id}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      Phone
                    </label>
                    <p className="text-sm text-gray-900">
                      {viewingAccount.phone || "Not provided"}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      Email
                    </label>
                    <p className="text-sm text-gray-900">
                      {viewingAccount.email || "Not provided"}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      Outstanding Balance
                    </label>
                    <p
                      className={`text-lg font-semibold ${
                        viewingAccount.balance > 0
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      {formatCurrency(viewingAccount.balance)}
                    </p>
                  </div>

                  {viewingAccount.type === "customer" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Credit Limit
                      </label>
                      <p className="text-sm text-gray-900">
                        {formatCurrency(viewingAccount.credit_limit)}
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(viewingAccount.status)}
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          viewingAccount.status
                        )}`}
                      >
                        {viewingAccount.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                      <User className="h-4 w-4" />
                      Contact Person
                    </label>
                    <p className="text-sm text-gray-900">
                      {viewingAccount.contact_person || "Not provided"}
                    </p>
                  </div>
                </div>
              </div>

              {viewingAccount.address && (
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    Address
                  </label>
                  <p className="text-sm text-gray-900 whitespace-pre-line">
                    {viewingAccount.address}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Account Modal */}
      {editingAccount && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Edit className="h-5 w-5 text-green-600" />
                Edit Account
              </h2>
              <button
                onClick={() => {
                  setEditingAccount(null);
                  setEditFormData({});
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Account Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Building className="inline h-4 w-4 mr-1" />
                    Account Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={editFormData.name || ""}
                    onChange={handleEditInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Mail className="inline h-4 w-4 mr-1" />
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={editFormData.email || ""}
                    onChange={handleEditInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Phone className="inline h-4 w-4 mr-1" />
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={editFormData.phone || ""}
                    onChange={handleEditInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                {/* Contact Person */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="inline h-4 w-4 mr-1" />
                    Contact Person
                  </label>
                  <input
                    type="text"
                    name="contact_person"
                    value={editFormData.contact_person || ""}
                    onChange={handleEditInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                {/* Credit Limit - Only for customers */}
                {editingAccount.type === "customer" && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <DollarSign className="inline h-4 w-4 mr-1" />
                      Credit Limit
                    </label>
                    <input
                      type="number"
                      name="credit_limit"
                      value={editFormData.credit_limit || 0}
                      onChange={handleEditInputChange}
                      step="0.01"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                )}
              </div>

              {/* Address */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="inline h-4 w-4 mr-1" />
                  Address
                </label>
                <textarea
                  name="address"
                  value={editFormData.address || ""}
                  onChange={handleEditInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setEditingAccount(null);
                    setEditFormData({});
                  }}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {editLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Update Account
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-full bg-red-100">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Delete Account
                </h3>
                <p className="text-sm text-gray-600">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700">
                <strong>Account:</strong> {deleteConfirm.account_name}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Type:</strong> {deleteConfirm.type}
              </p>
              <p className="text-sm text-gray-700">
                <strong>ID:</strong>{" "}
                {deleteConfirm.customer_id || deleteConfirm.supplier_id}
              </p>
              {deleteConfirm.balance > 0 && (
                <p className="text-sm text-red-600 font-medium">
                  <strong>Outstanding Balance:</strong>{" "}
                  {formatCurrency(deleteConfirm.balance)}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {deleteLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete Account
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Account Modal */}
      <AddAccountModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAccountAdded={handleAccountAdded}
      />
    </div>
  );
};

export default CreditAccountsTable;
