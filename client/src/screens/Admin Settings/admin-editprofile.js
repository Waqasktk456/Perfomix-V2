import React, { useState } from "react";
import "./admin-editprofile.css";
// import Profilepic from '../../assets/images/profile2.png'

const AdminEditProfile = () => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showChangeModal, setShowChangeModal] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleChangeClick = () => {
    setShowChangeModal(true);
  };

  const confirmDelete = () => {
    console.log("Profile picture deleted");
    setShowDeleteModal(false);
  };

  return (
    <div className="edit-profile">
      <nav className="breadcrumb">
        <span>Profile &gt;</span> <span className="active">Edit Profile</span>
      </nav>

      {/* Profile Picture Section */}
      <div className="profile-header">
        <img
          src={
            user.Profile_image?.startsWith('/uploads')
              ? `http://localhost:5000${user.Profile_image}`
              : user.Profile_image || "profile-placeholder.jpg"
          }
          alt="Profile"
          className="profile-pic"
        />
        <div className="profile-actions">
          <button className="btn change-pic" onClick={handleChangeClick}>Change Picture</button>
          <button className="btn delete-pic" onClick={handleDeleteClick}>Delete Picture</button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="close-btn" onClick={() => setShowDeleteModal(false)}>×</button>
            <h2>Are you sure you want to delete the picture?</h2>
            <p>This action will remove the profile picture permanently.</p>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowDeleteModal(false)}>Cancel</button>
              <button className="delete-btn" onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Change Picture Modal */}
      {showChangeModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="close-btn" onClick={() => setShowChangeModal(false)}>×</button>
            <h2 style={{ textAlign: "center" }}>Choose an image to upload</h2>
            <div className="file-upload">
              <input type="file" accept="image/png, image/gif, image/jpeg" id="fileInput" />
              <label htmlFor="fileInput" className="file-label">

              </label>
              <p style={{ textAlign: "center" }}>jpg, gif, or png. Max size 1 MB.</p>
            </div>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowChangeModal(false)}>Cancel</button>
              <button className="update-btn">Update</button>
            </div>
          </div>
        </div>
      )}

      {/* First Section: Personal Details */}
      <div className="form-section">
        <div className="row">
          <div className="input-group">
            <label className="input-label">Email Address</label>
            <input type="text" className="input-field" placeholder="Enter your email" />
          </div>
          <div className="input-group">
            <label className="input-label">Designation</label>
            <input type="text" className="input-field" placeholder="Enter your designation" />
          </div>
        </div>

        <div className="row">
          <div className="input-group">
            <label className="input-label">Date of Birth</label>
            <input type="text" className="input-field" placeholder="Enter birth date" />
          </div>
          <div className="input-group">
            <label className="input-label">Department</label>
            <select className="input-field">
              <option>Select an Option</option>
            </select>
          </div>
        </div>

        <div className="row">
          <div className="input-group">
            <label className="input-label">Role</label>
            <select className="input-field">
              <option>Select an Option</option>
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">Gender</label>
            <select className="input-field">
              <option>Select an Option</option>
            </select>
          </div>
        </div>
      </div>

      {/* Address Section */}
      <h3 className="section-title">Address</h3>

      <div className="form-section">
        <div className="row">
          <div className="input-group">
            <label className="input-label">Permanent Address</label>
            <input type="text" className="input-field" placeholder="Enter address" />
          </div>
          <div className="input-group">
            <label className="input-label">Current City</label>
            <input type="text" className="input-field" placeholder="Enter city" />
          </div>
        </div>

        <div className="row">
          <div className="input-group">
            <label className="input-label">District</label>
            <input type="text" className="input-field" placeholder="Enter district" />
          </div>
          <div className="input-group">
            <label className="input-label">Province</label>
            <input type="text" className="input-field" placeholder="Enter province" />
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="button-group">
        <button className="btn cancel">Cancel</button>
        <button className="btn update">Update</button>

      </div>
    </div>
  );
};

export default AdminEditProfile;
