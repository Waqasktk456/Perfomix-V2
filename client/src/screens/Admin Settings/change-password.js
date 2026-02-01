import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./change-password.css";
import passwordIllustration from "../../assets/images/change-password.png";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { toast } from "react-toastify";

const ChangePassword = () => {
  const navigate = useNavigate();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [errors, setErrors] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [hasPassword, setHasPassword] = useState(true);
  const [checkingPassword, setCheckingPassword] = useState(true);

  // Check if user has a password when component loads
  // Updated ChangePassword component useEffect:

  useEffect(() => {
    console.log('ChangePassword mounted - checking password');

    const checkIfPasswordExists = async () => {
      try {
        const userId = localStorage.getItem('userId');
        const userRole = localStorage.getItem('userRole');
        const token = localStorage.getItem('token');

        console.log('User ID:', userId, 'Role:', userRole, 'Token:', token ? 'Exists' : 'Missing');

        if (!userId || !token) {
          console.log('No user ID or token found');
          navigate('/login');
          return;
        }

        // Try different endpoints - check what your backend actually provides
        let endpoint;

        // Option 1: Based on your login flow
        if (userRole === 'admin') {
          // Try this endpoint first - adjust based on your actual API
          endpoint = `http://localhost:5000/api/users/${userId}`;
          // OR endpoint = `http://localhost:5000/api/admin/${userId}`;
        } else if (userRole === 'employee' || userRole === 'staff') {
          endpoint = `http://localhost:5000/api/employees/${userId}`;
        } else if (userRole === 'linemanager') {
          endpoint = `http://localhost:5000/api/linemanagers/${userId}`;
        } else {
          // Default fallback
          endpoint = `http://localhost:5000/api/user/${userId}`;
        }

        console.log('Trying endpoint:', endpoint);

        // Add authorization header
        const response = await axios.get(endpoint, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        console.log('API Response:', response.data);

        // Check different possible response structures
        const userData = response.data.data || response.data.user || response.data;

        console.log('User data:', userData);

        // Check for password field - try different possible field names
        let passwordExists = false;

        if (userRole === 'admin') {
          passwordExists = !!(userData.password || userData.user_password || userData.hash);
        } else {
          // For employees/linemanagers
          passwordExists = !!(userData.user_password || userData.password || userData.hash);
        }

        console.log('Password exists:', passwordExists);

        setHasPassword(passwordExists);

        if (!passwordExists) {
          console.log('No password - redirecting to set-password');
          navigate('/set-password');
        }
      } catch (error) {
        console.error('Error details:', error.response?.status, error.response?.data);

        // If 401 Unauthorized, redirect to login
        if (error.response?.status === 401) {
          navigate('/login');
          return;
        }

        // If endpoint not found, try a different approach
        console.log('Trying alternative approach...');

        // Alternative: Check localStorage or session data
        const userInfo = localStorage.getItem('userInfo');
        if (userInfo) {
          const parsedInfo = JSON.parse(userInfo);
          console.log('User info from localStorage:', parsedInfo);

          // Check if user logged in with Google
          const isGoogleLogin = localStorage.getItem('googleLogin') === 'true' ||
            parsedInfo.googleId ||
            parsedInfo.login_method === 'google';

          if (isGoogleLogin && !parsedInfo.password) {
            console.log('Google login detected without password');
            setHasPassword(false);
            navigate('/set-password');
          } else {
            // Assume password exists for non-Google logins
            setHasPassword(true);
          }
        } else {
          // Couldn't determine, assume password exists to avoid redirect loop
          console.log('Could not determine password status, defaulting to hasPassword=true');
          setHasPassword(true);
        }
      } finally {
        setCheckingPassword(false);
      }
    };

    checkIfPasswordExists();
  }, [navigate]);

  const validatePassword = (password) => {
    // Password requirements: at least 8 characters, 1 uppercase, 1 lowercase, 1 number
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

  const handleChangePassword = async () => {
    let newErrors = { oldPassword: "", newPassword: "", confirmPassword: "" };
    setSuccessMessage("");

    // Validation
    if (!oldPassword) {
      newErrors.oldPassword = "Current password is required";
    }

    if (!newPassword) {
      newErrors.newPassword = "New password is required";
    } else {
      const passwordError = validatePassword(newPassword);
      if (passwordError) {
        newErrors.newPassword = passwordError;
      }
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your new password";
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (oldPassword && newPassword && oldPassword === newPassword) {
      newErrors.newPassword = "New password must be different from current password";
    }

    setErrors(newErrors);

    // If there are errors, stop here
    if (Object.values(newErrors).some(error => error !== "")) {
      return;
    }

    // Make API call to change password
    setLoading(true);
    try {
      const userId = localStorage.getItem('userId');
      const userRole = localStorage.getItem('userRole');

      console.log('Change Password Debug:', { userId, userRole }); // DEBUG LOG

      const token = localStorage.getItem('token');
      if (!userId || !token) {
        toast.error('User not logged in');
        setLoading(false);
        return;
      }

      const endpoint = `http://localhost:5000/api/users/${userId}/change-password`;

      console.log('API Endpoint:', endpoint); // DEBUG LOG
      console.log('Request Data:', { oldPassword: '***', newPassword: '***' }); // DEBUG LOG

      const response = await axios.post(
        endpoint,
        {
          oldPassword,
          newPassword
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      console.log('Response:', response.data); // DEBUG LOG

      if (response.data.success) {
        toast.success("Password changed successfully!");
        // Clear form
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");

        // Optional: Logout user after password change for security
        setTimeout(() => {
          toast.info("Logging out. Please login again with your new password.");
          setTimeout(() => {
            localStorage.clear();
            window.location.href = '/login';
          }, 2000);
        }, 1000);
      }
    } catch (error) {
      console.error('Full Error:', error); // DEBUG LOG
      console.error('Error Response:', error.response); // DEBUG LOG

      const errorMessage = error.response?.data?.message || error.message || 'Failed to change password';

      // Show error in the appropriate field
      if (errorMessage.includes('Current password') || errorMessage.includes('incorrect')) {
        setErrors({ ...newErrors, oldPassword: errorMessage });
      } else if (errorMessage.includes('Google login') || errorMessage.includes('No password')) {
        setErrors({ ...newErrors, oldPassword: errorMessage });
      } else {
        setErrors({ ...newErrors, newPassword: errorMessage });
      }
    } finally {
      setLoading(false);
    }
  };

  if (checkingPassword) {
    return (
      <div className="change-password-wrapper">
        <div className="password-form">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!hasPassword) {
    return (
      <div className="change-password-wrapper">
        <div className="password-form">
          <h2 className="form-title">No Password Set</h2>
          <p style={{ marginBottom: '1rem' }}>
            You logged in via Google and haven't set a password yet.
          </p>
          <button
            className="change-btn"
            onClick={() => navigate('/set-password')}
          >
            Set Password Now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="change-password-wrapper">
      <div className="illustration">
        <img src={passwordIllustration} alt="Change Password" />
      </div>
      <div className="password-form">
        <h2 className="form-title">Change Password</h2>

        {successMessage && (
          <div className="success-message">
            {successMessage}
          </div>
        )}

        {/* Current Password Field */}
        <div className="input-group">
          <label>Current Password *</label>
          <div className="password-input">
            <input
              type={showOldPassword ? "text" : "password"}
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="Enter your current password"
            />
            <span className="eye-icon" onClick={() => setShowOldPassword(!showOldPassword)}>
              {showOldPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>
          {errors.oldPassword && <p className="error-message">{errors.oldPassword}</p>}
        </div>

        {/* New Password Field */}
        <div className="input-group">
          <label>New Password *</label>
          <div className="password-input">
            <input
              type={showNewPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter your new password"
            />
            <span className="eye-icon" onClick={() => setShowNewPassword(!showNewPassword)}>
              {showNewPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>
          {errors.newPassword && <p className="error-message">{errors.newPassword}</p>}
          <p className="password-hint">
            Must be at least 8 characters with uppercase, lowercase, and number
          </p>
        </div>

        {/* Confirm Password Field */}
        <div className="input-group">
          <label>Confirm New Password *</label>
          <div className="password-input">
            <input
              type={showNewPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your new password"
            />
            <span className="eye-icon" onClick={() => setShowNewPassword(!showNewPassword)}>
              {showNewPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>
          {errors.confirmPassword && <p className="error-message">{errors.confirmPassword}</p>}
        </div>

        <button
          className="change-btn"
          onClick={handleChangePassword}
          disabled={loading}
        >
          {loading ? 'Changing...' : 'Change Password'}
        </button>
      </div>
    </div>
  );
};

export default ChangePassword;