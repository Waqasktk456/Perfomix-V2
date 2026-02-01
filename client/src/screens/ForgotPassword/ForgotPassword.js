import React from "react";
// import "./Forgotpassword.css";
import ForgotPasswordImg from '../../assets/images/forgot-password.png';
import QuoteImg from '../../assets/images/quotesIcon.png'; 
import logo from '../../assets/images/logo.png';

const ForgotPassword = () => {
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
        <img src={ForgotPasswordImg} alt="Illustration" className="illustration" />
      </div>
      
      {/* Right Side */}
      <div className="right-side">
        {/* Logo */}
     
        
        {/* Sign Up Container */}
        <div className="card">
           <img src={logo} alt="Perfomix Logo" className="form-logo" />
          <h2 className="title">Forgot Password</h2>
          <p className="subtitle">Please enter your email and we’ll send you a link to reset your password.</p>

          {/* Input Fields with Labels */}
         

          <div className="input-container">
            <label htmlFor="email">Email</label>
            <input type="email" id="email" placeholder="Enter your email" className="input-field" />
          </div>

         
          
          

          <button className="sign-up-btn">Send Link via Email</button>
          
       

        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
