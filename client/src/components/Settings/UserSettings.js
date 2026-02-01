import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './UserSettings.css';
// import profilePic from '../../assets/images/profile.png';

const UserSettings = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const userId = localStorage.getItem('userId');

  useEffect(() => {
    if (userId) {
      fetchUser();
    }
  }, [userId]);

  const fetchUser = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`http://localhost:5000/api/employees/${userId}`);
      setUser(res.data.data);
      setForm(res.data.data);
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    // Only send editable fields
    const editableFields = [
      'First_name',
      'Last_name',
      'Marital_status',
      'Date_of_birth',
      'Primary_contact_number',
      'Permanent_address',
      'Gender'
    ];
    // Format date
    let formattedDate = form.Date_of_birth;
    if (formattedDate && formattedDate.includes('/')) {
      // If user entered MM/DD/YYYY, convert to YYYY-MM-DD
      const [month, day, year] = formattedDate.split('/');
      formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    const payload = {};
    editableFields.forEach(field => {
      if (field === 'Date_of_birth') {
        payload[field] = formattedDate;
      } else {
        payload[field] = form[field];
      }
    });
    console.log('Updating profile with:', payload);
    try {
      await axios.put(`http://localhost:5000/api/employees/${userId}`, payload);
      setEditMode(false);
      fetchUser();
    } catch (err) {
      alert('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>User not found</div>;

  return (
    <div className="profile-page">
      <div className="buttons">
        {!editMode && (
          <button className="edit-btn" onClick={() => setEditMode(true)}>
            Edit Profile
          </button>
        )}
      </div>
      <div className="profile-container">
        <div className="profile-pic">
          <img
            src={
              user?.Profile_image?.startsWith('/uploads')
                ? `http://localhost:5000${user.Profile_image}`
                : user?.Profile_image || "profile-placeholder.jpg"
            }
            alt="Profile"
          />
        </div>
      </div>
      <div className="details">
        <div className="section">
          <h3>Personal Info</h3>
          <table className="table">
            <tbody>
              <tr>
                <td>Full Name</td>
                <td style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                  {editMode ? (
                    <>
                      <input name="First_name" value={form.First_name || ''} onChange={handleChange} placeholder="First Name" style={{ flex: 1 }} />
                      <input name="Last_name" value={form.Last_name || ''} onChange={handleChange} placeholder="Last Name" style={{ flex: 1 }} />
                    </>
                  ) : (
                    <span style={{ width: '100%', textAlign: 'center' }}>{`${user.First_name} ${user.Last_name}`}</span>
                  )}
                </td>
              </tr>
              <tr>
                <td>Email Address</td>
                <td style={{ textAlign: 'center' }}>
                  {editMode ? (
                    <input name="Email" value={form.Email || ''} readOnly disabled style={{ width: '100%', textAlign: 'center' }} />
                  ) : (
                    <span style={{ width: '100%', textAlign: 'center' }}>{user.Email}</span>
                  )}
                </td>
              </tr>
              <tr>
                <td>Marital Status</td>
                <td>
                  {editMode ? (
                    <input name="Marital_status" value={form.Marital_status || ''} onChange={handleChange} />
                  ) : (
                    user.Marital_status || 'N/A'
                  )}
                </td>
              </tr>
              <tr>
                <td>Date of Birth</td>
                <td>
                  {editMode ? (
                    <input name="Date_of_birth" type="date" value={form.Date_of_birth ? form.Date_of_birth.split('T')[0] : ''} onChange={handleChange} />
                  ) : (
                    user.Date_of_birth ? user.Date_of_birth.split('T')[0] : 'N/A'
                  )}
                </td>
              </tr>
              <tr>
                <td>Phone Number</td>
                <td>
                  {editMode ? (
                    <input name="Primary_contact_number" value={form.Primary_contact_number || ''} onChange={handleChange} />
                  ) : (
                    user.Primary_contact_number || 'N/A'
                  )}
                </td>
              </tr>
              <tr>
                <td>Permanent Address</td>
                <td>
                  {editMode ? (
                    <input name="Permanent_address" value={form.Permanent_address || ''} onChange={handleChange} />
                  ) : (
                    user.Permanent_address || 'N/A'
                  )}
                </td>
              </tr>
              <tr>
                <td>Gender</td>
                <td>
                  {editMode ? (
                    <select name="Gender" value={form.Gender || ''} onChange={handleChange}>
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  ) : (
                    user.Gender || 'N/A'
                  )}
                </td>
              </tr>
              <tr>
                <td>Department</td>
                <td style={{ textAlign: 'center' }}>
                  {editMode ? (
                    <input name="Department_code" value={user.Department_name || user.Department_code || ''} readOnly disabled style={{ width: '100%', textAlign: 'center' }} />
                  ) : (
                    <span style={{ width: '100%', textAlign: 'center' }}>{user.Department_name || user.Department_code || ''}</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      {editMode && (
        <div className="button-group">
          <button className="btn cancel" onClick={() => setEditMode(false)} disabled={saving}>Cancel</button>
          <button className="btn update" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Update'}</button>
        </div>
      )}
    </div>
  );
};

export default UserSettings; 