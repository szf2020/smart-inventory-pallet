import React, { useState, useEffect } from "react";
import { ChevronDown, User } from "lucide-react";

const getApiUrl = () => {
  if (window.location.hostname === "localhost") {
    return import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  }
  return `https://${window.location.hostname}/api`;
};

const RepSelector = ({
  value,
  onChange,
  required = false,
  disabled = false,
  label = "Representative",
  placeholder = "Select representative...",
  className = "",
  showLabel = true,
}) => {
  const [reps, setReps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchActiveReps();
  }, []);

  const fetchActiveReps = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${getApiUrl()}/reps/active`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setReps(data.data);
      } else {
        setError("Failed to load representatives");
      }
    } catch (err) {
      setError("Failed to load representatives");
      console.error("Error fetching active reps:", err);
    }
    setLoading(false);
  };

  const selectedRep = reps.find((rep) => rep.rep_id === value);

  return (
    <div className={className}>
      {showLabel && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="relative">
        <select
          value={value || ""}
          onChange={(e) =>
            onChange(e.target.value ? parseInt(e.target.value) : null)
          }
          disabled={disabled || loading}
          className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white ${
            disabled || loading ? "bg-gray-50 cursor-not-allowed" : ""
          } ${error ? "border-red-300" : ""}`}
        >
          <option value="">
            {loading ? "Loading representatives..." : placeholder}
          </option>
          {reps.map((rep) => (
            <option key={rep.rep_id} value={rep.rep_id}>
              {rep.rep_name} ({rep.rep_code})
              {rep.territory && ` - ${rep.territory}`}
            </option>
          ))}
        </select>

        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
      </div>

      {/* Selected Rep Info */}
      {selectedRep && (
        <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center space-x-2 text-sm">
            <User className="w-4 h-4 text-blue-600" />
            <div>
              <span className="font-medium text-blue-900">
                {selectedRep.rep_name}
              </span>
              <span className="text-blue-700"> ({selectedRep.rep_code})</span>
              {selectedRep.territory && (
                <span className="text-blue-600">
                  {" "}
                  - {selectedRep.territory}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-1 text-red-500 text-xs flex items-center space-x-1">
          <span>{error}</span>
          <button
            onClick={fetchActiveReps}
            className="text-blue-500 hover:text-blue-700 underline"
          >
            Retry
          </button>
        </div>
      )}

      {loading && (
        <div className="mt-1 text-blue-500 text-xs flex items-center space-x-1">
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
          <span>Loading representatives...</span>
        </div>
      )}
    </div>
  );
};

export default RepSelector;
