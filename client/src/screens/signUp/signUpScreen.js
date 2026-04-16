import React, { useState } from "react";
import axios from "axios";
import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import "./SignupScreen.css";
import SignupImg from '../../assets/images/SignupImg.png';
import QuoteImg from '../../assets/images/quotesIcon.png'; 
import logo from '../../assets/images/logo.png';
import Googleicon from '../../assets/images/googleIcon.png'
import '../../styles/typography.css';

const SignupScreen = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ firstName: "", email: "", password: "" });
  const [showGoogleLogin, setShowGoogleLogin] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.id]: e.target.value });

  const handleSignup = async () => {
    try {
      const res = await axios.post("http://localhost:5000/api/auth/signup", {
        firstName: form.firstName,
        email: form.email,
        password: form.password,
      });
      if (res.data.success) {
        alert("Signup successful!");
        navigate("/login");
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Signup failed");
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const res = await axios.post("http://localhost:5000/api/auth/google", {
        token: credentialResponse.credential
      });
      const data = res.data;
      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('userRole', data.user?.role || 'admin');
        localStorage.setItem('userName', data.user?.name || '');
        localStorage.setItem('userEmail', data.user?.email || '');
        if (data.user?.picture) localStorage.setItem('userPicture', data.user.picture);
        navigate(data.hasOrganization ? '/dashboard' : '/add-organization');
      }
    } catch (err) {
      console.error('Google signup error:', err);
      alert(err.response?.data?.message || 'Google signup failed');
    }
  };

  return (
    <div className="signup-container">
      {/* Left Side */}
      <div className="left-side">
        <div className="quote-container">
          <div className="quote-circle">
            <img src={QuoteImg} alt="Quote Icon" className="quote-icon" />
          </div>
          <blockquote className="quote">Streamline performance evaluation with Perfomix</blockquote>
        </div>
        <img src={SignupImg} alt="Illustration" className="illustration" />
      </div>
      
      {/* Right Side */}
      <div className="right-side">

        {/* Sign Up Container */}
        <div className="card">
          <img src={logo} alt="Perfomix Logo" className="form-logo" />

          <h2 className="title">Sign Up</h2>
          <p className="subtitle">Enter your details to create an account</p>

          {/* Input Fields */}
          <div className="input-container">
            <label htmlFor="firstName">First Name</label>
            <input 
              type="text" 
              id="firstName" 
              placeholder="Enter your first name" 
              className="input-field" 
              value={form.firstName}
              onChange={handleChange}
            />
          </div>

          <div className="input-container">
            <label htmlFor="email">Email</label>
            <input 
              type="email" 
              id="email" 
              placeholder="Enter your email" 
              className="input-field" 
              value={form.email}
              onChange={handleChange}
            />
          </div>

          <div className="input-container">
            <label htmlFor="password">Password</label>
            <input 
              type="password" 
              id="password" 
              placeholder="Enter your password" 
              className="input-field"
              value={form.password}
              onChange={handleChange}
            />
          </div>

          <button className="sign-up-btn" onClick={handleSignup}>
            Sign Up
          </button>

          <div className="login-container">
            <p className="login-text">Already have an account?</p>
            <a href="login" className="login-link">Login</a>
          </div>

          <div className="google-btn-container">
            {showGoogleLogin ? (
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => alert('Google sign-in failed. Please try again.')}
                useOneTap={false}
              />
            ) : (
              <button className="google-btn" onClick={() => setShowGoogleLogin(true)}>
                <img src={Googleicon} alt="Google" className="google-icon" /> 
                Sign Up with Google
              </button>
            )}
          </div>

        </div>
      </div>

    </div>
  );
};

export default SignupScreen;
