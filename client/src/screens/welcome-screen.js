import React from 'react';
import { useNavigate } from 'react-router-dom';
import logo from "../assets/images/logo.png";
import './welcome-screen.css';
import { NoDepartmentImg } from '../assets';

const WelcomeScreen = () => {
  const navigate = useNavigate();

  return (
    <div className="welcome-container">
      <img src={logo} alt="Perfomix Logo" className="welcome-logo" />
      
      <div className="welcome-content">
        <h1>👋 Welcome to Perfomix Admin</h1>
        <p className="welcome-subtitle">Add your organization to unlock all features.</p>
        
        <div className="welcome-icon-container">
          <div className="welcome-icon">
            <img src={NoDepartmentImg} alt="No Department" className="welcome-icon-img" />
          </div>
        </div>

        <button 
          className="add-org-button"
          onClick={() => navigate('/add-organization')}
        >
          Add Organization
        </button>
      </div>
    </div>
  );
};

export default WelcomeScreen; 