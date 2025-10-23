import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  HomeIcon,
  BuildingOfficeIcon,
  UsersIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  Cog6ToothIcon,
  CreditCardIcon,
  ChartBarIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";

const Sidebar = () => {
  const location = useLocation();

  const navigation = [
    // {
    //   name: "Dashboard",
    //   href: "/dashboard",
    //   icon: HomeIcon,
    //   description: "Overview and analytics",
    // },
    {
      name: "Tenants",
      href: "/tenants",
      icon: BuildingOfficeIcon,
      description: "Manage tenant accounts",
    },
    {
      name: "System Admins",
      href: "/admins",
      icon: UsersIcon,
      description: "Admin user management",
    },
    {
      name: "Billing",
      href: "/billing",
      icon: CreditCardIcon,
      description: "Payment and subscriptions",
    },
    // {
    //   name: "CORS Origins",
    //   href: "/cors",
    //   icon: GlobeAltIcon,
    //   description: "Cross-origin settings",
    // },
    // {
    //   name: "SSL Certificates",
    //   href: "/ssl",
    //   icon: ShieldCheckIcon,
    //   description: "Security certificates",
    // },
    // {
    //   name: "Environment",
    //   href: "/environment",
    //   icon: Cog6ToothIcon,
    //   description: "Environment variables",
    // },
    // {
    //   name: "Analytics",
    //   href: "/analytics",
    //   icon: ChartBarIcon,
    //   description: "Usage and metrics",
    // },
    // {
    //   name: "Logs",
    //   href: "/logs",
    //   icon: DocumentTextIcon,
    //   description: "System activity logs",
    // },
  ];

  return (
    <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:border-r lg:border-gray-200 lg:bg-white lg:pt-20">
      <div className="flex flex-col flex-grow pt-6 pb-4 overflow-y-auto">
        {/* <div className="flex items-center flex-shrink-0 px-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Navigation</h2>
        </div> */}
        <nav className="mt-2 flex-1 px-3 space-y-1">
          {navigation.map((item) => {
            const isActive =
              location.pathname === item.href ||
              (item.href !== "/dashboard" &&
                location.pathname.startsWith(item.href));

            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-teal-500 to-teal-600 text-white"
                    : "text-gray-600 hover:bg-teal-50 hover:text-teal-600"
                }`}
              >
                <item.icon
                  className={`mr-3 h-5 w-5 flex-shrink-0 ${
                    isActive
                      ? "text-white"
                      : "text-gray-400 group-hover:text-teal-500"
                  }`}
                />
                <div className="flex-1">
                  <div
                    className={`font-medium ${isActive ? "text-white" : ""}`}
                  >
                    {item.name}
                  </div>
                  <div
                    className={`text-xs ${
                      isActive
                        ? "text-teal-100"
                        : "text-gray-500 group-hover:text-teal-500"
                    }`}
                  >
                    {item.description}
                  </div>
                </div>
              </NavLink>
            );
          })}
        </nav>

        {/* Quick Stats Card */}
        {/* <div className="mx-3 mt-6 p-4 bg-gradient-to-r from-blue-50 to-teal-50 rounded-lg border border-blue-200">
          <h3 className="text-sm font-medium text-gray-900 mb-2">
            Quick Stats
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Active Tenants</span>
              <span className="font-medium text-teal-600">12</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Total Revenue</span>
              <span className="font-medium text-blue-600">$24,560</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">System Health</span>
              <span className="font-medium text-green-600">99.9%</span>
            </div>
          </div>
        </div> */}

        {/* Support Section */}
        {/* <div className="mx-3 mt-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="text-xs font-medium text-gray-900 mb-2">Need Help?</h4>
          <button className="w-full text-xs text-teal-600 hover:text-teal-700 text-left">
            📖 Documentation
          </button>
          <button className="w-full text-xs text-teal-600 hover:text-teal-700 text-left mt-1">
            💬 Contact Support
          </button>
        </div> */}
      </div>
    </div>
  );
};

export default Sidebar;
