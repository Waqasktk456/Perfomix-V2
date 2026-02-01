import React, { useEffect } from "react";
import "./Logout.css";

const LogoutScreen = ({ isOpen, onClose, onConfirm }) => {
  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Ensure modal doesn't render when isOpen is false
  if (!isOpen) return null;

  return (
    <div className="logout-overlay" onClick={onClose}>
      <div className="logout-content" onClick={(e) => e.stopPropagation()}>
        <button className="logout-close-btn" onClick={onClose}>×</button>
        <h2>Are you sure you want to log out?</h2>
        <p>You will need to sign in again to access your account.</p>
        <div className="logout-actions">
          <button className="logout-cancel-btn" onClick={onClose}>Cancel</button>
          <button className="logout-confirm-btn" onClick={onConfirm}>Logout</button>
        </div>
      </div>
    </div>
  );
};

export default LogoutScreen;
