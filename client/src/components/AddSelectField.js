import React from "react";
import "./AddSelectField.css";

const AddSelectField = ({ label, options = [], value, onChange, error }) => {
  return (
    <div className="input-group">
      <label className="input-label">{label}</label>
      <select
        className="input-field"
        value={value}
        onChange={onChange}
      >
        <option value="">Select {label}</option>
        {options.map((option, index) => (
          <option key={index} value={option}>
            {option}
          </option>
        ))}
      </select>
      {error && <div className="input-error">{error}</div>}
    </div>
  );
};

export default AddSelectField;