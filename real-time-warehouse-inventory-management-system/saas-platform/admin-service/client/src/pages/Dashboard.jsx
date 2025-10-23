import React, { useState, useEffect } from "react";
import {
  BuildingOfficeIcon,
  UsersIcon,
  CreditCardIcon,
  ChartBarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalTenants: 0,
    activeTenants: 0,
    totalRevenue: 0,
    monthlyGrowth: 0,
    systemHealth: 99.9,
    activeAdmins: 0,
  });

  const [recentActivity, setRecentActivity] = useState([
    {
      id: 1,
      type: "tenant_created",
      message: 'New tenant "Acme Corp" created',
      timestamp: "2 minutes ago",
      status: "success",
    },
    {
      id: 2,
      type: "payment_received",
      message: "Payment received from TechStart Ltd",
      timestamp: "15 minutes ago",
      status: "success",
    },
    {
      id: 3,
      type: "ssl_expired",
      message: "SSL certificate expires in 7 days for demo.example.com",
      timestamp: "1 hour ago",
      status: "warning",
    },
    {
      id: 4,
      type: "admin_login",
      message: "Admin user John Doe logged in",
      timestamp: "2 hours ago",
      status: "info",
    },
  ]);

  useEffect(() => {
    // Simulate loading stats (replace with actual API calls)
    setStats({
      totalTenants: 24,
      activeTenants: 18,
      totalRevenue: 48750,
      monthlyGrowth: 12.5,
      systemHealth: 99.9,
      activeAdmins: 5,
    });
  }, []);

  const statCards = [
    {
      title: "Total Tenants",
      value: stats.totalTenants,
      change: "+3",
      changeType: "increase",
      icon: BuildingOfficeIcon,
      color: "teal",
    },
    {
      title: "Active Tenants",
      value: stats.activeTenants,
      change: "+2",
      changeType: "increase",
      icon: UsersIcon,
      color: "blue",
    },
    {
      title: "Monthly Revenue",
      value: `$${stats.totalRevenue.toLocaleString()}`,
      change: `+${stats.monthlyGrowth}%`,
      changeType: "increase",
      icon: CreditCardIcon,
      color: "green",
    },
    {
      title: "System Health",
      value: `${stats.systemHealth}%`,
      change: "+0.1%",
      changeType: "increase",
      icon: ChartBarIcon,
      color: "purple",
    },
  ];

  const getStatusIcon = (status) => {
    switch (status) {
      case "warning":
        return <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />;
      case "success":
        return <div className="h-2 w-2 bg-green-500 rounded-full"></div>;
      case "info":
        return <div className="h-2 w-2 bg-blue-500 rounded-full"></div>;
      default:
        return <div className="h-2 w-2 bg-gray-400 rounded-full"></div>;
    }
  };

  const getColorClasses = (color) => {
    const colors = {
      teal: "from-teal-500 to-teal-600",
      blue: "from-blue-500 to-blue-600",
      green: "from-green-500 to-green-600",
      purple: "from-purple-500 to-purple-600",
    };
    return colors[color] || colors.teal;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">
          Overview of your SaaS platform performance
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <div key={index} className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stat.value}
                </p>
                <div className="flex items-center mt-2">
                  {stat.changeType === "increase" ? (
                    <ArrowUpIcon className="h-4 w-4 text-green-500 mr-1" />
                  ) : (
                    <ArrowDownIcon className="h-4 w-4 text-red-500 mr-1" />
                  )}
                  <span
                    className={`text-sm font-medium ${
                      stat.changeType === "increase"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {stat.change}
                  </span>
                  <span className="text-sm text-gray-500 ml-1">
                    vs last month
                  </span>
                </div>
              </div>
              <div
                className={`h-12 w-12 rounded-lg bg-gradient-to-r ${getColorClasses(
                  stat.color
                )} flex items-center justify-center`}
              >
                <stat.icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Recent Activity
            </h3>
            <button className="text-sm text-teal-600 hover:text-teal-700">
              View all
            </button>
          </div>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-shrink-0 mt-1">
                  {getStatusIcon(activity.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{activity.message}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {activity.timestamp}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Quick Actions
          </h3>
          <div className="space-y-3">
            <button className="w-full text-left p-3 bg-teal-50 hover:bg-teal-100 rounded-lg border border-teal-200 transition-colors duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-teal-900">Create New Tenant</p>
                  <p className="text-sm text-teal-600">
                    Add a new tenant account
                  </p>
                </div>
                <BuildingOfficeIcon className="h-5 w-5 text-teal-600" />
              </div>
            </button>

            <button className="w-full text-left p-3 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-blue-900">Add System Admin</p>
                  <p className="text-sm text-blue-600">Create new admin user</p>
                </div>
                <UsersIcon className="h-5 w-5 text-blue-600" />
              </div>
            </button>

            <button className="w-full text-left p-3 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-green-900">
                    View Billing Reports
                  </p>
                  <p className="text-sm text-green-600">
                    Check revenue and payments
                  </p>
                </div>
                <CreditCardIcon className="h-5 w-5 text-green-600" />
              </div>
            </button>

            <button className="w-full text-left p-3 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-purple-900">
                    System Analytics
                  </p>
                  <p className="text-sm text-purple-600">View usage metrics</p>
                </div>
                <ChartBarIcon className="h-5 w-5 text-purple-600" />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          System Status
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="h-3 w-3 bg-green-500 rounded-full mx-auto mb-2"></div>
            <p className="text-sm font-medium text-green-900">API Status</p>
            <p className="text-xs text-green-600">Operational</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="h-3 w-3 bg-green-500 rounded-full mx-auto mb-2"></div>
            <p className="text-sm font-medium text-green-900">Database</p>
            <p className="text-xs text-green-600">Healthy</p>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="h-3 w-3 bg-yellow-500 rounded-full mx-auto mb-2"></div>
            <p className="text-sm font-medium text-yellow-900">
              SSL Certificates
            </p>
            <p className="text-xs text-yellow-600">2 expiring soon</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
