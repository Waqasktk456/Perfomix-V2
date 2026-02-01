import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/images/logo.png";
import "./OrganizationSelection.css";
import QuoteImg from "../../assets/images/quotesIcon.png";
import Illustration from "../../assets/images/SignupImg.png";

const OrganizationSelection = () => {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState("");

  useEffect(() => {
    // Load organizations from localStorage or API
    const savedOrgs = JSON.parse(localStorage.getItem('organizations')) || [];
    setOrganizations(savedOrgs);
  }, []);

  const handleContinue = () => {
    if (!selectedOrg) {
      alert("Please select an organization");
      return;
    }

    // Save the selected organization
    const selectedOrganization = organizations.find(org => org.regNo === selectedOrg);
    localStorage.setItem('currentOrganization', JSON.stringify(selectedOrganization));
    
    // Navigate to dashboard
    navigate('/dashboard');
  };

  const handleAddOrganization = () => {
    navigate('/add-organization');
  };

  return (
    <div className="org-selection-container">
      {/* Left Side */}
      <div className="org-left-side">
        <div className="org-quote-container">
          <div className="org-quote-circle">
            <img src={QuoteImg} alt="Quote Icon" className="org-quote-icon" />
          </div>
          <div>
            <blockquote className="org-quote">
              Empowering organizations to achieve excellence through Perfomix
            </blockquote>
          </div>
        </div>
        <img src={Illustration} alt="Illustration" className="org-illustration" />
      </div>
      
      {/* Right Side */}
      <div className="org-right-side">
        <img src={logo} alt="Perfomix Logo" className="org-logo" />
        
        <h2 className="org-welcome">Welcome to Perfomix</h2>
        <h3 className="org-username">Mr. Ali</h3>
        <h4 className="org-select-title">Select the Organization</h4>
        <p className="org-subtitle">Select the organization you want to proceed with.</p>
        
        <div className="org-dropdown-container">
          <label htmlFor="organization" className="org-label">Select Organization</label>
          <select 
            id="organization" 
            className="org-dropdown"
            value={selectedOrg}
            onChange={(e) => setSelectedOrg(e.target.value)}
          >
            <option value="">Select an Option</option>
            {organizations.map((org) => (
              <option key={org.regNo} value={org.regNo}>
                {org.name}
              </option>
            ))}
          </select>
        </div>
        
        <div className="org-buttons">
          <button className="org-add-btn" onClick={handleAddOrganization}>Add Organization</button>
          <button className="org-continue-btn" onClick={handleContinue}>Continue</button>
        </div>
      </div>
    </div>
  );
};

export default OrganizationSelection;