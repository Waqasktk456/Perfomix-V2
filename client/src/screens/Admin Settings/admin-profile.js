import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./admin-profile.css";

const AdminProfile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState({});
  const [loading, setLoading] = useState(true);

  const userId = localStorage.getItem('userId');

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    fetch(`http://localhost:5000/api/users/${userId}`)
      .then(res => res.json())
      .then(data => {
        setUser(data.data || {});
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [userId]);

  if (loading) return <div>Loading...</div>;

  // Split name into first and last name if possible
  const [firstName, ...lastNameArr] = (user.name || '').split(' ');
  const lastName = lastNameArr.join(' ');

  return (
    <div className="profile-page">
      {/* Buttons aligned to top-left */}
      <div className="buttons">
        <button className="edit-btn" onClick={() => navigate("/admin-edit-profile")}>Edit Profile</button>
        <button className="change-btn-p" onClick={() => navigate("/change-password")}>Change Password</button>
      </div>

      {/* Profile Section - Centered */}
      <div className="profile-container">
        <div className="profile-pic">
          <img src={user.picture || "profile-placeholder.jpg"} alt="Profile" />
        </div>
      </div>

      {/* Profile Details */}
      <div className="details">
        <div className="section">
          <h3>Personal Details</h3>
          <table className="table">
            <tbody>
              <tr>
                <td>First name</td>
                <td>{firstName || ''}</td>
              </tr>
              <tr>
                <td>Last name</td>
                <td>{lastName || ''}</td>
              </tr>
              <tr>
                <td>Email</td>
                <td>{user.email || ''}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="section">
          <h3>Address</h3>
          <table className="table">
            <tbody>
              <tr>
                <td>Permanent Address</td>
                <td></td>
              </tr>
              <tr>
                <td>Current City</td>
                <td></td>
              </tr>
              <tr>
                <td>District</td>
                <td></td>
              </tr>
              <tr>
                <td>Province</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminProfile;
