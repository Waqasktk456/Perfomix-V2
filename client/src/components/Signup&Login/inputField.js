import React, { useState } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import './InputField.css';

const InputField = ({ label, type, placeholder, name }) => {
  const [inputType, setInputType] = useState(type);

  const toggleVisibility = () => {
    setInputType(inputType === 'password' ? 'text' : 'password');
  };

  return (
    <div className="input-field">
      <label htmlFor={name}>{label}</label>
      <div className="input-container">
        <input
          type={inputType}
          id={name}
          name={name}
          placeholder={placeholder}
          required
        />
        {type === 'password' && (
          <button type="button" className="toggle-eye-btn" onClick={toggleVisibility}>
            {inputType === 'password' ? <FaEyeSlash /> : <FaEye />}
          </button>
        )}
      </div>
    </div>
  );
};

export default InputField;
