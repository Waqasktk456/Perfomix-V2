import React, { useState } from "react";
import axios from "axios";
import "../Admin Settings/change-password.css"
import passwordIllustration from "../../assets/images/change-password.png";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const SetPassword = () => {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({ newPassword: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const validatePassword = (password) => {
    const minLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    
    if (!minLength) return "Password must be at least 8 characters long";
    if (!hasUpperCase) return "Password must contain at least one uppercase letter";
    if (!hasLowerCase) return "Password must contain at least one lowercase letter";
    if (!hasNumber) return "Password must contain at least one number";
    
    return "";
  };

  const handleSetPassword = async () => {
    let newErrors = { newPassword: "", confirmPassword: "" };
    setSuccessMessage("");

    // Validation
    if (!newPassword) {
      newErrors.newPassword = "Password is required";
    } else {
      const passwordError = validatePassword(newPassword);
      if (passwordError) {
        newErrors.newPassword = passwordError;
      }
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);

    // If there are errors, stop here
    if (Object.values(newErrors).some(error => error !== "")) {
      return;
    }

    // Make API call to set password
    setLoading(true);
    try {
      const userId = localStorage.getItem('userId');
      const userRole = localStorage.getItem('userRole');
      
      if (!userId) {
        alert('User not logged in');
        setLoading(false);
        return;
      }

      const endpoint = userRole === 'admin' 
        ? `http://localhost:5000/api/auth/users/${userId}/set-password`

        : `http://localhost:5000/api/auth/employees/${userId}/set-password`;

      const response = await axios.post(endpoint, {
        newPassword
      });

      if (response.data.success) {
        setSuccessMessage("Password set successfully! You can now use Change Password feature.");
        // Clear form
        setNewPassword("");
        setConfirmPassword("");
        
        // Redirect to change password page after 2 seconds
        setTimeout(() => {
          alert("Password set successfully! Redirecting to settings...");
          navigate('/admin-profile');
        }, 2000);
      }
    } catch (error) {
      console.error('Set password error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to set password';
      setErrors({ ...newErrors, newPassword: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="change-password-wrapper">
      <div className="illustration">
        <img src={passwordIllustration} alt="Set Password" />
      </div>
      <div className="password-form">
        <h2 className="form-title">Set Password</h2>
        <p style={{ color: '#666', marginBottom: '1.5rem' }}>
          You logged in via Google. Set a password to enable password-based login and password changes.
        </p>
        
        {successMessage && (
          <div className="success-message">
            {successMessage}
          </div>
        )}

        {/* New Password Field */}
        <div className="input-group">
          <label>New Password *</label>
          <div className="password-input">
            <input
              type={showPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter your new password"
            />
            <span className="eye-icon" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>
          {errors.newPassword && <p className="error-message">{errors.newPassword}</p>}
          <p className="password-hint">
            Must be at least 8 characters with uppercase, lowercase, and number
          </p>
        </div>

        {/* Confirm Password Field */}
        <div className="input-group">
          <label>Confirm Password *</label>
          <div className="password-input">
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your new password"
            />
            <span className="eye-icon" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>
          {errors.confirmPassword && <p className="error-message">{errors.confirmPassword}</p>}
        </div>

        <button 
          className="change-btn" 
          onClick={handleSetPassword}
          disabled={loading}
        >
          {loading ? 'Setting Password...' : 'Set Password'}
        </button>
        
        <button 
          className="change-btn" 
          style={{ backgroundColor: '#6c757d', marginTop: '10px' }}
          onClick={() => navigate('/dashboard/settings')}
          disabled={loading}
        >
          Back to Settings
        </button>
      </div>
    </div>
  );
};

export default SetPassword;