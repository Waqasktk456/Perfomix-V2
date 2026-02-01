import React from "react";
import { useLocation } from "react-router-dom";
import "./employee-viewprofile.css";
// import Profile1 from '../../assets/images/profile1.png';

const EmployeeViewProfile = () => {
  const location = useLocation();
  let employee = location.state?.employee;

  if (!employee) {
    // Fallback to localStorage
    const saved = localStorage.getItem('selectedEmployee');
    if (saved) {
      employee = JSON.parse(saved);
    }
  }

  // Function to get initials from name
  const getInitials = (name) => {
    if (!name) return 'NA';
    const parts = name.split(' ');
    return parts.map(part => part[0]).join('').toUpperCase();
  };

  // Function to render profile image or initials
  const renderProfileImage = () => {
    if (employee?.profilePic) {
      return (
        <img 
          src={employee.profilePic} 
          className="employee-profile-pic" 
          alt={employee.name} 
        />
      );
    } else {
      return (
        <div className="employee-profile-initials">
          {getInitials(employee?.name)}
        </div>
      );
    }
  };

  if (!employee) {
    return <div style={{ padding: 40, textAlign: 'center' }}>No employee data found.</div>;
  }

  return (
    <>
      {/* Breadcrumb Navigation */}
      <nav className="employee-breadcrumb">
        <span>Performance Evaluation &gt; </span>
        <span className="employee-breadcrumb-active">View Profile</span>
      </nav>

      {/* Profile Section */}
      <div className="employee-profile-card">
        {renderProfileImage()}
        <h2 className="employee-profile-name">{employee.name}</h2>
        <div className="employee-profile-details">
          <div className="employee-profile-role employee-profile-primary">{employee.designation || 'N/A'}</div>
          <div className="employee-profile-role employee-profile-secondary">{employee.department || 'N/A'}</div>
          <div className="employee-profile-role employee-profile-primary">{employee.id || 'N/A'}</div>
          {/* Add more fields as needed */}
        </div>
      </div>
    </>
  );
};

export default EmployeeViewProfile;
