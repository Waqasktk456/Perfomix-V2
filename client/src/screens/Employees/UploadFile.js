import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./UploadFile.css";
import { Erroricon, UploadIconCsvIcon } from "../../assets";
import '../../styles/typography.css';

const UploadFile = () => {
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];

    if (selectedFile) {
      const fileExtension = selectedFile.name.split(".").pop().toLowerCase();
      if (fileExtension === "csv") {
        setFile(selectedFile);
        setError("");
      } else {
        setFile(null);
        setError("Invalid file. Please upload a valid CSV file.");
      }
    }
  };

  return (
    <div className="upload-wrapper">
      <div className="upload-container">
        <h2 className="upload-title">Add Your Employee Data Here</h2>

        <label htmlFor="file-upload" className="dashed-box">
          {!file ? (
            <div className="upload-box">
              <p>Click to Upload</p>
              <img src={UploadIconCsvIcon} alt="Upload Icon" className="upload-icon" />
            </div>
          ) : (
            <div className="uploaded-file-inside-box">
              <span>{file.name}</span>
              <span className="remove-file" onClick={() => setFile(null)}>✖</span>
            </div>
          )}
          <input id="file-upload" type="file" onChange={handleFileChange} hidden />
        </label>

        {!file && (
          <p className="supported-format">Supported Format: CSV</p>
        )}

        {error && (
          <div className="error-message">
            <img src={Erroricon} alt="Error Icon" className="error-icon" />
            {error}
            <span className="close-error" onClick={() => setError("")}>✖</span>
          </div>
        )}
      </div>

      {file && (
        <div className="button-container">
          <button
            className="view-details-button"
            onClick={() => navigate("/employee-view-details")}
          >
            <span className="view-details-text">View Details</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default UploadFile;
