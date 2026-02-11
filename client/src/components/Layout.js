import React, { useEffect, useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import "./Layout.css";
import logo from "../assets/images/logo.png";
import notificationIcon from "../assets/images/notification.png";
import profilePic from "../assets/images/profile.png";
import '../styles/typography.css'

import SearchBar from "./Searchbar/Searchbar";
import NotificationBell from "./NotificationBell";
import { DashboardIcon, DepartmentIcon, EmployeesIcon, LogoutIcon, NOtificationIcon, OrganizationIcon, PerformanceEvaluationIcon, PerformanceMatrixIcon, PerformanceReportIcon, ProfileSideBar, SettingIcon, Teamicon } from "../assets";

const Layout = () => {
  const [role, setRole] = useState("");
  const [userName, setUserName] = useState("");
  const [userPicture, setUserPicture] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    // Get user data from localStorage
    const token = localStorage.getItem("token");
    const storedRole = localStorage.getItem("userRole");
    const storedName = localStorage.getItem("userName");
    const storedPicture = localStorage.getItem("userPicture");
    const storedEmail = localStorage.getItem("userEmail");

    if (!token) {
      navigate('/login');
      return;
    }

    console.log("Layout - Current data:", {
      role: storedRole,
      name: storedName,
      picture: storedPicture,
      email: storedEmail
    });

    setRole(storedRole);
    setUserName(storedName);
    setUserPicture(storedPicture);

    // Add event listener for storage changes
    const handleStorageChange = () => {
      const updatedRole = localStorage.getItem("userRole");
      const updatedName = localStorage.getItem("userName");
      const updatedPicture = localStorage.getItem("userPicture");
      const updatedEmail = localStorage.getItem("userEmail");

      console.log("Layout - Data updated:", {
        role: updatedRole,
        name: updatedName,
        picture: updatedPicture,
        email: updatedEmail
      });

      setRole(updatedRole);
      setUserName(updatedName);
      setUserPicture(updatedPicture);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('profileUpdate', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('profileUpdate', handleStorageChange);
    };
  }, []);

  // Debug log for role changes
  useEffect(() => {
    console.log("Layout - Role state updated:", role);
  }, [role]);

  const handleLogout = () => {
    // Clear all user data from localStorage
    localStorage.removeItem("userRole");
    localStorage.removeItem("userName");
    localStorage.removeItem("userPicture");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("token"); // If you're using JWT or other token-based auth

    // Reset state
    setRole("");
    setUserName("");
    setUserPicture("");

    // Redirect to login page
    navigate("/login");
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <img src={logo} alt="Logo" className="logo" />
        </div>

        <ul className="menu">
          <NavLink
            to={role?.toLowerCase() === "staff" ? "/staff-dashboard" : role?.toLowerCase() === "line-manager" ? "/linemanager-dashboard" : "/dashboard"}
            className="menu-item"
          >
            <img src={DashboardIcon} alt="Dashboard" className="icon" />
            Dashboard
          </NavLink>

          {/* Admin-Specific Menu */}
          {role && role.toLowerCase() === "admin" && (
            <>
              <NavLink to="/organization" className="menu-item">
                <img src={OrganizationIcon} alt="Organization" className="icon" /> Organization
              </NavLink>
              <NavLink to="/departments" className="menu-item">
                <img src={DepartmentIcon} alt="Departments" className="icon" /> Departments
              </NavLink>
              <NavLink to="/teams" className="menu-item">
                <img src={Teamicon} alt="teams" className="icon" /> Teams
              </NavLink>
              <NavLink to="/employees" className="menu-item">
                <img src={EmployeesIcon} alt="Employees" className="icon" /> Employees
              </NavLink>
              <NavLink to="/performance-matrix" className="menu-item">
                <img src={PerformanceMatrixIcon} alt="Performance Matrix" className="icon" /> Performance Matrix
              </NavLink>
              <NavLink to="evaluation-cycle" className="menu-item">
                <img src={PerformanceEvaluationIcon} alt="Evaluation Cycle" className="icon" />Evaluation Cycle
              </NavLink>
              <NavLink to="/linemanager-evaluation" className="menu-item">
                <img src={PerformanceEvaluationIcon} alt="Line Manager Evaluation" className="icon" /> Line Manager Evaluation
              </NavLink>


              <NavLink to="/performance-report" className="menu-item">
                <img src={PerformanceReportIcon} alt="Performance Report" className="icon" /> Performance Report
              </NavLink>
              {/* TODO: Notification functionality will be implemented in future updates */}
              {/* Temporarily removed notification menu item for admin */}
              <NavLink to="/admin-profile" className="menu-item">
                <img src={SettingIcon} alt="Settings" className="icon" /> Profile
              </NavLink>
            </>
          )}

          {/* Line Manager-Specific Menu */}
          {role && role.toLowerCase() === "line-manager" && (
            <>
              <NavLink to="/linemanager-performance" className="menu-item">
                <img src={PerformanceEvaluationIcon} alt="Settings" className="icon" /> My Performance
              </NavLink>
              <NavLink to="/linemanager-setting" className="menu-item">
                <img src={SettingIcon} alt="Settings" className="icon" /> Profile
              </NavLink>
            </>
          )}

          {/* Staff-Specific Menu */}
          {role && role.toLowerCase() === "staff" && (
            <>
              <NavLink to="/staff-setting" className="menu-item">
                <img src={SettingIcon} alt="Settings" className="icon" /> Profile
              </NavLink>
            </>
          )}

          {/* Common Menu Items */}
          <div onClick={handleLogout} className="menu-item logout" style={{ cursor: 'pointer' }}>
            <img src={LogoutIcon} alt="Logout" className="icon" /> Logout
          </div>
        </ul>
      </div>

      {/* Main content area */}
      <div className="main-container">
        <div className="header">
          <SearchBar />
          {/* Icons and Profile Section */}
          <div className="header-right">
            <NotificationBell />
            <span className="language">English ▼</span>
            <div className="profile">
              {userPicture ? (
                <img
                  src={
                    userPicture?.startsWith('/uploads')
                      ? `http://localhost:5000${userPicture}`
                      : userPicture || profilePic
                  }
                  alt="Profile"
                  className="profile-pic"
                  style={{ width: '40px', height: '40px', borderRadius: '50%' }}
                />
              ) : (
                <div
                  className="profile-pic"
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--primary-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: 'bold'
                  }}
                >
                  {(() => {
                    const name = userName || localStorage.getItem('userEmail')?.split('@')[0] || "User";
                    const nameParts = name.split(' ');
                    if (nameParts.length >= 2) {
                      return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
                    }
                    return name[0].toUpperCase();
                  })()}
                </div>
              )}
              <div className="profile-text">
                <span className="profile-text-name">
                  {userName || localStorage.getItem('userEmail')?.split('@')[0] || "User"}
                </span>
                <span className="role">{role}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default Layout;