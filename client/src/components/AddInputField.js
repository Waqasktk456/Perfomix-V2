import React from "react";
import "./AddInputField.css";
import '../styles/typography.css'

const AddInputField = ({ label, type = "text", placeholder, value, onChange, error }) => {
  return (
    <div className="input-group">
      <label className="input-label">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        className="input-field"
        value={value}
        onChange={onChange}
      />
      {error && <div className="input-error">{error}</div>}
    </div>
  );
};

export default AddInputField;
