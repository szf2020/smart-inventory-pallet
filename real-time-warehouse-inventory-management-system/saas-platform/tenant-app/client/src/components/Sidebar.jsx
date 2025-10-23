import React, { useState, useContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import {
  Squares2X2Icon,
  CubeIcon,
  TruckIcon,
  PercentBadgeIcon,
  DocumentChartBarIcon,
  UserGroupIcon,
  QuestionMarkCircleIcon,
  ArrowRightOnRectangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CreditCardIcon,
  TagIcon,
  CurrencyDollarIcon,
} from "@heroicons/react/24/outline";

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { currentUser } = useContext(AuthContext);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Function to check if user has permission for a specific tab
  const hasTabPermission = (tabKey) => {
    // Debug: log current user structure
    console.log("Current User in Sidebar:", currentUser);

    // If no user is logged in, deny access
    if (!currentUser) return false;

    // Priority 1: Check if user has a role with tab permissions (use actual role data)
    if (currentUser.userRole && currentUser.userRole.tab_permissions) {
      return currentUser.userRole.tab_permissions[tabKey] === true;
    }

    // Priority 2: If user has the legacy admin role and no userRole data, grant access to everything
    if (currentUser.role === "admin" && !currentUser.userRole) return true;

    // Fallback: allow dashboard and help for all users
    return tabKey === "dashboard" || tabKey === "help";
  };

  const menuItems = [
    {
      icon: <Squares2X2Icon className="w-5 h-5" />,
      label: "Dashboard",
      url: "/",
      tabKey: "dashboard",
    },
    {
      icon: <Squares2X2Icon className="w-5 h-5" />,
      label: "Real-time Inventory",
      url: "/bottle-scale",
      tabKey: "bottle_scale",
    },
    {
      icon: <CubeIcon className="w-5 h-5" />,
      label: "Stock",
      url: "/inventory-management",
      tabKey: "stock",
    },
    {
      icon: <TruckIcon className="w-5 h-5" />,
      label: "Loading",
      hasDropdown: false,
      url: "/loading-management",
      tabKey: "loading",
    },
    {
      icon: <PercentBadgeIcon className="w-5 h-5" />,
      label: "Discounts",
      url: "/discounts",
      tabKey: "discounts",
    },

    // {
    //   icon: <TagIcon className="w-5 h-5" />,
    //   label: "Promotions",
    //   url: "/promotions",
    //   tabKey: "promotions",
    // },

    {
      icon: <CreditCardIcon className="w-5 h-5" />,
      label: "Finance",
      url: "/finance",
      tabKey: "credits",
    },
    {
      icon: <CurrencyDollarIcon className="w-5 h-5" />,
      label: "Expenses",
      url: "/expenses",
      tabKey: "expenses",
    },
    {
      icon: <DocumentChartBarIcon className="w-5 h-5" />,
      label: "Reports",
      url: "/reports",
      tabKey: "reports",
    },
    {
      icon: <UserGroupIcon className="w-5 h-5" />,
      label: "Manage",
      url: "/manage",
      tabKey: "manage",
    },
    // {
    //   icon: <UserGroupIcon className="w-5 h-5" />,
    //   label: "Representatives",
    //   url: "/rep-management",
    //   tabKey: "representatives",
    // },
    {
      icon: <UserGroupIcon className="w-5 h-5" />,
      label: "Users & Roles",
      url: "/user-management",
      tabKey: "users_roles",
    },
  ];

  const bottomMenuItems = [
    // {
    //   icon: <QuestionMarkCircleIcon className="w-5 h-5" />,
    //   label: "Help",
    //   url: "/help",
    //   tabKey: "help",
    // },
  ];

  // Filter menu items based on user permissions
  const filteredMenuItems = menuItems;
  const filteredBottomMenuItems = bottomMenuItems;

  const handleLogout = () => {
    // Remove token from localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    // Redirect to login page
    navigate("/login");
  };

  return (
    <div
      className={`bg-white flex flex-col shadow h-full relative transition-all duration-300 pt-20 ${
        isCollapsed ? "w-16" : "w-52"
      }`}
    >
      {/* Toggle button */}
      <button
        className="absolute -right-3 top-[76px] bg-white rounded-full p-1 shadow-md hover:bg-gray-100 z-10"
        onClick={toggleSidebar}
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? (
          <ChevronRightIcon className="w-4 h-4 text-gray-600" />
        ) : (
          <ChevronLeftIcon className="w-4 h-4 text-gray-600" />
        )}
      </button>

      {/* Logo section - uncomment if needed
      <div className="p-4">
        <div className="flex items-center">
          <span className="text-2xl font-bold text-blue-400">
            {isCollapsed ? "C" : "C&H"}
          </span>
        </div>
        {!isCollapsed && (
          <div className="text-blue-400 font-semibold">DISTRIBUTORS</div>
        )}
      </div> */}

      <nav className="flex-1 mt-4">
        <ul>
          {filteredMenuItems.map((item, index) => {
            let isActive = location.pathname === item.url;
            if (location.pathname === "/dashboard") {
              isActive = item.url === "/";
            }

            return (
              <li key={index}>
                <a
                  href={item.url}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(item.url);
                  }}
                  className={`flex items-center px-4 py-3 hover:bg-gray-100 rounded-r-lg transition ${
                    isActive
                      ? "bg-blue-100 text-blue-600 font-semibold"
                      : "text-gray-700"
                  }`}
                  title={isCollapsed ? item.label : ""}
                >
                  <span className={isCollapsed ? "mx-auto" : "mr-3"}>
                    {item.icon}
                  </span>
                  {!isCollapsed && <span>{item.label}</span>}
                  {!isCollapsed && item.hasDropdown && (
                    <span className="ml-auto">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </span>
                  )}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t mt-auto">
        <ul>
          {filteredBottomMenuItems.map((item, index) => (
            <li key={index}>
              <a
                href={item.url}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(item.url);
                }}
                className="flex items-center px-4 py-3 hover:bg-gray-100"
                title={isCollapsed ? item.label : ""}
              >
                <span className={isCollapsed ? "mx-auto" : "mr-3"}>
                  {item.icon}
                </span>
                {!isCollapsed && <span>{item.label}</span>}
              </a>
            </li>
          ))}
          <li>
            <button
              onClick={handleLogout}
              className="flex items-center px-4 py-3 hover:bg-gray-100 w-full text-left"
              title={isCollapsed ? "Logout" : ""}
            >
              <span className={isCollapsed ? "mx-auto" : "mr-3"}>
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
              </span>
              {!isCollapsed && <span>Logout</span>}
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Sidebar;
