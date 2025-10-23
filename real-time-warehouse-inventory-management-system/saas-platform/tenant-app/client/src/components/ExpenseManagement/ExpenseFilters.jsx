import React from "react";
import { Search, Calendar, Tag, Filter } from "lucide-react";

const ExpenseFilters = ({ filters, onFilterChange, className = "" }) => {
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    onFilterChange({
      ...filters,
      [name]: value,
    });
  };

  const clearFilters = () => {
    onFilterChange({
      startDate: "",
      endDate: "",
      category: "",
      status: "",
      search: "",
    });
  };

  const predefinedCategories = [
    "Office Supplies",
    "Transportation",
    "Utilities",
    "Rent",
    "Marketing",
    "Equipment",
    "Professional Services",
    "Insurance",
    "Maintenance",
    "Fuel",
    "Communication",
    "Travel",
    "Training",
    "Software/Licenses",
    "Bank Charges",
    "Other",
  ];

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-500" />
          Filter Expenses
        </h3>
        <button
          onClick={clearFilters}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Clear All
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Search */}
        <div className="xl:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Search className="inline h-4 w-4 mr-1" />
            Search
          </label>
          <input
            type="text"
            name="search"
            value={filters.search}
            onChange={handleInputChange}
            placeholder="Search by category, description, supplier..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
          />
        </div>

        {/* Start Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Calendar className="inline h-4 w-4 mr-1" />
            Start Date
          </label>
          <input
            type="date"
            name="startDate"
            value={filters.startDate}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
          />
        </div>

        {/* End Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Calendar className="inline h-4 w-4 mr-1" />
            End Date
          </label>
          <input
            type="date"
            name="endDate"
            value={filters.endDate}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Tag className="inline h-4 w-4 mr-1" />
            Category
          </label>
          <select
            name="category"
            value={filters.category}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
          >
            <option value="">All Categories</option>
            {predefinedCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            name="status"
            value={filters.status}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Active Filters Display */}
      <div className="mt-4">
        <div className="flex flex-wrap gap-2">
          {Object.entries(filters).map(([key, value]) => {
            if (!value) return null;

            let displayValue = value;
            if (key === "startDate" || key === "endDate") {
              displayValue = new Date(value).toLocaleDateString();
            }

            return (
              <span
                key={key}
                className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full"
              >
                <span className="capitalize">
                  {key.replace(/([A-Z])/g, " $1").trim()}:
                </span>
                <span className="font-medium">{displayValue}</span>
                <button
                  onClick={() => onFilterChange({ ...filters, [key]: "" })}
                  className="ml-1 text-red-600 hover:text-red-800"
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ExpenseFilters;
