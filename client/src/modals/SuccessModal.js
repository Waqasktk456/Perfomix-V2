import React from "react";

const modalOverlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000
};

const modalStyle = {
  background: "#fff",
  borderRadius: 8,
  padding: "32px 32px 24px 32px",
  minWidth: 500,   // Increase this value for a wider modal
  maxWidth: 600,   // Increase this value for a wider modal
  boxShadow: "0 2px 16px rgba(0,0,0,0.15)",
  textAlign: "center",
  position: "relative"
};

const closeBtnStyle = {
  position: "absolute",
  top: 2,
  right: 5,
  background: "none",
  border: "none",
  fontSize: 22,
  cursor: "pointer"
};

const checkIconStyle = {
  width: 60,
  height: 60,
  margin: "0 auto 16px auto",
  display: "block"
};

const titleStyle = {
  color: "#1D9C53",
  fontWeight: 600,
  fontSize: 22,
  margin: "0 0 8px 0"
};

const descStyle = {
  color: "#7d7d7d",
  fontSize: 16,
  margin: 0,
  width: "100%"
};

const SuccessModal = ({ open, onClose, title = "Congratulations!", description = "Your action was successful." }) => {
  if (!open) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div style={modalOverlayStyle} onClick={handleOverlayClick}>
      <div style={modalStyle}>
        <button style={closeBtnStyle} onClick={onClose} aria-label="Close">×</button>
        <svg style={checkIconStyle} viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="32" fill="#22a06b"/>
          <path d="M20 33.5L28.5 42L44 26.5" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <div style={titleStyle}>{title}</div>
        <div style={descStyle}>{description}</div>
      </div>
    </div>
  );
};

export default SuccessModal; 