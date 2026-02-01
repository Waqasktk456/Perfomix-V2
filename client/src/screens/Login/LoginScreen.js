import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import axios from "axios";
import { jwtDecode } from "jwt-decode";


import "./LoginScreen.css";
import SignupImg from "../../assets/images/SignupImg.png";
import QuoteImg from "../../assets/images/quotesIcon.png";
import logo from "../../assets/images/logo.png";
import Googleicon from "../../assets/images/googleIcon.png";
import "../../styles/typography.css";

const LoginScreen = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // ===========================
  // HANDLE NORMAL LOGIN
  // ===========================
  const handleLogin = async () => {
    try {
      const response = await axios.post("http://localhost:5000/api/auth/login", {
        email,
        password,
      });

      if (!response.data.success) {
        alert(response.data.message || "Login failed");
        return;
      }

      const { role, token, employee, user, userId, hasOrganization } = response.data;

      // Decode JWT to extract organizationId
      const decoded = jwtDecode(token);
      const orgId = decoded.organizationId;

      // Store basic data
      localStorage.setItem("token", token);
      localStorage.setItem("userRole", role);
      localStorage.setItem("userName", user?.name || (employee ? `${employee.First_name} ${employee.Last_name}` : ""));
      localStorage.setItem("userEmail", email);
      localStorage.setItem("userId", userId);

      // Store employee ID
      if (employee?.Employee_id) {
        localStorage.setItem("employeeId", employee.Employee_id);
      }

      localStorage.setItem("userPicture", employee?.Profile_image || user?.picture || "");

      // Admin navigation
      if (role.toLowerCase() === "admin") {
        if (!hasOrganization) {
          navigate("/welcome-screen");
          return;
        }
        navigate("/dashboard");
        return;
      }

      // Other roles
      switch (role.toLowerCase()) {
        case "line-manager":
          navigate("/linemanager-dashboard");
          break;
        case "staff":
        default:
          navigate("/staff-dashboard");
          break;
      }
    } catch (error) {
      console.error("Login error:", error);
      alert(error.response?.data?.message || "Login failed. Please try again.");
    }
  };

  // ====================================================
  // GOOGLE LOGIN HANDLERS
  // ====================================================
  const handleGoogleLoginSuccess = async (credentialResponse) => {
    try {
      const { credential } = credentialResponse;

      const response = await axios.post("http://localhost:5000/api/auth/google", {
        token: credential,
      });

      if (!response.data.success) {
        alert(response.data.message || "Google login failed");
        return;
      }

      const { user, employee, hasOrganization } = response.data;
      const { email, role, name, id } = user;

      // Decode organizationId from Google JWT
      const decoded = jwtDecode(credential);
      const orgId = decoded.organizationId;

      // Store data
      localStorage.setItem("userEmail", email);
      localStorage.setItem("userRole", role);
      localStorage.setItem("userName", name);
      localStorage.setItem("userId", id);
      localStorage.setItem("organizationId", orgId);

      if (employee?.Employee_id) {
        localStorage.setItem("employeeId", employee.Employee_id);
      }

      localStorage.setItem(
        "userPicture",
        employee?.Profile_image || user.picture || ""
      );

      // Admin flow
      if (role.toLowerCase() === "admin") {
        if (!hasOrganization) {
          navigate("/welcome-screen");
          return;
        }
        navigate("/dashboard");
        return;
      }

      // Other roles
      switch (role.toLowerCase()) {
        case "line-manager":
          navigate("/linemanager-dashboard");
          break;
        case "staff":
        default:
          navigate("/staff-dashboard");
          break;
      }
    } catch (error) {
      console.error("Google login error:", error);
      alert("An error occurred during Google login");
    }
  };

  const handleGoogleLoginError = () => {
    alert("Google Login Failed");
  };

  // ===========================
  // UI
  // ===========================
  return (
    <div className="signup-container">
      {/* Left Side */}
      <div className="left-side">
        <div className="quote-container">
          <div className="quote-circle">
            <img src={QuoteImg} alt="Quote Icon" className="quote-icon" />
          </div>
          <blockquote className="quote">
            Streamline performance evaluation with Perfomix
          </blockquote>
        </div>
        <img src={SignupImg} alt="Illustration" className="illustration" />
      </div>

      {/* Right Side */}
      <div className="right-side">
        <div className="card">
          <img src={logo} alt="Perfomix Logo" className="form-logo" />

          <h2 className="title">Login</h2>
          <p className="subtitle">Enter your details to Login</p>

          {/* Email */}
          <div className="input-container">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              placeholder="Enter your email"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Password */}
          <div className="input-container">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              placeholder="Enter your password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div
            className="forgot-password"
            onClick={() => navigate("/forgot-password")}
          >
            <span>Forgot Password?</span>
          </div>

          <button className="sign-up-btn" onClick={handleLogin}>
            Login
          </button>

          <div className="login-container">
            <p className="login-text">Don't have an account?</p>
            <a href="signup" className="login-link">
              Signup
            </a>
          </div>

          <div className="google-login-wrapper">
            <GoogleLogin
              onSuccess={handleGoogleLoginSuccess}
              onError={handleGoogleLoginError}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
