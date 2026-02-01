import React, { useState, useEffect } from "react";
import "./ProfileSetup.css";

const ProfileSetup = () => {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : {};
  });

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
  }, []);

  const handleUploadClick = () => {
    setShowUploadModal(true);
  };

  const handleCancelUpload = () => {
    setShowUploadModal(false);
  };

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleUpload = () => {
    if (selectedFile) {
      console.log("Uploading:", selectedFile.name);
      setShowUploadModal(false);

      // Show success notification only on upload
      setShowSuccessNotification(true);

      // Auto-hide after 3 seconds
      setTimeout(() => {
        setShowSuccessNotification(false);
      }, 3000);
    } else {
      alert("Please select a file to upload.");
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    console.log("Profile picture deleted");
    setShowDeleteModal(false);
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
  };

  return (
    <div className="container">
      {/* Success Notification (Shows only on Upload) */}
      {showSuccessNotification && (
        <div className="success-notification">
          ✅ <strong>Success</strong> - Your profile picture has been updated successfully!
        </div>
      )}

      <h1>
        <span role="img" aria-label="wave">��</span> Well Come M'r Ali
      </h1>
      <p>Finish setting up your Profile</p>

      {/* Profile Picture Section */}
      <div className="profile-info">
        <img src={user.Profile_image || "profile-placeholder.jpg"} alt="Profile" />
        <div>
          <button className="change-picture" onClick={handleUploadClick}>
            Change Picture
          </button>
          <button className="delete-picture" onClick={handleDeleteClick}>
            Delete Picture
          </button>
        </div>
      </div>

      {/* Form Fields */}
      <div className="form-row">
        <div className="form-group">
          <label>Email Address</label>
          <input type="email" value="saishaqandeel@gmail.com" readOnly />
        </div>
        <div className="form-group">
          <label>Department</label>
          <input type="text" placeholder="Enter your department" />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Designation</label>
          <input type="text" placeholder="Enter your designation" />
        </div>
        <div className="form-group">
          <label>Role</label>
          <select className="dropdown">
            <option>Select an Option</option>
          </select>
        </div>
      </div>

      <div className="dob-group">
        <label>Date of Birth</label>
        <input type="date" />
      </div>

      <h2>Address Information</h2>

      <div className="form-row">
        <div className="form-group">
          <label>Permanent Address</label>
          <input type="text" placeholder="Enter your address" />
        </div>
        <div className="form-group">
          <label>City</label>
          <input type="text" placeholder="Enter your city" />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>District</label>
          <input type="text" placeholder="Enter your district" />
        </div>
        <div className="form-group">
          <label>Province</label>
          <input type="text" placeholder="Enter your province" />
        </div>
      </div>

      <div className="button-group">
        <button className="skip-button">Skip</button>
        <button className="save-button">Save</button>
      </div>

      {/* Image Upload Modal */}
      {showUploadModal && (
        <div className="modal-overlay">
          <div className="modal">
            <span className="close-icon" onClick={handleCancelUpload}>&times;</span>
            <h3>Choose an image to upload</h3>
            <input type="file" accept="image/png, image/jpeg, image/gif" onChange={handleFileChange} />
            <p>jpg, gif, or png. Max size 1 MB.</p>
            <div className="modal-buttons">
              <button className="cancel-button" onClick={handleCancelUpload}>Cancel</button>
              <button className="upload-button" onClick={handleUpload}>Upload</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal with Close Icon */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal">
            <span className="close-icon" onClick={handleCancelDelete}>&times;</span>
            <h3>Are you sure you want to delete your profile picture?</h3>
            <div className="modal-buttons">
              <button className="cancel-button" onClick={handleCancelDelete}>Cancel</button>
              <button className="delete-button" onClick={handleConfirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileSetup;
