import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import "./view-profile.css";

const ViewProfile = () => {
  const location = useLocation();
  let initialEmployee = location.state?.employee;

  if (!initialEmployee) {
    const saved = localStorage.getItem('selectedEmployee');
    if (saved) {
      initialEmployee = JSON.parse(saved);
    }
  }

  const [employee, setEmployee] = useState(initialEmployee);
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    // Only fetch if not already fetched and employee exists and key info is missing
    if (
      employee &&
      !fetched &&
      (!employee.email && !employee.Email)
    ) {
      setFetched(true); // Prevent further fetches
      axios.get(`http://localhost:5000/api/employees/${employee.id}`)
        .then(res => {
          setEmployee(prev => ({
            ...prev,
            ...res.data // adjust if your API response is wrapped
          }));
        })
        .catch(() => {
          // Optionally handle error
        });
    }
  }, [employee, fetched]);

  if (!employee) {
    return <div style={{ padding: 40, textAlign: 'center' }}>No employee data found.</div>;
  }

  return (
    <>
      {/* Breadcrumb Navigation */}
      <nav className="breadcrumb">
        <span>Performance Report &gt; </span>
        <span className="active">View Profile</span>
      </nav>

      {/* Profile Section */}
      <div className="unique-profile-card">
        <img
          src={
            (employee.profile || employee.Profile_image || employee.picture)?.startsWith('/uploads')
              ? `http://localhost:5000${employee.profile || employee.Profile_image || employee.picture}`
              : employee.profile || employee.Profile_image || employee.picture || "profile-placeholder.jpg"
          }
          className="unique-profile-pic"
          alt="Profile"
        />
        <h2 className="unique-profile-name">{
          employee.name || `${employee.First_name || ''} ${employee.Last_name || ''}`
        }</h2>
        <div className="unique-profile-details">
          <div className="unique-profile-role unique-profile-primary">{
            employee.designation || employee.Designation || ''
          }</div>
          <div className="unique-profile-role unique-profile-secondary">{
            employee.role || employee.Role || ''
          }</div>
          <div className="unique-profile-role unique-profile-primary">{
            employee.department || employee.Department_name || ''
          }</div>
          <div className="unique-profile-role unique-profile-secondary">{
            employee.organization || employee.Organization || employee.Organization_name || ''
          }</div>
          <div className="unique-profile-role unique-profile-secondary">{
            employee.email || employee.Email || ''
          }</div>
        </div>
      </div>
    </>
  );
};

export default ViewProfile; 